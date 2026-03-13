from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import create_access_token, get_current_user, hash_password, verify_password
from db.mongodb import get_users_collection
from models.auth import AuthResponse, LoginRequest, RegisterRequest, UpdateMeRequest, UserResponse


router = APIRouter(tags=["auth"])


def _serialize_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name", ""),
        auth_provider=user.get("auth_provider", "local"),
        created_at=user.get("created_at"),
        updated_at=user.get("updated_at"),
    )


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest) -> AuthResponse:
    users = get_users_collection()
    existing_user = await users.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    now = datetime.now(timezone.utc)
    user_document = {
        "email": payload.email,
        "full_name": payload.full_name,
        "password_hash": hash_password(payload.password),
        "auth_provider": "local",
        "created_at": now,
        "updated_at": now,
    }
    insert_result = await users.insert_one(user_document)
    user_document["_id"] = insert_result.inserted_id
    token = create_access_token(str(insert_result.inserted_id), {"email": payload.email})

    return AuthResponse(access_token=token, user=_serialize_user(user_document))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    users = get_users_collection()
    user = await users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(str(user["_id"]), {"email": user["email"]})
    return AuthResponse(access_token=token, user=_serialize_user(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    return _serialize_user(current_user)


@router.post("/logout")
async def logout() -> dict[str, str]:
    return {"detail": "Logged out successfully."}


@router.put("/put/me", response_model=UserResponse)
async def update_me(
    payload: UpdateMeRequest,
    current_user: dict = Depends(get_current_user),
) -> UserResponse:
    users = get_users_collection()
    now = datetime.now(timezone.utc)
    await users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "full_name": payload.full_name,
                "updated_at": now,
            }
        },
    )
    current_user["full_name"] = payload.full_name
    current_user["updated_at"] = now
    return _serialize_user(current_user)
