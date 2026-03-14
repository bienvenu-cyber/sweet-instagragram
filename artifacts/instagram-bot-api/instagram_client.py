import os
import json
import logging
from pathlib import Path
from typing import Optional
from instagrapi import Client
from instagrapi.exceptions import (
    LoginRequired,
    BadPassword,
    TwoFactorRequired,
    ChallengeRequired,
    UserNotFound,
    ClientError,
)

logger = logging.getLogger(__name__)

SESSION_FILE = Path("/tmp/instagram_session.json")


class InstagramClientManager:
    def __init__(self):
        self._client: Optional[Client] = None
        self._username: Optional[str] = None
        self._logged_in: bool = False

    def _create_client(self) -> Client:
        cl = Client()
        cl.delay_range = [1, 3]
        return cl

    def _load_session(self, cl: Client, username: str) -> bool:
        if SESSION_FILE.exists():
            try:
                with open(SESSION_FILE, "r") as f:
                    session_data = json.load(f)
                if session_data.get("username") == username:
                    cl.set_settings(session_data.get("settings", {}))
                    cl.login(username, "")
                    logger.info(f"Session loaded for {username}")
                    return True
            except Exception as e:
                logger.warning(f"Could not load session: {e}")
                SESSION_FILE.unlink(missing_ok=True)
        return False

    def _save_session(self, cl: Client, username: str):
        try:
            session_data = {
                "username": username,
                "settings": cl.get_settings()
            }
            with open(SESSION_FILE, "w") as f:
                json.dump(session_data, f)
            logger.info(f"Session saved for {username}")
        except Exception as e:
            logger.error(f"Could not save session: {e}")

    def login(self, username: str, password: str) -> dict:
        cl = self._create_client()

        if self._load_session(cl, username):
            try:
                cl.get_timeline_feed()
                self._client = cl
                self._username = username
                self._logged_in = True
                return {"success": True, "message": "Session resumed", "username": username, "requires_2fa": False}
            except LoginRequired:
                pass

        try:
            cl.login(username, password)
            self._save_session(cl, username)
            self._client = cl
            self._username = username
            self._logged_in = True
            return {"success": True, "message": "Logged in successfully", "username": username, "requires_2fa": False}
        except TwoFactorRequired:
            self._client = cl
            self._username = username
            return {"success": False, "message": "2FA required. Please disable 2FA or use an app password.", "username": username, "requires_2fa": True}
        except BadPassword:
            return {"success": False, "message": "Invalid password", "username": username, "requires_2fa": False}
        except ChallengeRequired:
            return {"success": False, "message": "Instagram requires additional verification (challenge). Try logging in from the Instagram app first.", "username": username, "requires_2fa": False}
        except Exception as e:
            logger.error(f"Login error: {e}")
            return {"success": False, "message": str(e), "username": username, "requires_2fa": False}

    def logout(self):
        if self._client:
            try:
                self._client.logout()
            except Exception:
                pass
        SESSION_FILE.unlink(missing_ok=True)
        self._client = None
        self._username = None
        self._logged_in = False

    def get_client(self) -> Optional[Client]:
        return self._client if self._logged_in else None

    def is_logged_in(self) -> bool:
        return self._logged_in and self._client is not None

    def get_username(self) -> Optional[str]:
        return self._username

    def get_auth_status(self) -> dict:
        if not self.is_logged_in():
            return {"logged_in": False}
        try:
            user = self._client.account_info()
            return {
                "logged_in": True,
                "username": user.username,
                "full_name": user.full_name,
                "profile_pic_url": str(user.profile_pic_url) if user.profile_pic_url else None,
                "followers": user.follower_count,
                "following": user.following_count,
            }
        except Exception as e:
            logger.error(f"Error getting auth status: {e}")
            return {"logged_in": False}


ig_manager = InstagramClientManager()
