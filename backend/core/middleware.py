import logging
import os
import time
from collections import defaultdict, deque
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger("queryboard.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        started_at = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "%s %s -> %s (%.2fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        request_window = self._requests[client_ip]

        while request_window and current_time - request_window[0] > self.window_seconds:
            request_window.popleft()

        if len(request_window) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please try again shortly."},
            )

        request_window.append(current_time)
        return await call_next(request)


def get_cors_config() -> dict:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    allowed_origins = os.getenv("ALLOWED_ORIGINS")

    if allowed_origins:
        origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
    else:
        origins = [frontend_url]

    return {
        "allow_origins": origins or ["*"],
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }


def setup_middleware(app: FastAPI) -> None:
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(CORSMiddleware, **get_cors_config())
