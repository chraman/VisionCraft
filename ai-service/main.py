"""
AI Service — FastAPI
Handles text-to-image and image-to-image generation with dynamic provider failover.
Providers activated by env vars: STABILITY_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY,
HUGGINGFACE_API_KEY, LOCAL_MODEL_URL. Priority set via PROVIDER_PRIORITY.
"""
import logging
import sys
import time
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Force a handler on the root logger AND the named logger.
# Using sys.stdout so output is not subject to stderr buffering on Windows.
_fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")

_root = logging.getLogger()
_root.setLevel(logging.INFO)
for _h in list(_root.handlers):
    _root.removeHandler(_h)

# stdout handler
_stdout_handler = logging.StreamHandler(sys.stdout)
_stdout_handler.setFormatter(_fmt)
_root.addHandler(_stdout_handler)

# file handler — always works regardless of terminal buffering
_file_handler = logging.FileHandler("ai-service-debug.log", mode="a", encoding="utf-8")
_file_handler.setFormatter(_fmt)
_root.addHandler(_file_handler)

_ai_logger = logging.getLogger("ai-service")
_ai_logger.setLevel(logging.INFO)
_ai_logger.propagate = True

from routers.generation import router as generation_router  # noqa: E402

logger = logging.getLogger("ai-service")

app = FastAPI(
    title="AI Image Service",
    description="Image generation service — dynamic provider failover",
    version="1.0.0",
)


@app.middleware("http")
async def log_every_request(request: Request, call_next):
    start = time.time()
    logger.info(">>> REQUEST  %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        ms = int((time.time() - start) * 1000)
        logger.info("<<< RESPONSE %s %s  status=%d  %dms", request.method, request.url.path, response.status_code, ms)
        return response
    except Exception as exc:
        ms = int((time.time() - start) * 1000)
        logger.error("<<< ERROR    %s %s  %dms  %s", request.method, request.url.path, ms, exc, exc_info=True)
        raise


app.include_router(generation_router)


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("AI Service started — ready to accept requests")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    tb = traceback.format_exc()
    logger.error("Unhandled exception on %s %s: %s\n%s", request.method, request.url.path, exc, tb)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ai-service")


@app.get("/models")
async def list_models() -> dict:
    return {
        "models": [
            {"id": "sdxl", "provider": "stability-ai", "description": "Stable Diffusion XL"},
            {"id": "dalle3", "provider": "openai", "description": "DALL-E 3"},
            {"id": "sdxl-turbo", "provider": "huggingface", "description": "SDXL Turbo"},
        ]
    }


if __name__ == "__main__":
    import argparse, uvicorn
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=int(__import__("os").environ.get("PORT", 8000)))
    args = parser.parse_args()
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
