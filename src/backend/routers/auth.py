"""Authentication endpoints for the High School Management System API."""

from datetime import datetime, timedelta, timezone
import hashlib
import os
import secrets
from typing import Any, Dict
from urllib.parse import urlparse

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from ..database import sessions_collection, teachers_collection, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE_NAME = "access_token"
SESSION_DURATION = timedelta(hours=12)
SESSION_COOKIE_SECURE_OVERRIDE = os.getenv("SESSION_COOKIE_SECURE")
LOCAL_COOKIE_HOSTS = {"localhost", "127.0.0.1", "::1"}


class LoginCredentials(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _env_flag(value: str) -> bool:
    return value.lower() in {"1", "true", "yes", "on"}


def _should_use_secure_cookie(request: Request) -> bool:
    if SESSION_COOKIE_SECURE_OVERRIDE is not None:
        return _env_flag(SESSION_COOKIE_SECURE_OVERRIDE)

    return (request.url.hostname or "").lower() not in LOCAL_COOKIE_HOSTS


def _set_session_cookie(response: Response, token: str, request: Request) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=_should_use_secure_cookie(request),
        max_age=int(SESSION_DURATION.total_seconds()),
        path="/"
    )


def _clear_session_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=_should_use_secure_cookie(request),
        path="/"
    )


def _session_expiration(expires_at: Any) -> datetime | None:
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            return expires_at.replace(tzinfo=timezone.utc)
        return expires_at.astimezone(timezone.utc)

    if isinstance(expires_at, (int, float)):
        return datetime.fromtimestamp(expires_at, tz=timezone.utc)

    if isinstance(expires_at, str):
        try:
            return datetime.fromisoformat(
                expires_at.replace("Z", "+00:00")
            ).astimezone(timezone.utc)
        except ValueError:
            return None

    return None


def _session_is_active(session: Dict[str, Any]) -> bool:
    expires_at = _session_expiration(session.get("expires_at"))
    if expires_at is None:
        return False

    return expires_at > datetime.now(timezone.utc)


def require_trusted_origin(request: Request) -> None:
    """Reject cross-site state-changing requests for cookie-authenticated endpoints."""
    expected_origin = str(request.base_url).rstrip("/")
    source = request.headers.get("origin") or request.headers.get("referer")
    if not source:
        raise HTTPException(status_code=403, detail="Origin validation failed")

    parsed = urlparse(source)
    request_origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
    if request_origin != expected_origin:
        raise HTTPException(status_code=403, detail="Origin validation failed")


def get_current_teacher(request: Request) -> Dict[str, Any]:
    """Require an unexpired server-issued session cookie."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    session = sessions_collection.find_one({"token_hash": _token_hash(token)})
    if not session or not _session_is_active(session):
        if session:
            sessions_collection.delete_one({"_id": session["_id"]})
        raise HTTPException(status_code=401, detail="Authentication required")

    teacher = teachers_collection.find_one({"_id": session["username"]})
    if not teacher:
        raise HTTPException(status_code=401, detail="Authentication required")

    return teacher


@router.post("/login")
def login(
    request: Request,
    response: Response,
    credentials: LoginCredentials = Body(...)
) -> Dict[str, Any]:
    """Login a teacher account."""
    username = credentials.username
    password = credentials.password

    teacher = teachers_collection.find_one({"_id": username})

    if not teacher or not verify_password(teacher.get("password", ""), password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = secrets.token_urlsafe(32)
    sessions_collection.insert_one({
        "token_hash": _token_hash(access_token),
        "username": teacher["_id"],
        "expires_at": datetime.now(timezone.utc) + SESSION_DURATION
    })
    _set_session_cookie(response, access_token, request)

    return {
        "username": teacher.get("username", teacher["_id"]),
        "display_name": teacher["display_name"],
        "role": teacher["role"]
    }


@router.get("/check-session")
def check_session(teacher: Dict[str, Any] = Depends(get_current_teacher)) -> Dict[str, Any]:
    """Return the signed-in teacher associated with the session cookie."""
    return {
        "username": teacher.get("username", teacher["_id"]),
        "display_name": teacher["display_name"],
        "role": teacher["role"]
    }


@router.post("/logout")
def logout(request: Request, response: Response) -> Dict[str, str]:
    """Revoke the current session cookie."""
    require_trusted_origin(request)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        sessions_collection.delete_one({"token_hash": _token_hash(token)})

    _clear_session_cookie(response, request)
    return {"message": "Logged out"}
