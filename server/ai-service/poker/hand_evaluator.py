from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Any


RANK_TO_VALUE = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    "T": 10,
    "J": 11,
    "Q": 12,
    "K": 13,
    "A": 14,
}

VALUE_TO_RANK = {value: rank for rank, value in RANK_TO_VALUE.items() if rank != "T"}

SUIT_ALIASES = {
    "h": "HEARTS",
    "hearts": "HEARTS",
    "heart": "HEARTS",
    "d": "DIAMONDS",
    "diamonds": "DIAMONDS",
    "diamond": "DIAMONDS",
    "c": "CLUBS",
    "clubs": "CLUBS",
    "club": "CLUBS",
    "s": "SPADES",
    "spades": "SPADES",
    "spade": "SPADES",
}

HAND_CATEGORIES = (
    "HIGH_CARD",
    "PAIR",
    "TWO_PAIR",
    "THREE_OF_A_KIND",
    "STRAIGHT",
    "FLUSH",
    "FULL_HOUSE",
    "FOUR_OF_A_KIND",
    "STRAIGHT_FLUSH",
)


@dataclass(frozen=True)
class Card:
    rank: str
    suit: str
    value: int


@dataclass(frozen=True)
class HandEvaluation:
    category: str
    category_rank: int
    kickers: list[int]
    normalized_score: float
    flush_draw: bool
    straight_draw: bool
    overcards: int
    top_pair: bool
    kicker_strength: float
    board_pair: bool
    board_suitedness: float
    board_connectivity: float
    made_pair_or_better: bool


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def parse_card(raw: Any) -> Card:
    if isinstance(raw, str):
        token = raw.strip()
        rank_token = token[:-1].upper()
        suit_token = token[-1:].lower()
        rank = "10" if rank_token == "T" else rank_token
        value = RANK_TO_VALUE.get(rank_token)
        suit = SUIT_ALIASES.get(suit_token)
    elif isinstance(raw, dict):
        rank_raw = str(raw.get("rank") or raw.get("value") or "").upper()
        rank = "10" if rank_raw == "T" else rank_raw
        value_raw = raw.get("value")
        value = int(value_raw) if isinstance(value_raw, (int, float)) else RANK_TO_VALUE.get(rank_raw)
        suit = SUIT_ALIASES.get(str(raw.get("suit") or "").lower()) or str(raw.get("suit") or "").upper()
    else:
        raise ValueError(f"Unsupported card format: {raw!r}")

    if value is None and rank in RANK_TO_VALUE:
        value = RANK_TO_VALUE[rank]
    if rank not in RANK_TO_VALUE:
        rank = VALUE_TO_RANK.get(value or 0, "")
    if value is None or rank not in RANK_TO_VALUE or suit not in {"HEARTS", "DIAMONDS", "CLUBS", "SPADES"}:
        raise ValueError(f"Invalid card: {raw!r}")
    return Card(rank=rank, suit=suit, value=value)


def straight_high(values: list[int]) -> int:
    unique = sorted(set(values), reverse=True)
    if 14 in unique:
        unique.append(1)
    run = 1
    for idx in range(len(unique) - 1):
        if unique[idx] - 1 == unique[idx + 1]:
            run += 1
            if run >= 5:
                return unique[idx - 3]
        elif unique[idx] != unique[idx + 1]:
            run = 1
    return 0


def score_five(cards: tuple[Card, ...]) -> tuple[int, list[int]]:
    values = sorted((card.value for card in cards), reverse=True)
    counts = {value: values.count(value) for value in set(values)}
    groups = sorted(counts.items(), key=lambda item: (-item[1], -item[0]))
    flush = len({card.suit for card in cards}) == 1
    straight = straight_high(values)

    if flush and straight:
        return 8, [straight]
    if groups[0][1] == 4:
        return 7, [groups[0][0], next(value for value in values if value != groups[0][0])]
    if groups[0][1] == 3 and len(groups) > 1 and groups[1][1] == 2:
        return 6, [groups[0][0], groups[1][0]]
    if flush:
        return 5, values
    if straight:
        return 4, [straight]
    if groups[0][1] == 3:
        return 3, [groups[0][0], *[value for value in values if value != groups[0][0]]]
    if groups[0][1] == 2 and len(groups) > 1 and groups[1][1] == 2:
        pairs = sorted([groups[0][0], groups[1][0]], reverse=True)
        return 2, [*pairs, next(value for value in values if value not in pairs)]
    if groups[0][1] == 2:
        return 1, [groups[0][0], *[value for value in values if value != groups[0][0]]]
    return 0, values


def best_made_hand(cards: list[Card]) -> tuple[int, list[int]]:
    if len(cards) < 5:
        values = sorted((card.value for card in cards), reverse=True)
        pair = len(values) >= 2 and len(set(values)) < len(values)
        return (1 if pair else 0), values[:5]
    return max(score_five(combo) for combo in combinations(cards, 5))


def has_flush_draw(cards: list[Card]) -> bool:
    return any(sum(1 for card in cards if card.suit == suit) >= 4 for suit in {"HEARTS", "DIAMONDS", "CLUBS", "SPADES"})


def has_straight_draw(cards: list[Card]) -> bool:
    values = {card.value for card in cards}
    if 14 in values:
        values.add(1)
    return any(len(values & set(range(start, start + 5))) >= 4 for start in range(1, 11))


def preflop_strength(hole_cards: list[Card]) -> float:
    if len(hole_cards) < 2:
        return 0.35
    a, b = sorted(hole_cards[:2], key=lambda card: card.value, reverse=True)
    pair_bonus = 0.25 if a.value == b.value else 0.0
    suited_bonus = 0.055 if a.suit == b.suit else 0.0
    gap = abs(a.value - b.value)
    connected_bonus = max(0.0, 0.08 - gap * 0.018)
    high_card_score = ((a.value - 2) / 12 * 0.54) + ((b.value - 2) / 12 * 0.24)
    return clamp(0.08 + high_card_score + pair_bonus + suited_bonus + connected_bonus)


def evaluate_hand(hole_cards: list[Card], community_cards: list[Card]) -> HandEvaluation:
    cards = [*hole_cards, *community_cards]
    category_rank, kickers = best_made_hand(cards)
    board_values = [card.value for card in community_cards]
    board_high = max(board_values, default=0)
    hole_values = sorted((card.value for card in hole_cards), reverse=True)
    kicker_strength = clamp((hole_values[0] - 2) / 12) if hole_values else 0.0
    overcards = sum(1 for value in hole_values if board_high and value > board_high)
    top_pair = bool(board_high and any(card.value == board_high for card in hole_cards) and category_rank >= 1)
    board_pair = len(set(board_values)) < len(board_values)
    suitedness = 0.0
    if community_cards:
        suitedness = max(sum(1 for card in community_cards if card.suit == suit) for suit in {"HEARTS", "DIAMONDS", "CLUBS", "SPADES"}) / len(community_cards)
    board_connectivity = 0.0
    if len(board_values) >= 3:
        unique = sorted(set(board_values))
        board_connectivity = clamp(1 - ((max(unique) - min(unique)) / 12))

    if len(community_cards) == 0:
        normalized = preflop_strength(hole_cards)
    else:
        kicker_score = sum(value / 14 / (idx + 1) for idx, value in enumerate(kickers[:5])) / 2.3
        normalized = clamp((category_rank / 8) * 0.86 + kicker_score * 0.14)

    return HandEvaluation(
        category=HAND_CATEGORIES[category_rank],
        category_rank=category_rank,
        kickers=kickers,
        normalized_score=normalized,
        flush_draw=has_flush_draw(cards),
        straight_draw=has_straight_draw(cards),
        overcards=overcards,
        top_pair=top_pair,
        kicker_strength=kicker_strength,
        board_pair=board_pair,
        board_suitedness=clamp(suitedness),
        board_connectivity=board_connectivity,
        made_pair_or_better=category_rank >= 1,
    )
