from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .features import FeatureContext, build_features, clamp
from .hand_evaluator import parse_card


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
    if ctx.street == "RIVER":
        draw_bonus *= 0.35
    overcard_bonus = ctx.overcards * 0.04 if ctx.street in {"FLOP", "TURN"} else 0.0
    top_pair_bonus = ctx.top_pair * 0.08
    kicker_bonus = ctx.kicker_strength * 0.05 if ctx.made_pair_or_better > 0 else 0.0
    texture_penalty = ctx.board_suitedness * 0.05 + ctx.board_connectivity * 0.05
    if ctx.board_pair > 0 and ctx.hand_category_rank <= 1:
        texture_penalty += 0.03
    return clamp(ctx.hand_strength + draw_bonus + overcard_bonus + top_pair_bonus + kicker_bonus - texture_penalty)


def _preflop_tier(payload: dict[str, Any]) -> tuple[float, str]:
    cards = [parse_card(card) for card in payload.get("holeCards", [])]
    if len(cards) < 2:
        return 0.35, "unknown"
    a, b = sorted(cards[:2], key=lambda card: card.value, reverse=True)
    pair = a.value == b.value
    suited = a.suit == b.suit
    gap = abs(a.value - b.value)
    high, low = a.value, b.value

    if pair and high >= 11:
        return 0.96, "premium_pair"
    if pair and high >= 8:
        return 0.82, "strong_pair"
    if pair:
        return 0.68, "small_pair"
    if high == 14 and low >= 13:
        return 0.9 if suited else 0.84, "premium_broadway"
    if high == 14 and low >= 10:
        return 0.78 if suited else 0.64, "ace_broadway"
    if high >= 13 and low >= 10:
        return 0.72 if suited else 0.58, "broadway"
    if suited and high >= 11 and gap <= 2:
        return 0.64, "suited_broadway_connector"
    if suited and gap <= 1 and high >= 8:
        return 0.55, "suited_connector"
    if high == 14 and suited and low >= 5:
        return 0.56, "suited_ace"
    if high <= 9 and gap >= 4:
        return 0.22, "trash"
    return 0.4, "marginal"


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
    calling_station = str(payload.get("opponentStyle", "")).upper() == "CALLING_STATION"
    strong_draw = ctx.flush_draw > 0 or ctx.straight_draw > 0
    fold_equity = 0.22 + (0.2 if in_position else 0.0) + (0.18 if passive_villain else 0.0) - (0.18 if calling_station else 0.0)
    has_soul_read = ctx.opponent_known > 0

    if has_soul_read and ctx.street != "PREFLOP":
        edge = ctx.showdown_edge - 0.5
        opponent_weak = ctx.opponent_strength < 0.34
        if edge >= 0.14:
            if spr <= 3.2 or ctx.street == "RIVER":
                return _make("ALL_IN", 0.95, "value", "Soul-read: hero is far ahead, maximize pressure")
            return _make("RAISE", 0.94, "value", "Soul-read: hero is ahead, value bet relentlessly")
        if edge >= 0.04 and to_call == 0:
            return _make("RAISE", 0.84, "thin_value", "Soul-read: thin value against worse hand")
        if edge <= -0.12 and to_call > 0:
            if strong_draw and pressure < 0.24:
                return _make("CHECK_CALL", 0.66, "draw", "Soul-read: behind but drawing at acceptable price")
            return _make("FOLD", 0.9, "discipline", "Soul-read: dominated, refuse bad payoff")
        if edge <= -0.08 and to_call == 0 and opponent_weak and fold_equity >= 0.3:
            return _make("RAISE", 0.78, "bluff", "Soul-read: weak showdown value turns into pressure bluff")
        if opponent_weak and to_call == 0 and fold_equity >= 0.32:
            return _make("RAISE", 0.76, "bluff", "Soul-read: opponent capped, attack the pot")

    if ctx.street == "PREFLOP":
        tier, tier_name = _preflop_tier(payload)
        if tier >= 0.88:
            if spr <= 3.0 or pressure >= 0.22 or aggressive_villain:
                return _make("ALL_IN", 0.88, "value", f"Premium preflop range applies maximum pressure ({tier_name})")
            return _make("RAISE", 0.9, "value", f"Premium preflop range raises for value ({tier_name})")
        if tier >= 0.7:
            if pressure <= 0.18 or in_position:
                return _make("RAISE", 0.78, "value", f"Strong preflop hand opens or 3-bets ({tier_name})")
            return _make("CHECK_CALL", 0.68, "pot_odds", f"Strong preflop hand continues versus pressure ({tier_name})")
        if tier >= 0.54:
            if pressure >= 0.52 and not in_position:
                return _make("FOLD", 0.72, "discipline", f"Playable hand folds to heavy OOP pressure ({tier_name})")
            if to_call == 0 and (in_position or passive_villain):
                return _make("RAISE", 0.62, "steal", f"Playable preflop hand pressures blinds ({tier_name})")
            if price_gap >= -0.05 and pressure < 0.2:
                return _make("CHECK_CALL", 0.6, "speculative", f"Playable preflop hand takes fair price ({tier_name})")
            if to_call > 0 and to_call / pot <= 0.22:
                return _make("CHECK_CALL", 0.54, "float", f"Small open — voir un flop comme un humain ({tier_name})")
            return _make("FOLD", 0.62, "discipline", f"Playable hand not worth current preflop price ({tier_name})")
        if to_call <= 0:
            return _make("CHECK_CALL", 0.7, "pot_control", f"Marginal preflop hand checks option ({tier_name})")
        if to_call > 0 and to_call / pot <= 0.28 and tier >= 0.32:
            return _make("CHECK_CALL", 0.52, "speculative", f"Relance légère — défense fréquente ({tier_name})")
        return _make("FOLD", 0.78, "discipline", f"Weak preflop range folds versus pressure ({tier_name})")

    if ctx.street == "RIVER" and to_call > 0:
        if equity < 0.32 and price_gap < -0.04:
            return _make("FOLD", 0.88, "discipline", "River: deny bluffcatch without showdown value")
        if equity < 0.48 and price_gap < -0.12 and ctx.hand_category_rank <= 1:
            return _make("FOLD", 0.74, "discipline", "River: weak one-pair or worse vs large bet")
        if equity >= 0.72 and price_gap >= 0.06:
            return _make("RAISE", 0.88, "thin_value", "River: thin value or raise vs capped range")

    if (equity >= 0.88 or ctx.hand_category_rank >= 3) and spr <= 2.5:
        return _make("ALL_IN", 0.9, "value", "Very strong hand with short effective stack")
    if equity >= 0.76 or ctx.hand_category_rank >= 3:
        if calling_station and ctx.hand_category_rank >= 2:
            return _make("RAISE", 0.9, "value", "Made hand value bets heavily versus calling station")
        if to_call == 0 or in_position or passive_villain:
            return _make("RAISE", 0.86, "value", "Strong hand, value betting favorable spot")
        return _make("CHECK_CALL", 0.78, "trap", "Strong hand but facing pressure out of position")

    if equity >= 0.58:
        if to_call == 0 and (in_position or passive_villain) and not calling_station:
            return _make("RAISE", 0.74, "thin_value", "Medium-strong hand can pressure passive ranges")
        if price_gap >= -0.04 and pressure < 0.48:
            return _make("CHECK_CALL", 0.7, "pot_odds", "Medium hand has acceptable pot odds")
        if strong_draw and fold_equity >= 0.35 and ctx.street != "RIVER":
            return _make("RAISE", 0.64, "semi_bluff", "Strong draw can semi-bluff in position")
        if to_call / pot <= 0.38 and equity >= 0.52:
            return _make("CHECK_CALL", 0.58, "float", "Mise modérée — call pour showdown")
        return _make("FOLD", 0.58, "discipline", "Medium hand priced out by pressure")

    if strong_draw:
        if to_call == 0 and fold_equity >= 0.35 and pot / stack > 0.12:
            return _make("RAISE", 0.55, "semi_bluff", "Free action plus fold equity enables semi-bluff")
        if price_gap >= -0.06 and pressure < 0.35:
            return _make("CHECK_CALL", 0.68, "draw", "Draw has acceptable price")

    if to_call <= 0:
        if in_position and passive_villain and not calling_station and equity > 0.36:
            return _make("RAISE", 0.52, "bluff", "Controlled bluff against passive opponent")
        return _make("CHECK_CALL", 0.66, "pot_control", "Weak or marginal hand takes free card")

    if price_gap >= 0.02 and not aggressive_villain and pressure < 0.3:
        return _make("CHECK_CALL", 0.6, "pot_odds", "Marginal call justified by price")
    if to_call > 0 and to_call <= pot * 0.34 and equity >= 0.24:
        return _make("CHECK_CALL", 0.52, "float", "Petite mise par rapport au pot — call « humain »")
    # Sans lecture d’adversaire : ne fold que si la pression est réellement forte (évite fold auto).
    if (pressure > 0.48 and equity < 0.3) or (aggressive_villain and pressure > 0.42):
        return _make("FOLD", 0.72, "discipline", "Weak hand facing strong pressure")
    if to_call > 0 and to_call <= pot * 0.42 and equity >= 0.18:
        return _make("CHECK_CALL", 0.48, "float", "Mise modérée — call pour voir ou bluff induce")
    if to_call <= 0 and in_position and equity >= 0.28:
        return _make("RAISE", 0.5, "bluff", "Position : petite pression comme un régulier")
    return _make("CHECK_CALL", 0.55, "pot_control", "Pas assez d’info pour jeter ; contrôle du pot")


def _make(label: str, confidence: float, style: str, reason: str) -> ExpertLabel:
    return ExpertLabel(
        label=label,
        index=LABEL_TO_INDEX[label],
        confidence=clamp(confidence),
        style=style,
        reason=reason,
    )
