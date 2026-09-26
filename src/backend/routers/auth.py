"""
Authentication endpoints for the High School Management System API
"""

import hashlib
import secrets
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..database import sessions_collection, teachers_collection, verify_password

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)
bearer_scheme = HTTPBearer(auto_error=False)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_teacher(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """Require an unexpired server-issued bearer token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    session = sessions_collection.find_one({
        "token_hash": _token_hash(credentials.credentials),
        "expires_at": {"$gt": time.time()}
    })
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")

    teacher = teachers_collection.find_one({"_id": session["username"]})
    if not teacher:
        raise HTTPException(status_code=401, detail="Authentication required")

    return teacher


@router.post("/login")
def login(username: str, password: str) -> Dict[str, Any]:
    """Login a teacher account"""
    # Find the teacher in the database
    teacher = teachers_collection.find_one({"_id": username})

    # Verify password using Argon2 verifier from database.py
    if not teacher or not verify_password(teacher.get("password", ""), password):
        raise HTTPException(
            status_code=401, detail="Invalid username or password")

    access_token = secrets.token_urlsafe(32)
    sessions_collection.insert_one({
        "token_hash": _token_hash(access_token),
        "username": teacher["username"],
        "expires_at": time.time() + 60 * 60 * 12
    })

    # Return teacher information (excluding password)
    return {
        "username": teacher["username"],
        "display_name": teacher["display_name"],
        "role": teacher["role"],
        "access_token": access_token
    }


@router.get("/check-session")
def check_session(teacher: Dict[str, Any] = Depends(get_current_teacher)) -> Dict[str, Any]:
    """Return the signed-in teacher associated with the bearer token."""
    return {
        "username": teacher["username"],
        "display_name": teacher["display_name"],
        "role": teacher["role"]
    }


@router.post("/logout")
def logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    teacher: Dict[str, Any] = Depends(get_current_teacher)
) -> Dict[str, str]:
    """Revoke the current bearer token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    sessions_collection.delete_one({
        "token_hash": _token_hash(credentials.credentials),
        "username": teacher["username"]
    })
    return {"message": "Logged out"}
