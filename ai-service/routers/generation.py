"""Generation endpoints — POST /generate/text, POST /generate/image, POST /generate/describe-scene."""
import base64
import logging
from typing import Annotated

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config.settings import settings
from middleware.safety import safety_check
from middleware.prompt_augmentation import augment_prompt, augment_prompt_img2img, AugmentationResult
from providers import BaseProvider, ProviderUnavailableError, build_active_providers
from schemas.generation import GenerateImageRequest, GenerateResponse, GenerateTextRequest
from services.generation import (
    generate_image_with_failover,
    generate_text_with_failover,
    upload_to_s3,
)


class DescribeSceneRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class DescribeSceneResponse(BaseModel):
    prompt: str

logger = logging.getLogger("ai-service")
router = APIRouter(prefix="/generate", tags=["generation"])


def _log(msg: str) -> None:
    logger.info(msg)
    print(msg, flush=True)

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
    _log(
        f"[ai-service] generate_text: job={request.job_id} user={request.user_id} "
        f"model={request.model} aspect={request.aspect_ratio} quality={request.quality} "
        f"providers={[type(p).__name__ for p in providers]}"
    )

    await safety_check(prompt=request.prompt, image_bytes=None)
    _log(f"[ai-service] safety_check passed: job={request.job_id}")

    augmentation_result: AugmentationResult | None = None
    effective_prompt = request.prompt
    if settings.prompt_augmentation_enabled:
        augmentation_result = await augment_prompt(
            prompt=request.prompt,
            job_id=request.job_id,
            user_id=request.user_id,
        )
        effective_prompt = augmentation_result.augmented_prompt
        _log(
            f"[ai-service] augmentation: job={request.job_id} "
            f"was_augmented={augmentation_result.was_augmented} "
            f"ms={augmentation_result.augmentation_ms}"
        )

    try:
        img_bytes, width, height, provider_name = await generate_text_with_failover(
            providers,
            prompt=effective_prompt,
            negative_prompt=request.negative_prompt,
            aspect_ratio=request.aspect_ratio,
            quality=request.quality,
        )
    except ProviderUnavailableError as err:
        logger.error("All providers failed for job %s: %s", request.job_id, err)
        raise HTTPException(status_code=503, detail=str(err)) from err

    _log(f"[ai-service] generation done: job={request.job_id} provider={provider_name} size={width}x{height} bytes={len(img_bytes)}")

    image_key = upload_to_s3(img_bytes, request.job_id, request.user_id)

    _log(f"[ai-service] DONE: job={request.job_id} provider={provider_name} key={image_key}")
    return GenerateResponse(
        job_id=request.job_id,
        image_key=image_key,
        provider=provider_name,
        model=request.model,
        width=width,
        height=height,
        augmented_prompt=(
            augmentation_result.augmented_prompt
            if augmentation_result and augmentation_result.was_augmented
            else None
        ),
        augmentation_ms=augmentation_result.augmentation_ms if augmentation_result else None,
    )


@router.post("/image", response_model=GenerateResponse)
async def generate_image(
    request: GenerateImageRequest,
    providers: Annotated[list[BaseProvider], Depends(get_providers)],
) -> GenerateResponse:
    import asyncio as _asyncio

    _log(
        f"[ai-service] generate_image: job={request.job_id} user={request.user_id} "
        f"images={len(request.image_urls)} model={request.model}"
    )

    # Fetch all reference images from S3 in parallel; primary is image_urls[0]
    source_bytes_list: list[bytes] = list(
        await _asyncio.gather(*[_fetch_source_image(url) for url in request.image_urls])
    )

    await safety_check(prompt=request.prompt, image_bytes=source_bytes_list[0])
    _log(f"[ai-service] safety_check passed: job={request.job_id}")

    augmentation_result: AugmentationResult | None = None
    effective_prompt = request.prompt
    if settings.prompt_augmentation_enabled:
        augmentation_result = await augment_prompt_img2img(
            prompt=request.prompt,
            image_bytes_list=source_bytes_list,
            job_id=request.job_id,
            user_id=request.user_id,
        )
        effective_prompt = augmentation_result.augmented_prompt
        _log(
            f"[ai-service] img2img augmentation: job={request.job_id} "
            f"was_augmented={augmentation_result.was_augmented} "
            f"ms={augmentation_result.augmentation_ms}"
        )

    try:
        img_bytes, width, height, provider_name = await generate_image_with_failover(
            providers,
            image_bytes=source_bytes_list[0],
            prompt=effective_prompt,
            strength=request.strength,
            aspect_ratio="1:1",
        )
    except ProviderUnavailableError as err:
        logger.error("All providers failed for img2img job %s: %s", request.job_id, err)
        raise HTTPException(status_code=503, detail=str(err)) from err

    image_key = upload_to_s3(img_bytes, request.job_id, request.user_id)

    _log(f"[ai-service] img2img DONE: job={request.job_id} provider={provider_name} size={width}x{height}")
    return GenerateResponse(
        job_id=request.job_id,
        image_key=image_key,
        provider=provider_name,
        model=request.model,
        width=width,
        height=height,
        augmented_prompt=(
            augmentation_result.augmented_prompt
            if augmentation_result and augmentation_result.was_augmented
            else None
        ),
        augmentation_ms=augmentation_result.augmentation_ms if augmentation_result else None,
    )


_SCENE_DESCRIBE_PROMPT = (
"Analyze the image and generate a cinematic FLUX/Stable Diffusion prompt that recreates "
    "the exact visual composition while maintaining natural editorial-style wording. "
    "Describe the scene as a cohesive cinematic moment, blending precise structural accuracy "
    "with expressive photography language. "
    "Accurately describe the subject’s pose and body mechanics, including body orientation, "
    "leg positioning, arm placement, posture, spine angle, shoulder direction, head tilt, "
    "gaze direction, hand placement, weight balance, and camera-relative positioning. "
    "The pose must feel natural, candid, believable, and visually grounded in the environment. "
    "Describe outfit details naturally, including fabric texture, wrinkles, movement, tightness, "
    "wetness, transparency, layering, and interaction with lighting, wind, water, furniture, or surroundings. "
    "Include facial expression, emotional vibe, hair behavior, and candid influencer-style energy. "
    "Also describe the environment cinematically: location, atmosphere, lighting, shadows, "
    "weather, color palette, depth, focal length, composition, background elements, "
    "bokeh, camera angle, cinematic mood, and photography aesthetic. "
    "Emphasize photorealism, realistic anatomy, authentic posture, natural skin texture, "
    "realistic lighting behavior, DSLR-quality detail, and believable human presence. "
    "Avoid robotic phrasing, generic wording, exaggerated anatomy, or invented details not visible in the image. "
    "Write in smooth natural-language cinematic phrasing instead of rigid attribute lists. "
    "Output ONLY the final prompt text as concise comma-separated cinematic phrases. "
    "Maximum 180 words."
)


@router.post("/describe-scene", response_model=DescribeSceneResponse)
async def describe_scene(request: DescribeSceneRequest) -> DescribeSceneResponse:
    """Use Gemini vision to describe a scene image as a generation prompt."""
    try:
        import io
        import PIL.Image
        import google.generativeai as genai  # type: ignore[import]

        image_bytes = base64.b64decode(request.image_base64)
        pil_image = PIL.Image.open(io.BytesIO(image_bytes))

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.augmentation_model)
        response = await model.generate_content_async(
            [_SCENE_DESCRIBE_PROMPT, pil_image],
            generation_config={"max_output_tokens": 200, "temperature": 0.4},
        )
        prompt_text = response.text.strip()
        if not prompt_text:
            raise ValueError("Gemini returned empty description")
        _log(f"[ai-service] describe-scene: {len(image_bytes)} bytes → {len(prompt_text)} chars")
        return DescribeSceneResponse(prompt=prompt_text)
    except Exception as err:
        logger.warning("describe-scene failed: %s", str(err)[:200])
        raise HTTPException(status_code=500, detail=f"Scene description failed: {err}") from err


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
