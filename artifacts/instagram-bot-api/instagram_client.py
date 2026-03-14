import os
import json
import time
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
    ReloginAttemptExceeded,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("instagram_bot")

SESSION_FILE = Path("/tmp/instagram_session.json")


class InstagramClientManager:
    def __init__(self):
        self._client: Optional[Client] = None
        self._username: Optional[str] = None
        self._password: Optional[str] = None
        self._logged_in: bool = False
        self._pending_challenge: bool = False

    def _create_client(self) -> Client:
        cl = Client()
        cl.delay_range = [1, 3]
        return cl

    def _load_session(self, cl: Client, username: str) -> bool:
        if not SESSION_FILE.exists():
            return False
        try:
            with open(SESSION_FILE, "r") as f:
                session_data = json.load(f)
            stored_user = session_data.get("username", "").lower()
            if stored_user == username.lower():
                logger.info(f"[SESSION] Found saved session for {username}, restoring...")
                cl.set_settings(session_data.get("settings", {}))
                cl.login(username, "")
                logger.info(f"[SESSION] Session restored successfully for {username}")
                return True
            else:
                logger.info(f"[SESSION] Saved session is for '{stored_user}', not '{username}', skipping")
        except Exception as e:
            logger.warning(f"[SESSION] Failed to load session: {e}, will do fresh login")
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
            logger.info(f"[SESSION] Session saved for {username} -> {SESSION_FILE}")
        except Exception as e:
            logger.error(f"[SESSION] Failed to save session: {e}")

    def login(self, username: str, password: str) -> dict:
        username = username.strip().lstrip("@").lower()
        logger.info(f"[LOGIN] Login request for '{username}'")

        self._pending_challenge = False
        cl = self._create_client()

        if self._load_session(cl, username):
            try:
                cl.get_timeline_feed()
                self._client = cl
                self._username = username
                self._password = password
                self._logged_in = True
                logger.info(f"[LOGIN] Session still valid for {username}")
                return {"success": True, "message": "Session reprise avec succès", "username": username, "requires_2fa": False}
            except (LoginRequired, Exception) as e:
                logger.warning(f"[LOGIN] Saved session expired: {e}, doing fresh login")
                SESSION_FILE.unlink(missing_ok=True)
                cl = self._create_client()

        logger.info(f"[LOGIN] Attempting fresh login for username='{username}'")
        try:
            cl.login(username, password)
            self._save_session(cl, username)
            self._client = cl
            self._username = username
            self._password = password
            self._logged_in = True
            self._pending_challenge = False
            logger.info(f"[LOGIN] SUCCESS for {username}")
            return {"success": True, "message": "Connecté avec succès", "username": username, "requires_2fa": False}

        except TwoFactorRequired:
            logger.warning(f"[LOGIN] 2FA required for {username}")
            return {"success": False, "message": "2FA activé — désactive-le temporairement ou utilise un mot de passe d'application.", "username": username, "requires_2fa": True}

        except BadPassword:
            logger.warning(f"[LOGIN] Bad password for {username}")
            return {"success": False, "message": "Mot de passe incorrect.", "username": username, "requires_2fa": False}

        except ChallengeRequired as e:
            logger.warning(f"[LOGIN] Challenge required for {username}: {e}")
            self._client = cl
            self._username = username
            self._password = password
            self._pending_challenge = True

            try:
                challenge_url = cl.last_json.get("challenge", {}).get("url", "") if hasattr(cl, "last_json") and cl.last_json else ""
                logger.info(f"[CHALLENGE] URL: {challenge_url}")
                cl.challenge_resolve(cl.last_json)
                logger.info(f"[CHALLENGE] Challenge resolve called — code should be sent to phone/email")
                return {
                    "success": False,
                    "message": "Instagram a envoyé un code de vérification sur ton téléphone/email. Entre le code ci-dessous pour continuer.",
                    "username": username,
                    "requires_2fa": False,
                    "challenge": True,
                    "challenge_type": "code",
                }
            except Exception as ce:
                logger.warning(f"[CHALLENGE] Auto-resolve failed: {ce}")
                return {
                    "success": False,
                    "message": "Instagram demande une vérification. Ouvre l'app Instagram → approuve la notification de sécurité → puis réessaie la connexion.",
                    "username": username,
                    "requires_2fa": False,
                    "challenge": True,
                    "challenge_type": "approve",
                }

        except ReloginAttemptExceeded:
            logger.error(f"[LOGIN] ReloginAttemptExceeded for {username}")
            return {"success": False, "message": "Trop de tentatives de connexion. Attends quelques minutes avant de réessayer.", "username": username, "requires_2fa": False}

        except Exception as e:
            err_str = str(e)
            logger.error(f"[LOGIN] Error for '{username}': {type(e).__name__}: {err_str}")
            if "can't find an account" in err_str.lower():
                return {
                    "success": False,
                    "message": f"Compte '{username}' introuvable. Vérifie le nom d'utilisateur Instagram exact (sans @, sans email).",
                    "username": username,
                    "requires_2fa": False,
                }
            return {"success": False, "message": err_str, "username": username, "requires_2fa": False}

    def submit_challenge_code(self, code: str) -> dict:
        if not self._pending_challenge or not self._client:
            return {"success": False, "message": "Aucun challenge en attente. Relance la connexion."}
        logger.info(f"[CHALLENGE] Submitting code for {self._username}")
        try:
            self._client.challenge_resolve(self._client.last_json, code)
            self._save_session(self._client, self._username)
            self._logged_in = True
            self._pending_challenge = False
            logger.info(f"[CHALLENGE] Code accepted — logged in as {self._username}")
            return {"success": True, "message": "Code accepté — connecté avec succès.", "username": self._username}
        except Exception as e:
            logger.error(f"[CHALLENGE] Code rejected: {e}")
            return {"success": False, "message": f"Code invalide ou expiré: {e}"}

    def logout(self):
        logger.info(f"[LOGOUT] Logging out {self._username}")
        if self._client:
            try:
                self._client.logout()
            except Exception as e:
                logger.warning(f"[LOGOUT] Error during logout: {e}")
        SESSION_FILE.unlink(missing_ok=True)
        self._client = None
        self._username = None
        self._password = None
        self._logged_in = False
        self._pending_challenge = False
        logger.info("[LOGOUT] Done")

    def get_client(self) -> Optional[Client]:
        return self._client if self._logged_in else None

    def is_logged_in(self) -> bool:
        return self._logged_in and self._client is not None

    def get_username(self) -> Optional[str]:
        return self._username

    def get_auth_status(self) -> dict:
        if not self.is_logged_in():
            return {"logged_in": False, "pending_challenge": self._pending_challenge}
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
            logger.error(f"[STATUS] Error getting auth status: {e}")
            self._logged_in = False
            return {"logged_in": False}


ig_manager = InstagramClientManager()
