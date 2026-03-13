import os
from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from typing import Any

import bcrypt
import jwt
from jwt.exceptions import PyJWTError
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from db.mongodb import get_users_collection


load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

JWT_SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY") or "change-me-in-production"
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
AUTH_MODE = os.getenv("QUERYBOARD_AUTH_MODE", "real").strip().lower()
MOCK_AUTH_ENABLED = AUTH_MODE == "mock"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)

MOCK_TOKEN_PREFIX = "qb_demo."
DEFAULT_MOCK_USER = {
    "_id": "hackathon-demo-user",
    "email": "demo@queryboard.app",
    "full_name": "Hackathon Demo",
    "auth_provider": "mock",
    "created_at": None,
    "updated_at": None,
}


def _base64url_encode(value: str) -> str:
    return urlsafe_b64encode(value.encode("utf-8")).decode("utf-8").rstrip("=")


def _base64url_decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return urlsafe_b64decode(f"{value}{padding}".encode("utf-8")).decode("utf-8")


def build_mock_user(
    email: str | None = None,
    full_name: str | None = None,
    auth_provider: str = "mock",
) -> dict[str, Any]:
    normalized_email = (email or DEFAULT_MOCK_USER["email"]).strip().lower()
    if not normalized_email:
        normalized_email = DEFAULT_MOCK_USER["email"]

    normalized_name = (full_name or "").strip()
    if not normalized_name:
        normalized_name = normalized_email.split("@")[0] if "@" in normalized_email else "Demo User"

    return {
        **DEFAULT_MOCK_USER,
        "email": normalized_email,
        "full_name": normalized_name,
        "auth_provider": auth_provider or "mock",
    }


def create_mock_access_token(
    email: str | None = None,
    full_name: str | None = None,
    auth_provider: str = "mock",
) -> str:
    user = build_mock_user(email=email, full_name=full_name, auth_provider=auth_provider)
    payload = {
        "sub": user["_id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "auth_provider": user["auth_provider"],
    }
    return f"{MOCK_TOKEN_PREFIX}{_base64url_encode(json.dumps(payload, separators=(',', ':')))}"


def decode_mock_access_token(token: str) -> dict[str, Any]:
    if not token:
        return build_mock_user()

    try:
        if not token.startswith(MOCK_TOKEN_PREFIX):
            return build_mock_user()

        encoded_payload = token[len(MOCK_TOKEN_PREFIX) :]
        payload = json.loads(_base64url_decode(encoded_payload))
        return build_mock_user(
            email=str(payload.get("email", "")),
            full_name=str(payload.get("full_name", "")),
            auth_provider=str(payload.get("auth_provider", "mock")),
        )
    except Exception:
        return build_mock_user()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    if not hashed_password or hashed_password == "google_oauth":
        return False
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    if MOCK_AUTH_ENABLED:
        email = str(extra_claims.get("email", "")) if extra_claims else None
        full_name = str(extra_claims.get("full_name", "")) if extra_claims else None
        auth_provider = str(extra_claims.get("auth_provider", "mock")) if extra_claims else "mock"
        return create_mock_access_token(email=email, full_name=full_name, auth_provider=auth_provider)

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc


async def get_current_user(request: Request, token: str | None = Depends(oauth2_scheme)) -> dict[str, Any]:
    resolved_token = token or request.cookies.get("qb_token")

    if not resolved_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    if MOCK_AUTH_ENABLED:
        return decode_mock_access_token(resolved_token)

    payload = decode_access_token(resolved_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing a subject.",
        )

    try:
        object_id = ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token contains an invalid user identifier.",
        ) from exc

    user = await get_users_collection().find_one({"_id": object_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
        )

    return user
