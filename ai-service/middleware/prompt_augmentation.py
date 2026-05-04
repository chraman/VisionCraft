"""
Prompt augmentation middleware.

Phase 1: Google Gemini enriches the user's text-to-image prompt with quality
         modifiers, lighting, style, camera, and rendering keywords before the
         provider call.
Phase 2: pgvector cosine-similarity retrieval provides few-shot examples to
         the Gemini call (AUGMENTATION_RAG_ENABLED=true required).

Controlled by:
  - PROMPT_AUGMENTATION_ENABLED env var  (infrastructure kill switch)
  - ai.prompt_augmentation.enabled flag  (per-user / per-tier rollout)

Failure mode: any exception → returns original prompt unchanged.
              Prompt text is never logged in full (truncated, CLAUDE.md §9.3).
See: CLAUDE.md §12.1 pattern, ADR-0010.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field

logger = logging.getLogger("ai-service")

SYSTEM_PROMPT = """You are a Stable Diffusion / DALL-E prompt engineer.
Given a user's image generation prompt, rewrite it as a single enhanced prompt
by appending high-quality modifiers. Preserve the user's original subject and intent exactly.

Add 6-12 comma-separated modifiers chosen from these categories (use only the most relevant):

QUALITY:    masterpiece, best quality, ultra-detailed, sharp focus, 8k uhd, RAW photo
LIGHTING:   golden hour lighting, soft diffused light, dramatic side lighting, volumetric fog,
            cinematic lighting, studio lighting, natural light, sunset glow, rim light
STYLE:      photorealistic, hyperrealistic, concept art, digital painting, oil painting,
            watercolor illustration, matte painting, cinematic film still
CAMERA:     shot on Canon EOS R5, f/1.8 aperture, bokeh background, wide-angle lens,
            macro photography, aerial view, eye-level shot, rule of thirds
RENDERING:  Octane render, Unreal Engine 5, ray tracing, depth of field, HDR

Rules:
- Output ONLY the enhanced prompt text. No explanation, no preamble, no quotes.
- The original subject must appear first, unmodified.
- Total output must not exceed 400 words.
- Do not duplicate modifiers already present in the original prompt."""


@dataclass
class AugmentationResult:
    augmented_prompt: str
    original_prompt: str
    was_augmented: bool
    augmentation_ms: int
    rag_examples_used: int = field(default=0)


async def augment_prompt(prompt: str, job_id: str, user_id: str) -> AugmentationResult:
    from config.settings import settings

    if not settings.prompt_augmentation_enabled:
        return AugmentationResult(
            augmented_prompt=prompt,
            original_prompt=prompt,
            was_augmented=False,
            augmentation_ms=0,
        )

    start = time.monotonic()
    try:
        examples = await _retrieve_similar_examples(prompt) if settings.augmentation_rag_enabled else []
        augmented = await asyncio.wait_for(
            _call_gemini(prompt, examples, settings.augmentation_model),
            timeout=settings.augmentation_timeout_seconds,
        )
        elapsed = int((time.monotonic() - start) * 1000)
        logger.info(
            "Prompt augmented: job=%s user=%s original_len=%d augmented_len=%d ms=%d rag=%d preview=%.100s",
            job_id, user_id, len(prompt), len(augmented), elapsed, len(examples), prompt,
        )
        return AugmentationResult(
            augmented_prompt=augmented,
            original_prompt=prompt,
            was_augmented=True,
            augmentation_ms=elapsed,
            rag_examples_used=len(examples),
        )
    except Exception as err:
        elapsed = int((time.monotonic() - start) * 1000)
        logger.warning(
            "Prompt augmentation failed, using original: job=%s error=%s",
            job_id, str(err)[:200],
        )
        return AugmentationResult(
            augmented_prompt=prompt,
            original_prompt=prompt,
            was_augmented=False,
            augmentation_ms=elapsed,
        )


async def _call_gemini(prompt: str, examples: list[str], model_name: str) -> str:
    import google.generativeai as genai  # type: ignore[import]
    from config.settings import settings

    system = SYSTEM_PROMPT
    if examples:
        examples_block = "\n".join(f"EXAMPLE {i + 1}: {ex}" for i, ex in enumerate(examples))
        system = (
            system
            + f"\n\nHere are examples of how similar prompts were successfully enhanced:\n\n"
            + examples_block
            + "\n\nUse these as stylistic reference — do not copy verbatim."
        )

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name,
        system_instruction=system,
    )
    response = await model.generate_content_async(
        prompt[:2000],
        generation_config={"max_output_tokens": 500, "temperature": 0.7},
    )
    text = response.text.strip()
    if not text:
        raise ValueError("Gemini returned an empty augmentation response")
    return text


IMG2IMG_SYSTEM_PROMPT = """You are a Stable Diffusion / DALL-E img2img prompt engineer.
The user provides reference image(s) and a transformation prompt.
Images are labeled [image1], [image2], etc. in the prompt.

Rewrite the transformation prompt to be more detailed and effective by:
1. Clarifying what visual elements to extract from each referenced image
2. Adding quality modifiers: masterpiece, ultra-detailed, sharp focus, 8k uhd
3. Adding relevant style, lighting, and rendering terms
4. Preserving ALL [imageN] references exactly as written

Rules:
- Output ONLY the enhanced prompt. No explanation, no preamble.
- Total output must not exceed 400 words.
- Do not duplicate modifiers already present in the original prompt."""


async def augment_prompt_img2img(
    prompt: str,
    image_bytes_list: list[bytes],
    job_id: str,
    user_id: str,
) -> AugmentationResult:
    """Multi-modal img2img augmentation — passes all reference images to Gemini."""
    from config.settings import settings

    if not settings.prompt_augmentation_enabled:
        return AugmentationResult(
            augmented_prompt=prompt,
            original_prompt=prompt,
            was_augmented=False,
            augmentation_ms=0,
        )

    start = time.monotonic()
    try:
        augmented = await asyncio.wait_for(
            _call_gemini_multimodal(prompt, image_bytes_list, settings.augmentation_model),
            timeout=settings.augmentation_timeout_seconds,
        )
        elapsed = int((time.monotonic() - start) * 1000)
        logger.info(
            "img2img augmentation: job=%s user=%s images=%d ms=%d preview=%.100s",
            job_id, user_id, len(image_bytes_list), elapsed, prompt,
        )
        return AugmentationResult(
            augmented_prompt=augmented,
            original_prompt=prompt,
            was_augmented=True,
            augmentation_ms=elapsed,
        )
    except Exception as err:
        elapsed = int((time.monotonic() - start) * 1000)
        logger.warning(
            "img2img augmentation failed, using original: job=%s error=%s",
            job_id, str(err)[:200],
        )
        return AugmentationResult(
            augmented_prompt=prompt,
            original_prompt=prompt,
            was_augmented=False,
            augmentation_ms=elapsed,
        )


async def _call_gemini_multimodal(
    prompt: str,
    image_bytes_list: list[bytes],
    model_name: str,
) -> str:
    import io
    import PIL.Image
    import google.generativeai as genai  # type: ignore[import]
    from config.settings import settings

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name,
        system_instruction=IMG2IMG_SYSTEM_PROMPT,
    )

    pil_images = [PIL.Image.open(io.BytesIO(b)) for b in image_bytes_list]
    parts: list = [
        f"Enhance this img2img prompt ({len(pil_images)} reference image(s) attached):\n{prompt[:2000]}",
        *pil_images,
    ]

    response = await model.generate_content_async(
        parts,
        generation_config={"max_output_tokens": 500, "temperature": 0.7},
    )
    text = response.text.strip()
    if not text:
        raise ValueError("Gemini returned an empty img2img augmentation response")
    return text


async def _retrieve_similar_examples(prompt: str) -> list[str]:
    """Phase 2: embed prompt → cosine search prompt_embeddings → return modifier texts."""
    from config.settings import settings

    if not settings.augmentation_db_url:
        return []
    try:
        import asyncpg  # type: ignore[import]
        import google.generativeai as genai  # type: ignore[import]

        genai.configure(api_key=settings.gemini_api_key)
        embed_model = "models/text-embedding-004"
        result = genai.embed_content(model=embed_model, content=prompt[:2000])
        query_vector = result["embedding"]

        conn = await asyncpg.connect(settings.augmentation_db_url)
        try:
            rows = await conn.fetch(
                """
                SELECT modifiers_text
                FROM prompt_embeddings
                ORDER BY embedding <=> $1::vector
                LIMIT $2
                """,
                str(query_vector),
                settings.augmentation_rag_top_k,
            )
            return [row["modifiers_text"] for row in rows]
        finally:
            await conn.close()
    except Exception as err:
        logger.warning("RAG retrieval failed, proceeding without examples: %s", str(err)[:200])
        return []
