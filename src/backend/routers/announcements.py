"""Announcement display and management endpoints."""

from datetime import date
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..database import announcements_collection
from .auth import get_current_teacher

router = APIRouter(prefix="/announcements", tags=["announcements"])


class AnnouncementPayload(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    start_date: Optional[date] = None
    expiration_date: date


def _announcement_data(payload: AnnouncementPayload) -> Dict[str, Any]:
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    if payload.start_date and payload.start_date > payload.expiration_date:
        raise HTTPException(
            status_code=422,
            detail="Start date must be on or before the expiration date"
        )

    return {
        "message": message,
        "start_date": payload.start_date.isoformat() if payload.start_date else None,
        "expiration_date": payload.expiration_date.isoformat()
    }


def _serialize(announcement: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": announcement["_id"],
        "message": announcement["message"],
        "start_date": announcement.get("start_date"),
        "expiration_date": announcement["expiration_date"]
    }


def require_announcement_manager(
    teacher: Dict[str, Any] = Depends(get_current_teacher)
) -> Dict[str, Any]:
    if teacher.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to manage announcements"
        )
    return teacher


@router.get("", response_model=List[Dict[str, Any]])
def get_active_announcements() -> List[Dict[str, Any]]:
    """Return announcements that are currently within their display dates."""
    today = date.today().isoformat()
    query = {
        "expiration_date": {"$gte": today},
        "$or": [
            {"start_date": None},
            {"start_date": {"$lte": today}}
        ]
    }
    return [
        _serialize(announcement)
        for announcement in announcements_collection.find(query).sort("expiration_date", 1)
    ]


@router.get("/manage", response_model=List[Dict[str, Any]])
def get_all_announcements(
    _teacher: Dict[str, Any] = Depends(require_announcement_manager)
) -> List[Dict[str, Any]]:
    """Return all announcements for the signed-in manager."""
    return [
        _serialize(announcement)
        for announcement in announcements_collection.find().sort("expiration_date", 1)
    ]


@router.post("", status_code=201)
def create_announcement(
    payload: AnnouncementPayload,
    _teacher: Dict[str, Any] = Depends(require_announcement_manager)
) -> Dict[str, Any]:
    """Create an announcement."""
    announcement = {"_id": str(uuid4()), **_announcement_data(payload)}
    announcements_collection.insert_one(announcement)
    return _serialize(announcement)


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    payload: AnnouncementPayload,
    _teacher: Dict[str, Any] = Depends(require_announcement_manager)
) -> Dict[str, Any]:
    """Replace an announcement's message and display dates."""
    announcement = _announcement_data(payload)
    result = announcements_collection.update_one(
        {"_id": announcement_id},
        {"$set": announcement}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return _serialize({"_id": announcement_id, **announcement})


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    _teacher: Dict[str, Any] = Depends(require_announcement_manager)
) -> Dict[str, str]:
    """Delete an announcement."""
    result = announcements_collection.delete_one({"_id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}
