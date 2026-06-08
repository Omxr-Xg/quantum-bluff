"""Belote decision policy — softmax over legal actions only."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class BeloteDecision:
    action: dict[str, Any]
    confidence: float
    reason: str


def predict_best_action(payload: dict[str, Any]) -> BeloteDecision | None:
    """
    Phase 5 stub — returns None until model artifact is trained and loaded.
    Caller must fallback to heuristic when None.
    """
    legal = payload.get("legalActions") or []
    if not legal:
        return None
    return None
