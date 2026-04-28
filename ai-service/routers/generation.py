"""Generation endpoints — POST /generate/text and POST /generate/image."""
import logging
from typing import Annotated

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException

from config.settings import settings
from middleware.safety import safety_check
from providers import BaseProvider, ProviderUnavailableError, build_active_providers
from schemas.generation import GenerateImageRequest, GenerateResponse, GenerateTextRequest
from services.generation import (
    generate_image_with_failover,
    generate_text_with_failover,
    upload_to_s3,
)

logger = logging.getLogger("ai-service")
router = APIRouter(prefix="/generate", tags=["generation"])

_providers: list[BaseProvider] = []


def get_providers() -> list[BaseProvider]:
    global _providers
    if not _providers:
        _providers = build_active_providers()
    return _providers


@router.post("/text", response_model=GenerateResponse)
async def generate_text(
    request: GenerateTextRequest,
    providers: Annotated[list[BaseProvider], Depends(get_providers)],
) -> GenerateResponse:
    logger.info(
        "generate_text called: job=%s user=%s model=%s aspect=%s quality=%s providers=%s",
        request.job_id, request.user_id, request.model,
        request.aspect_ratio, request.quality,
        [type(p).__name__ for p in providers],
    )

    await safety_check(prompt=request.prompt, image_bytes=None)
    logger.info("safety_check passed: job=%s", request.job_id)

    try:
        img_bytes, width, height, provider_name = await generate_text_with_failover(
            providers,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            aspect_ratio=request.aspect_ratio,
            quality=request.quality,
        )
    except ProviderUnavailableError as err:
        logger.error("All providers failed for job %s: %s", request.job_id, err)
        raise HTTPException(status_code=503, detail=str(err)) from err

    logger.info(
        "generation done: job=%s provider=%s size=%dx%d bytes=%d",
        request.job_id, provider_name, width, height, len(img_bytes),
    )

    image_key = upload_to_s3(img_bytes, request.job_id, request.user_id)

    logger.info(
        "Text generation completed: job=%s provider=%s size=%dx%d key=%s",
        request.job_id, provider_name, width, height, image_key,
    )
    return GenerateResponse(
        job_id=request.job_id,
        image_key=image_key,
        provider=provider_name,
        model=request.model,
        width=width,
        height=height,
    )


@router.post("/image", response_model=GenerateResponse)
async def generate_image(
    request: GenerateImageRequest,
    providers: Annotated[list[BaseProvider], Depends(get_providers)],
) -> GenerateResponse:
    source_bytes = await _fetch_source_image(request.image_url)

    await safety_check(prompt=request.prompt, image_bytes=source_bytes)

    try:
        img_bytes, width, height, provider_name = await generate_image_with_failover(
            providers,
            image_bytes=source_bytes,
            prompt=request.prompt,
            strength=request.strength,
            aspect_ratio="1:1",
        )
    except ProviderUnavailableError as err:
        logger.error("All providers failed for img2img job %s: %s", request.job_id, err)
        raise HTTPException(status_code=503, detail=str(err)) from err

    image_key = upload_to_s3(img_bytes, request.job_id, request.user_id)

    logger.info(
        "Image generation completed: job=%s provider=%s size=%dx%d",
        request.job_id, provider_name, width, height,
    )
    return GenerateResponse(
        job_id=request.job_id,
        image_key=image_key,
        provider=provider_name,
        model=request.model,
        width=width,
        height=height,
    )


async def _fetch_source_image(image_url: str) -> bytes:
    """
    Fetch source image bytes.
    If image_url starts with http/https, download it.
    Otherwise treat it as an S3 key in the uploads bucket.
    """
    if image_url.startswith("http://") or image_url.startswith("https://"):
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            return resp.content

    bucket = settings.aws_bucket_uploads or "uploads"
    s3_kwargs: dict = {}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        s3_kwargs["aws_access_key_id"] = settings.aws_access_key_id
        s3_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    if settings.aws_endpoint_url:
        s3_kwargs["endpoint_url"] = settings.aws_endpoint_url
    s3 = boto3.client("s3", region_name=settings.aws_region, **s3_kwargs)
    try:
        obj = s3.get_object(Bucket=bucket, Key=image_url)
        return obj["Body"].read()  # type: ignore[no-any-return]
    except (BotoCoreError, ClientError) as err:
        raise HTTPException(status_code=404, detail=f"Source image not found: {err}") from err
