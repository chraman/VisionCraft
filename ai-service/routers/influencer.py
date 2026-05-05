"""
Influencer endpoints:
  POST /influencer/extract-dna  — extract CharacterDna from image or description
  POST /influencer/generate     — generate an image anchored to stored DNA
"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from config.settings import settings
from providers import BaseProvider, ProviderUnavailableError, build_active_providers
from schemas.influencer import (
    ExtractDnaRequest,
    ExtractDnaResponse,
    CharacterDnaSchema,
    GenerateInfluencerRequest,
    GenerateInfluencerResponse,
)
from services.influencer import extract_character_dna, build_anchored_prompt
from services.generation import generate_text_with_failover, upload_to_s3

logger = logging.getLogger("ai-service")
router = APIRouter(prefix="/influencer", tags=["influencer"])

_providers: list[BaseProvider] = []


def get_providers() -> list[BaseProvider]:
    global _providers
    if not _providers:
        _providers = build_active_providers()
    return _providers


@router.post("/extract-dna", response_model=ExtractDnaResponse)
async def extract_dna(request: ExtractDnaRequest) -> ExtractDnaResponse:
    """
    Extract character DNA from a source image URL or text description.
    The caller (image-service) passes source_image_url (S3/CDN URL) or description.
    Persistence is handled by the Node.js image-service before this call.
    influencer_id in the response is a placeholder — image-service uses its own DB id.
    """
    logger.info(
        "extract_dna: name=%s has_image=%s has_description=%s",
        request.name[:30],
        bool(request.source_image_url),
        bool(request.description),
    )

    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    try:
        dna_dict = await extract_character_dna(
            source_image_url=request.source_image_url,
            description=request.description,
            model_name=settings.augmentation_model,
            timeout_seconds=settings.influencer_extraction_timeout_seconds,
        )
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err

    dna_schema = CharacterDnaSchema(**dna_dict)
    return ExtractDnaResponse(influencer_id="assigned-by-image-service", character_dna=dna_schema)


@router.post("/generate", response_model=GenerateInfluencerResponse)
async def generate_influencer(
    request: GenerateInfluencerRequest,
    providers: Annotated[list[BaseProvider], Depends(get_providers)],
) -> GenerateInfluencerResponse:
    """
    Generate an image anchored to the provided character DNA.
    Delegates to generate_text_with_failover with the DNA-prefixed prompt.
    use_int8 is forwarded to the local provider; cloud providers ignore it.
    """
    logger.info(
        "generate_influencer: job=%s user=%s influencer=%s model=%s use_int8=%s",
        request.job_id, request.user_id, request.influencer_id, request.model, request.use_int8,
    )

    dna_dict = request.character_dna.model_dump()

    anchored_prompt = build_anchored_prompt(
        dna=dna_dict,
        target_prompt=request.target_prompt,
        emotion_modifier=request.emotion_modifier,
        scene_params=request.scene_params,
    )

    logger.info(
        "anchored_prompt: job=%s len=%d preview=%.120s",
        request.job_id, len(anchored_prompt), anchored_prompt,
    )

    try:
        img_bytes, width, height, provider_name = await generate_text_with_failover(
            providers,
            prompt=anchored_prompt,
            negative_prompt=None,
            aspect_ratio=request.aspect_ratio,
            quality=request.quality,
        )
    except ProviderUnavailableError as err:
        logger.error("All providers failed for influencer job %s: %s", request.job_id, err)
        raise HTTPException(status_code=503, detail=str(err)) from err

    image_key = upload_to_s3(img_bytes, request.job_id, request.user_id)

    logger.info(
        "generate_influencer DONE: job=%s provider=%s key=%s %dx%d",
        request.job_id, provider_name, image_key, width, height,
    )

    return GenerateInfluencerResponse(
        job_id=request.job_id,
        image_key=image_key,
        provider=provider_name,
        model=request.model,
        width=width,
        height=height,
        anchored_prompt=anchored_prompt,
    )
