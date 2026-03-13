import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from core.security import MOCK_AUTH_ENABLED, create_access_token, create_mock_access_token
from db.mongodb import get_users_collection


load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

router = APIRouter(tags=["google-auth"])


def _get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=500, detail=f"Missing required environment variable: {name}")
    return value


def _get_frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _build_redirect_uri() -> str:
    backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
    return f"{backend_url}/auth/google/callback"


@router.get("/auth/google")
async def google_login() -> RedirectResponse:
    if MOCK_AUTH_ENABLED:
        frontend_url = _get_frontend_url()
        token = create_mock_access_token(
            email="demo@queryboard.app",
            full_name="Hackathon Demo",
            auth_provider="google",
        )
        return RedirectResponse(url=f"{frontend_url}/auth/callback?token={token}")

    params = {
        "client_id": _get_required_env("GOOGLE_CLIENT_ID"),
        "redirect_uri": _build_redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
    }
    google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    return RedirectResponse(url=f"{google_auth_url}?{urlencode(params)}")


@router.get("/auth/google/callback")
async def google_callback(code: str | None = Query(default=None)) -> RedirectResponse:
    frontend_url = _get_frontend_url()

    if MOCK_AUTH_ENABLED:
        token = create_mock_access_token(
            email="demo@queryboard.app",
            full_name="Hackathon Demo",
            auth_provider="google",
        )
        return RedirectResponse(url=f"{frontend_url}/auth/callback?token={token}")

    if not code:
        raise HTTPException(status_code=400, detail="Missing Google OAuth authorization code.")

    redirect_uri = _build_redirect_uri()
    token_payload = {
        "code": code,
        "client_id": _get_required_env("GOOGLE_CLIENT_ID"),
        "client_secret": _get_required_env("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data=token_payload,
            headers={"Accept": "application/json"},
        )
        if token_response.status_code >= 400:
            raise HTTPException(status_code=400, detail="Google token exchange failed.")

        access_token = token_response.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Google OAuth did not return an access token.")

        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_response.status_code >= 400:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user profile.")

    profile = userinfo_response.json()
    email = str(profile.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google account did not provide an email address.")

    users = get_users_collection()
    now = datetime.now(timezone.utc)
    user = await users.find_one({"email": email})

    if not user:
        user_document = {
            "email": email,
            "full_name": profile.get("name") or email.split("@")[0],
            "password_hash": "google_oauth",
            "auth_provider": "google",
            "google_sub": profile.get("sub"),
            "avatar_url": profile.get("picture"),
            "created_at": now,
            "updated_at": now,
        }
        insert_result = await users.insert_one(user_document)
        user_id = str(insert_result.inserted_id)
    else:
        await users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "full_name": profile.get("name") or user.get("full_name", email.split("@")[0]),
                    "auth_provider": "google",
                    "google_sub": profile.get("sub"),
                    "avatar_url": profile.get("picture"),
                    "updated_at": now,
                }
            },
        )
        user_id = str(user["_id"])

    jwt_token = create_access_token(
        user_id,
        {
            "email": email,
            "full_name": profile.get("name") or email.split("@")[0],
            "auth_provider": "google",
        },
    )
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={jwt_token}")
