from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .features import FeatureContext, build_features, clamp


LABELS = ("FOLD", "CHECK_CALL", "RAISE", "ALL_IN")
LABEL_TO_INDEX = {label: idx for idx, label in enumerate(LABELS)}


@dataclass(frozen=True)
class ExpertLabel:
    label: str
    index: int
    confidence: float
    style: str
    reason: str


def _effective_equity(ctx: FeatureContext) -> float:
    draw_bonus = max(ctx.flush_draw, ctx.straight_draw) * 0.1
    overcard_bonus = ctx.overcards * 0.04 if ctx.street in {"FLOP", "TURN"} else 0.0
    top_pair_bonus = ctx.top_pair * 0.08
    texture_penalty = ctx.board_suitedness * 0.04 + ctx.board_connectivity * 0.04
    return clamp(ctx.hand_strength + draw_bonus + overcard_bonus + top_pair_bonus - texture_penalty)


def label_situation(payload: dict[str, Any]) -> ExpertLabel:
    _, ctx = build_features(payload)
    to_call = max(0.0, float(payload.get("toCall", 0)))
    pot = max(1.0, float(payload.get("pot", 1)))
    stack = max(1.0, float(payload.get("botStack", 1)))
    pressure = to_call / stack
    spr = ctx.effective_stack_to_pot_ratio
    equity = _effective_equity(ctx)
    price_gap = equity - ctx.pot_odds
    in_position = ctx.position_score >= 0.6
    aggressive_villain = ctx.raises >= 2 or str(payload.get("opponentStyle", "")).upper() == "AGGRESSIVE"
    passive_villain = ctx.passive_opponent > 0.5
    strong_draw = ctx.flush_draw > 0 or ctx.straight_draw > 0

    if (equity >= 0.88 or ctx.hand_category_rank >= 3) and spr <= 2.5:
        return _make("ALL_IN", 0.9, "value", "Very strong hand with short effective stack")
    if equity >= 0.76 or ctx.hand_category_rank >= 3:
        if to_call == 0 or in_position or passive_villain:
            return _make("RAISE", 0.86, "value", "Strong hand, value betting favorable spot")
        return _make("CHECK_CALL", 0.78, "trap", "Strong hand but facing pressure out of position")

    if equity >= 0.58:
        if to_call == 0 and (in_position or passive_villain):
            return _make("RAISE", 0.74, "thin_value", "Medium-strong hand can pressure passive ranges")
        if price_gap >= -0.02 and pressure < 0.45:
            return _make("CHECK_CALL", 0.72, "pot_odds", "Medium hand has acceptable pot odds")
        if strong_draw and in_position:
            return _make("RAISE", 0.64, "semi_bluff", "Strong draw can semi-bluff in position")
        return _make("FOLD", 0.62, "discipline", "Medium hand priced out by pressure")

    if strong_draw:
        if price_gap >= -0.04 and pressure < 0.35:
            return _make("CHECK_CALL", 0.68, "draw", "Draw has acceptable price")
        if to_call == 0 and in_position and pot / stack > 0.12:
            return _make("RAISE", 0.55, "semi_bluff", "Free action plus fold equity enables semi-bluff")

    if to_call <= 0:
        if in_position and passive_villain and equity > 0.36:
            return _make("RAISE", 0.52, "bluff", "Controlled bluff against passive opponent")
        return _make("CHECK_CALL", 0.66, "pot_control", "Weak or marginal hand takes free card")

    if price_gap >= 0.04 and not aggressive_villain:
        return _make("CHECK_CALL", 0.62, "pot_odds", "Marginal call justified by price")
    if pressure > 0.25 or aggressive_villain:
        return _make("FOLD", 0.76, "discipline", "Weak hand facing costly or aggressive action")
    return _make("FOLD", 0.64, "discipline", "Weak hand with insufficient equity")


def _make(label: str, confidence: float, style: str, reason: str) -> ExpertLabel:
    return ExpertLabel(
        label=label,
        index=LABEL_TO_INDEX[label],
        confidence=clamp(confidence),
        style=style,
        reason=reason,
    )
