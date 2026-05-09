from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .hand_evaluator import Card, evaluate_hand, parse_card, preflop_strength

STREETS = ("PREFLOP", "FLOP", "TURN", "RIVER")
FEATURE_NAMES = (
    "street_preflop",
    "street_flop",
    "street_turn",
    "street_river",
    "hand_strength",
    "preflop_strength",
    "pot_odds",
    "to_call_stack_ratio",
    "stack_to_pot_ratio",
    "effective_stack_to_pot_ratio",
    "position_score",
    "players_count_norm",
    "can_check",
    "hole_pair",
    "hole_suited",
    "hole_connected",
    "hole_high_cards_norm",
    "board_pair",
    "flush_draw",
    "straight_draw",
    "overcards_norm",
    "top_pair",
    "kicker_strength",
    "board_suitedness",
    "board_connectivity",
    "made_pair_or_better",
    "hand_category_norm",
    "raises_norm",
    "calls_norm",
    "checks_norm",
    "folds_norm",
    "aggression_score",
    "passive_opponent",
    "opponent_known",
    "showdown_edge",
    "opponent_strength",
)


@dataclass(frozen=True)
class FeatureContext:
    street: str
    hand_strength: float
    preflop_strength: float
    pot_odds: float
    stack_to_pot_ratio: float
    effective_stack_to_pot_ratio: float
    position_score: float
    raises: int
    calls: int
    checks: int
    folds: int
    passive_opponent: float
    opponent_known: float
    showdown_edge: float
    opponent_strength: float
    flush_draw: float
    straight_draw: float
    overcards: float
    top_pair: float
    kicker_strength: float
    board_pair: float
    board_suitedness: float
    board_connectivity: float
    made_pair_or_better: float
    hand_category_rank: int


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def normalize_street(street: str, board_len: int) -> str:
    upper = (street or "").upper()
    if upper in STREETS:
        return upper
    if board_len == 0:
        return "PREFLOP"
    if board_len == 3:
        return "FLOP"
    if board_len == 4:
        return "TURN"
    return "RIVER"


def _action_counts(actions: list[Any]) -> tuple[int, int, int, int]:
    names = []
    for action in actions:
        if isinstance(action, str):
            names.append(action.upper())
        elif isinstance(action, dict):
            names.append(str(action.get("action") or action.get("type") or "").upper())
    return (
        sum(1 for a in names if a == "RAISE"),
        sum(1 for a in names if a == "CALL"),
        sum(1 for a in names if a == "CHECK"),
        sum(1 for a in names if a == "FOLD"),
    )


def build_features(payload: dict[str, Any]) -> tuple[list[float], FeatureContext]:
    hole = [parse_card(card) for card in payload.get("holeCards", [])]
    board = [parse_card(card) for card in payload.get("communityCards", [])]
    street = normalize_street(str(payload.get("street", "")), len(board))
    pot = max(0.0, float(payload.get("pot", 0)))
    to_call = max(0.0, float(payload.get("toCall", 0)))
    bot_stack = max(0.0, float(payload.get("botStack", 0)))
    opponent_stack = max(0.0, float(payload.get("opponentStack", bot_stack)))
    players = max(2.0, float(payload.get("playersCount", 2)))
    position_raw = str(payload.get("position", "")).upper()
    position_score = 1.0 if position_raw in {"BUTTON", "DEALER", "LATE"} else 0.35
    if position_raw in {"SMALL_BLIND", "BIG_BLIND", "BLIND", "EARLY"}:
        position_score = 0.12
    elif isinstance(payload.get("position"), (int, float)):
        # Index de siège (0…n-1) : éviter 0 strict qui pénalise trop les heuristiques (fold excessif).
        ratio = clamp(float(payload["position"]) / max(players - 1, 1))
        position_score = 0.22 + 0.78 * ratio

    raises, calls, checks, folds = _action_counts(list(payload.get("actions", [])))
    opponent_style = str(payload.get("opponentStyle", "")).upper()
    passive_opponent = 1.0 if opponent_style in {"PASSIVE", "TIGHT_PASSIVE", "CALLING_STATION"} else 0.0
    if raises == 0 and calls + checks >= 2:
        passive_opponent = max(passive_opponent, 0.75)

    evaluation = evaluate_hand(hole, board)
    opponent_evaluations = [
        evaluate_hand([parse_card(card) for card in cards], board)
        for cards in payload.get("opponentHoleCards", [])
        if isinstance(cards, list) and len(cards) >= 2
    ]
    pre_strength = preflop_strength(hole)
    hand_strength = pre_strength if street == "PREFLOP" else evaluation.normalized_score
    opponent_strength = max((ev.normalized_score for ev in opponent_evaluations), default=0.0)
    showdown_edge = clamp((hand_strength - opponent_strength + 1) / 2)
    opponent_known = 1.0 if opponent_evaluations else 0.0
    flush_draw = 1.0 if evaluation.flush_draw else 0.0
    straight_draw = 1.0 if evaluation.straight_draw else 0.0
    board_pair = 1.0 if evaluation.board_pair else 0.0
    pot_odds = to_call / max(pot + to_call, 1.0)
    stack_to_pot = bot_stack / max(pot, 1.0)
    effective_stack = min(bot_stack, opponent_stack)
    effective_stack_to_pot = effective_stack / max(pot, 1.0)

    values = [c.value for c in hole]
    hole_pair = 1.0 if len(values) == 2 and values[0] == values[1] else 0.0
    hole_suited = 1.0 if len(hole) == 2 and hole[0].suit == hole[1].suit else 0.0
    hole_connected = 1.0 if len(values) == 2 and abs(values[0] - values[1]) <= 1 else 0.0
    hole_high_cards = sum(1 for value in values if value >= 11) / 2
    aggression = clamp((raises * 0.5 + calls * 0.15 - checks * 0.1) / 3 + 0.35)

    street_one_hot = [1.0 if street == name else 0.0 for name in STREETS]
    features = [
        *street_one_hot,
        hand_strength,
        pre_strength,
        clamp(pot_odds),
        clamp(to_call / max(bot_stack, 1.0)),
        clamp(stack_to_pot / 12),
        clamp(effective_stack_to_pot / 12),
        position_score,
        clamp((players - 2) / 7),
        1.0 if to_call <= 0 else 0.0,
        hole_pair,
        hole_suited,
        hole_connected,
        clamp(hole_high_cards),
        board_pair,
        flush_draw,
        straight_draw,
        clamp(evaluation.overcards / 2),
        1.0 if evaluation.top_pair else 0.0,
        evaluation.kicker_strength,
        evaluation.board_suitedness,
        evaluation.board_connectivity,
        1.0 if evaluation.made_pair_or_better else 0.0,
        clamp(evaluation.category_rank / 8),
        clamp(raises / 5),
        clamp(calls / 5),
        clamp(checks / 5),
        clamp(folds / 5),
        aggression,
        passive_opponent,
        opponent_known,
        showdown_edge,
        opponent_strength,
    ]
    context = FeatureContext(
        street=street,
        hand_strength=hand_strength,
        preflop_strength=pre_strength,
        pot_odds=clamp(pot_odds),
        stack_to_pot_ratio=stack_to_pot,
        effective_stack_to_pot_ratio=effective_stack_to_pot,
        position_score=position_score,
        raises=raises,
        calls=calls,
        checks=checks,
        folds=folds,
        passive_opponent=passive_opponent,
        opponent_known=opponent_known,
        showdown_edge=showdown_edge,
        opponent_strength=opponent_strength,
        flush_draw=flush_draw,
        straight_draw=straight_draw,
        overcards=clamp(evaluation.overcards / 2),
        top_pair=1.0 if evaluation.top_pair else 0.0,
        kicker_strength=evaluation.kicker_strength,
        board_pair=board_pair,
        board_suitedness=evaluation.board_suitedness,
        board_connectivity=evaluation.board_connectivity,
        made_pair_or_better=1.0 if evaluation.made_pair_or_better else 0.0,
        hand_category_rank=evaluation.category_rank,
    )
    return features, context
