"""
Safety check middleware.

v1: Pass-through — always returns passed=True.
To activate: implement the classifier body here.
Controlled by: ai.safety_check.enabled feature flag + SAFETY_ENABLED env var.

See: CLAUDE.md §12.1 and ADR-0009.
"""
from dataclasses import dataclass


@dataclass
class SafetyResult:
    passed: bool
    score: float
    reason: str | None


async def safety_check(
    prompt: str | None,
    image_bytes: bytes | None,
) -> SafetyResult:
    """
    v1: Pass-through — always returns passed=True.
    To activate: implement the classifier body here.
    Controlled by: ai.safety_check.enabled feature flag + SAFETY_ENABLED env var.
    """
    return SafetyResult(passed=True, score=0.0, reason=None)
