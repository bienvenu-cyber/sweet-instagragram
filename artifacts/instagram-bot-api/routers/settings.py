from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, BotSettingsModel

router = APIRouter()


class BotSettings(BaseModel):
    dm_daily_limit: int = 50
    dm_delay_min: int = 30
    dm_delay_max: int = 120
    comment_daily_limit: int = 30
    comment_delay_min: int = 20
    comment_delay_max: int = 90
    post_daily_limit: int = 3
    auto_dm_enabled: bool = False
    auto_comment_enabled: bool = False


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(BotSettingsModel).filter(BotSettingsModel.id == 1).first()
    if not settings:
        settings = BotSettingsModel(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return {
        "dm_daily_limit": settings.dm_daily_limit,
        "dm_delay_min": settings.dm_delay_min,
        "dm_delay_max": settings.dm_delay_max,
        "comment_daily_limit": settings.comment_daily_limit,
        "comment_delay_min": settings.comment_delay_min,
        "comment_delay_max": settings.comment_delay_max,
        "post_daily_limit": settings.post_daily_limit,
        "auto_dm_enabled": settings.auto_dm_enabled,
        "auto_comment_enabled": settings.auto_comment_enabled,
    }


@router.put("")
def update_settings(body: BotSettings, db: Session = Depends(get_db)):
    settings = db.query(BotSettingsModel).filter(BotSettingsModel.id == 1).first()
    if not settings:
        settings = BotSettingsModel(id=1)
        db.add(settings)

    settings.dm_daily_limit = body.dm_daily_limit
    settings.dm_delay_min = body.dm_delay_min
    settings.dm_delay_max = body.dm_delay_max
    settings.comment_daily_limit = body.comment_daily_limit
    settings.comment_delay_min = body.comment_delay_min
    settings.comment_delay_max = body.comment_delay_max
    settings.post_daily_limit = body.post_daily_limit
    settings.auto_dm_enabled = body.auto_dm_enabled
    settings.auto_comment_enabled = body.auto_comment_enabled

    db.commit()
    db.refresh(settings)
    return {
        "dm_daily_limit": settings.dm_daily_limit,
        "dm_delay_min": settings.dm_delay_min,
        "dm_delay_max": settings.dm_delay_max,
        "comment_daily_limit": settings.comment_daily_limit,
        "comment_delay_min": settings.comment_delay_min,
        "comment_delay_max": settings.comment_delay_max,
        "post_daily_limit": settings.post_daily_limit,
        "auto_dm_enabled": settings.auto_dm_enabled,
        "auto_comment_enabled": settings.auto_comment_enabled,
    }
