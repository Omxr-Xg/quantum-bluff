from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .expert_rules import label_situation
from .features import FEATURE_NAMES, FeatureContext, build_features, clamp


ACTIONS = ("FOLD", "CALL_CHECK", "RAISE", "ALL_IN")
PUBLIC_ACTIONS = ("FOLD", "CHECK", "CALL", "RAISE", "ALL_IN")
MODEL_PATH = Path(__file__).resolve().parents[1] / "model" / "expert_bot.pt"


@dataclass(frozen=True)
class BotDecision:
    action: str
    amount: int
    confidence: float
    style: str
    reason: str


class PolicyModel:
    def __init__(self, layers: list[dict[str, list]]) -> None:
        self.layers = layers

    @classmethod
    def load(cls, path: Path = MODEL_PATH) -> "PolicyModel":
        with path.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
        if raw.get("input_size") != len(FEATURE_NAMES):
            raise ValueError("Model input size does not match feature set")
        if raw.get("format") == "quantum-bluff-mlp-policy-v2":
            return cls(layers=raw["layers"])
        return cls(layers=[{"weights": raw["weights"], "bias": raw["bias"]}])

    def scores(self, features: list[float]) -> list[float]:
        values = features
        for layer_idx, layer in enumerate(self.layers):
            next_values = [
                sum(weight * value for weight, value in zip(row, values)) + layer["bias"][idx]
                for idx, row in enumerate(layer["weights"])
            ]
            values = [max(0.0, value) for value in next_values] if layer_idx < len(self.layers) - 1 else next_values
        return values


def _softmax(logits: list[float]) -> list[float]:
    top = max(logits)
    exps = [math.exp(value - top) for value in logits]
    total = sum(exps) or 1.0
    return [value / total for value in exps]


def _heuristic_scores(ctx: FeatureContext, to_call: float, bot_stack: float) -> list[float]:
    draw_bonus = max(ctx.flush_draw, ctx.straight_draw) * 0.12
    equity = clamp(ctx.hand_strength + draw_bonus)
    price_gap = equity - ctx.pot_odds
    pressure = clamp(to_call / max(bot_stack, 1.0))
    position_bonus = (ctx.position_score - 0.45) * 0.22
    passive_bonus = ctx.passive_opponent * 0.2
    made_bonus = ctx.made_pair_or_better * 0.12 + (ctx.hand_category_rank / 8) * 0.22

    fold = 1.2 - equity * 2.1 + pressure * 1.4 + ctx.pot_odds * 0.9
    call = 0.28 + price_gap * 2.2 - pressure * 0.45
    raise_score = -0.35 + equity * 2.4 + position_bonus + passive_bonus + made_bonus - ctx.board_pair * 0.08
    all_in = -1.4 + equity * 2.6 - clamp(ctx.effective_stack_to_pot_ratio / 6) + pressure * 0.45

    if to_call <= 0:
        fold -= 2.0
        call += 0.35
        raise_score += 0.15 + position_bonus
    if ctx.street == "PREFLOP":
        raise_score += ctx.position_score * 0.2
        all_in += 0.35 if ctx.preflop_strength > 0.86 else -0.35
    if price_gap < -0.16 and to_call > 0:
        fold += 0.6
        raise_score -= 0.25
    return [fold, call, raise_score, all_in]


def _teacher_scores(payload: dict[str, Any]) -> tuple[list[float], str, str]:
    teacher = label_situation(payload)
    scores = [-0.55, -0.55, -0.55, -0.55]
    scores[teacher.index] = 1.45 + teacher.confidence

    # Keep the expert difficult but not robotic: nearby acceptable actions retain small mass.
    if teacher.label == "FOLD":
        scores[1] += 0.12
    elif teacher.label == "CHECK_CALL":
        scores[2] += 0.18
    elif teacher.label == "RAISE":
        scores[1] += 0.16
        scores[3] += 0.08
    elif teacher.label == "ALL_IN":
        scores[2] += 0.22
    return scores, teacher.style, teacher.reason


def _choose_action(probs: list[float], temperature: float) -> int:
    ranked = sorted(enumerate(probs), key=lambda item: item[1], reverse=True)
    if ranked[0][1] >= 0.62 or ranked[0][1] - ranked[1][1] >= 0.18:
        return ranked[0][0]
    adjusted = [pow(max(prob, 1e-6), 1 / temperature) for prob in probs]
    total = sum(adjusted)
    roll = random.random() * total
    cursor = 0.0
    for idx, value in enumerate(adjusted):
        cursor += value
        if roll <= cursor:
            return idx
    return len(adjusted) - 1


def _style_for_action(action: str, ctx: FeatureContext) -> str:
    if action == "RAISE" and max(ctx.flush_draw, ctx.straight_draw) > 0 and ctx.hand_strength < 0.65:
        return "semi_bluff"
    if action == "RAISE":
        return "value" if ctx.hand_strength >= 0.62 else "bluff"
    if action in {"CALL", "CHECK"}:
        return "pot_control" if ctx.hand_strength < 0.58 else "showdown_value"
    if action == "ALL_IN":
        return "pressure" if ctx.hand_strength < 0.78 else "value"
    return "discipline"


def _emoji_for_style(style: str, action: str) -> str:
    if action == "ALL_IN":
        return "🚀"
    return {
        "semi_bluff": "🎭",
        "bluff": "😏",
        "value": "💎",
        "thin_value": "💎",
        "pressure": "🔥",
        "discipline": "🧊",
        "pot_control": "🛡️",
        "draw": "🎯",
        "showdown_value": "👀",
        "trap": "🪤",
    }.get(style, "🃏")


def _raise_amount(payload: dict[str, Any], ctx: FeatureContext, all_in: bool = False) -> int:
    pot = max(0, int(payload.get("pot", 0)))
    to_call = max(0, int(payload.get("toCall", 0)))
    stack = max(0, int(payload.get("botStack", 0)))
    min_raise = max(1, int(payload.get("minRaise", 1) or 1))
    if all_in:
        return stack

    strength = ctx.hand_strength
    spr = ctx.effective_stack_to_pot_ratio
    edge = ctx.showdown_edge - 0.5 if ctx.opponent_known > 0 else 0.0
    pressure_bonus = 0.18 if ctx.position_score >= 0.6 else 0.0
    pressure_bonus += 0.16 if ctx.passive_opponent > 0 else 0.0
    pressure_bonus += 0.18 if ctx.opponent_known > 0 and ctx.opponent_strength < 0.38 else 0.0
    if edge >= 0.18 or strength > 0.78:
        fraction = 0.95 + random.random() * 0.38
    elif edge >= 0.06 or strength > 0.55:
        fraction = 0.62 + pressure_bonus + random.random() * 0.34
    else:
        fraction = 0.42 + pressure_bonus + random.random() * 0.26
    if spr <= 2.2:
        fraction += 0.24
    if ctx.street == "RIVER" and ctx.opponent_known > 0 and edge >= 0.12:
        fraction += 0.22
    target = to_call + min_raise + int(pot * fraction)
    return max(min_raise, min(stack, target))


def _legalize(
    action_idx: int,
    payload: dict[str, Any],
    ctx: FeatureContext,
    probs: list[float],
) -> BotDecision:
    to_call = max(0, int(payload.get("toCall", 0)))
    stack = max(0, int(payload.get("botStack", 0)))
    min_raise = max(1, int(payload.get("minRaise", 1) or 1))
    action = ACTIONS[action_idx]
    confidence = clamp(max(probs), 0.01, 0.99)
    equity_note = f"equity={ctx.hand_strength:.2f}, pot_odds={ctx.pot_odds:.2f}"

    if action == "FOLD":
        if to_call <= 0:
            return BotDecision("CHECK", 0, confidence, "pot_control", f"Free check preferred over invalid fold ({equity_note})")
        return BotDecision("FOLD", 0, confidence, "discipline", f"Weak price-adjusted equity ({equity_note})")

    if action == "CALL_CHECK":
        if to_call <= 0:
            return BotDecision("CHECK", 0, confidence, _style_for_action("CHECK", ctx), f"Showdown value or pot control ({equity_note})")
        if to_call >= stack:
            return BotDecision("ALL_IN", stack, confidence, _style_for_action("ALL_IN", ctx), f"Call consumes stack with acceptable equity ({equity_note})")
        return BotDecision("CALL", 0, confidence, _style_for_action("CALL", ctx), f"Good equity and acceptable call price ({equity_note})")

    if action == "ALL_IN":
        if stack <= 0:
            action = "CHECK" if to_call <= 0 else "FOLD"
            return BotDecision(action, 0, confidence, _style_for_action(action, ctx), "No chips available")
        if ctx.hand_strength < 0.62 and ctx.pot_odds > ctx.hand_strength + 0.08:
            return BotDecision("FOLD", 0, confidence, "discipline", f"All-in rejected by risk layer ({equity_note})")
        return BotDecision("ALL_IN", stack, confidence, _style_for_action("ALL_IN", ctx), f"High pressure expert shove ({equity_note})")

    if stack < min_raise:
        if to_call <= 0:
            return BotDecision("CHECK", 0, confidence, "pot_control", "Raise unavailable with current stack")
        action = "CALL" if stack >= to_call else "FOLD"
        return BotDecision(action, 0, confidence, _style_for_action(action, ctx), "Raise unavailable, fallback action")

    amount = _raise_amount(payload, ctx)
    if amount >= stack and stack > 0:
        return BotDecision("ALL_IN", stack, confidence, _style_for_action("ALL_IN", ctx), f"Aggressive value/bluff line uses full stack ({equity_note})")
    return BotDecision("RAISE", amount, confidence, _style_for_action("RAISE", ctx), f"Aggressive expert line with position/range pressure ({equity_note})")


def _soul_read_override(payload: dict[str, Any], ctx: FeatureContext) -> int | None:
    if ctx.opponent_known <= 0 or ctx.street == "PREFLOP":
        return None
    to_call = max(0.0, float(payload.get("toCall", 0)))
    pressure = clamp(to_call / max(float(payload.get("botStack", 1)), 1.0))
    edge = ctx.showdown_edge - 0.5
    can_pressure = ctx.position_score >= 0.6 or ctx.passive_opponent > 0 or ctx.opponent_strength < 0.34

    if edge >= 0.14:
        return ACTIONS.index("ALL_IN") if ctx.effective_stack_to_pot_ratio <= 3.2 else ACTIONS.index("RAISE")
    if edge >= 0.04 and to_call == 0:
        return ACTIONS.index("RAISE")
    if edge <= -0.12 and to_call > 0 and pressure > 0.14:
        return ACTIONS.index("FOLD")
    if edge <= -0.06 and to_call == 0 and can_pressure and ctx.opponent_strength < 0.42:
        return ACTIONS.index("RAISE")
    if ctx.opponent_strength < 0.3 and to_call == 0 and can_pressure:
        return ACTIONS.index("RAISE")
    return None


def predict_decision(payload: dict[str, Any], model: PolicyModel | None = None) -> BotDecision:
    features, ctx = build_features(payload)
    model = model or PolicyModel.load()
    model_scores = model.scores(features)
    heuristic_scores = _heuristic_scores(ctx, float(payload.get("toCall", 0)), float(payload.get("botStack", 0)))
    teacher_scores, teacher_style, teacher_reason = _teacher_scores(payload)
    logits = [
        model_score * 0.28 + heuristic_score * 0.22 + teacher_score * 0.5 + random.uniform(-0.01, 0.01)
        for model_score, heuristic_score, teacher_score in zip(model_scores, heuristic_scores, teacher_scores)
    ]
    probs = _softmax(logits)
    temperature = float(payload.get("temperature", 0.28 if ctx.street == "PREFLOP" else 0.22))
    temperature = max(0.18, min(1.1, temperature))
    action_idx = _soul_read_override(payload, ctx)
    if action_idx is None:
        action_idx = _choose_action(probs, temperature)
    decision = _legalize(action_idx, payload, ctx, probs)
    final_style = teacher_style if decision.style in {"bluff", "pot_control", "discipline"} else decision.style
    emoji = _emoji_for_style(final_style, decision.action)
    return BotDecision(
        action=decision.action,
        amount=decision.amount,
        confidence=decision.confidence,
        style=final_style,
        reason=f"{emoji} {decision.reason}; teacher={teacher_reason}",
    )


LinearPolicyModel = PolicyModel
