import logging
from fastapi import APIRouter
from pydantic import BaseModel
from instagram_client import ig_manager

logger = logging.getLogger("instagram_bot")
router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class ChallengeCodeRequest(BaseModel):
    code: str


@router.post("/login")
def login(req: LoginRequest):
    logger.info(f"[AUTH] Login endpoint called for '{req.username}'")
    result = ig_manager.login(req.username, req.password)
    logger.info(f"[AUTH] Login result: success={result.get('success')}, challenge={result.get('challenge', False)}")
    return result


@router.post("/challenge")
def submit_challenge(req: ChallengeCodeRequest):
    logger.info(f"[AUTH] Challenge code submission: {req.code[:2]}****")
    return ig_manager.submit_challenge_code(req.code)


@router.post("/logout")
def logout():
    logger.info("[AUTH] Logout endpoint called")
    ig_manager.logout()
    return {"success": True, "message": "Déconnecté avec succès"}


@router.get("/status")
def auth_status():
    return ig_manager.get_auth_status()
