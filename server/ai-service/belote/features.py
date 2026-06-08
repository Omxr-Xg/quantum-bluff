"""Feature encoding for Belote neural model (legal-action masking)."""

from __future__ import annotations

from typing import Any


def encode_state_features(payload: dict[str, Any]) -> list[float]:
    """Placeholder — map gameState + legalActions to normalized vector."""
    variant = str(payload.get("variant", "CONTEE"))
    phase = str(payload.get("phase", "BIDDING"))
    legal = payload.get("legalActions") or []
    return [float(len(legal)), float(len(variant)), float(len(phase))]
