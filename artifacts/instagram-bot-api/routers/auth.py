from fastapi import APIRouter
from pydantic import BaseModel
from instagram_client import ig_manager

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(req: LoginRequest):
    return ig_manager.login(req.username, req.password)


@router.post("/logout")
def logout():
    ig_manager.logout()
    return {"success": True, "message": "Logged out successfully"}


@router.get("/status")
def auth_status():
    return ig_manager.get_auth_status()
