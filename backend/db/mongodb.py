import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase


load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "queryboard")
AUTH_MODE = os.getenv("QUERYBOARD_AUTH_MODE", "real").strip().lower()
MOCK_AUTH_ENABLED = AUTH_MODE == "mock"

mongo_client: AsyncIOMotorClient | None = None
mongo_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> AsyncIOMotorDatabase:
    global mongo_client, mongo_database

    if mongo_client is None:
        mongo_client = AsyncIOMotorClient(MONGODB_URL)
        mongo_database = mongo_client[MONGODB_DB_NAME]
        await mongo_database["users"].create_index("email", unique=True)

    return mongo_database


async def close_mongo_connection() -> None:
    global mongo_client, mongo_database

    if mongo_client is not None:
        mongo_client.close()
        mongo_client = None
        mongo_database = None


def get_database() -> AsyncIOMotorDatabase:
    if mongo_database is None:
        raise RuntimeError("MongoDB connection has not been initialized.")
    return mongo_database


def get_users_collection() -> AsyncIOMotorCollection:
    return get_database()["users"]


@asynccontextmanager
async def mongo_lifespan(app):
    if not MOCK_AUTH_ENABLED:
        await connect_to_mongo()
    yield
    if not MOCK_AUTH_ENABLED:
        await close_mongo_connection()
