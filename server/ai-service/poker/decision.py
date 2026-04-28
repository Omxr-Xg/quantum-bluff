from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

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


def _choose_action(probs: list[float], temperature: float) -> int:
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


def _raise_amount(payload: dict[str, Any], ctx: FeatureContext, all_in: bool = False) -> int:
    pot = max(0, int(payload.get("pot", 0)))
    to_call = max(0, int(payload.get("toCall", 0)))
    stack = max(0, int(payload.get("botStack", 0)))
    min_raise = max(1, int(payload.get("minRaise", 1) or 1))
    if all_in:
        return stack

    strength = ctx.hand_strength
    if strength > 0.78:
        fraction = 0.72 + random.random() * 0.28
    elif strength > 0.55:
        fraction = 0.45 + random.random() * 0.25
    else:
        fraction = 0.28 + random.random() * 0.18
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


def predict_decision(payload: dict[str, Any], model: PolicyModel | None = None) -> BotDecision:
    features, ctx = build_features(payload)
    model = model or PolicyModel.load()
    model_scores = model.scores(features)
    heuristic_scores = _heuristic_scores(ctx, float(payload.get("toCall", 0)), float(payload.get("botStack", 0)))
    logits = [
        model_score * 0.55 + heuristic_score * 0.45 + random.uniform(-0.08, 0.08)
        for model_score, heuristic_score in zip(model_scores, heuristic_scores)
    ]
    probs = _softmax(logits)
    temperature = float(payload.get("temperature", 0.92 if ctx.street == "PREFLOP" else 0.78))
    temperature = max(0.35, min(1.5, temperature))
    action_idx = _choose_action(probs, temperature)
    return _legalize(action_idx, payload, ctx, probs)


LinearPolicyModel = PolicyModel
