from __future__ import annotations

import argparse
import copy
import csv
import json
import random
from pathlib import Path
from typing import Any

from .features import STREETS, build_features
from .expert_rules import label_situation


RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
SUITS = ["h", "d", "c", "s"]


def make_deck() -> list[str]:
    return [f"{rank}{suit}" for rank in RANKS for suit in SUITS]


def _take_card(deck: list[str], rank: str | None = None, suited_with: str | None = None) -> str:
    candidates = deck
    if rank is not None:
        candidates = [card for card in candidates if card[:-1] == rank]
    if suited_with is not None:
        candidates = [card for card in candidates if card[-1] == suited_with]
    card = random.choice(candidates)
    deck.remove(card)
    return card


def _sample_hole_cards(deck: list[str], scenario: str) -> list[str]:
    if scenario == "premium_preflop":
        rank = random.choice(["A", "K", "Q", "J", "10"])
        if random.random() < 0.45:
            return [_take_card(deck, rank), _take_card(deck, rank)]
        first = _take_card(deck, random.choice(["A", "K"]))
        second_rank = random.choice(["A", "K", "Q", "J", "10"])
        while second_rank == first[:-1]:
            second_rank = random.choice(["A", "K", "Q", "J", "10"])
        return [first, _take_card(deck, second_rank, first[-1] if random.random() < 0.55 else None)]
    if scenario == "speculative":
        high = random.choice(["6", "7", "8", "9", "10", "J"])
        high_idx = RANKS.index(high)
        low = RANKS[max(0, high_idx - random.choice([1, 2]))]
        first = _take_card(deck, high)
        return [first, _take_card(deck, low, first[-1] if random.random() < 0.7 else None)]
    if scenario == "trash":
        first = _take_card(deck, random.choice(["2", "3", "4", "5", "6", "7", "8"]))
        second = _take_card(deck, random.choice(["2", "3", "4", "5", "6", "7", "8", "9"]))
        return [first, second]
    return [deck.pop(), deck.pop()]


def sample_situation() -> dict[str, Any]:
    deck = make_deck()
    random.shuffle(deck)
    scenario = random.choices(
        ["premium_preflop", "speculative", "draw_pressure", "value_spot", "trash", "balanced"],
        weights=[0.12, 0.14, 0.26, 0.26, 0.09, 0.13],
        k=1,
    )[0]
    street_weights = [0.48, 0.24, 0.16, 0.12] if scenario in {"premium_preflop", "speculative", "trash"} else [0.18, 0.36, 0.25, 0.21]
    street = random.choices(STREETS, weights=street_weights, k=1)[0]
    board_count = {"PREFLOP": 0, "FLOP": 3, "TURN": 4, "RIVER": 5}[street]
    hole = _sample_hole_cards(deck, scenario)
    opponent_hole = [deck.pop(), deck.pop()]
    board = [deck.pop() for _ in range(board_count)]
    blind = random.choice([20, 50, 100])
    players = random.randint(2, 6)
    bot_stack = random.choice([
        random.randint(8 * blind, 25 * blind),
        random.randint(25 * blind, 80 * blind),
        random.randint(80 * blind, 200 * blind),
    ])
    opponent_stack = random.choice([
        random.randint(8 * blind, 25 * blind),
        random.randint(25 * blind, 80 * blind),
        random.randint(80 * blind, 200 * blind),
    ])
    pot_multiplier = {
        "premium_preflop": random.uniform(2.0, 8.0),
        "speculative": random.uniform(2.0, 10.0),
        "draw_pressure": random.uniform(5.0, 24.0),
        "value_spot": random.uniform(6.0, 32.0),
        "trash": random.uniform(2.0, 18.0),
        "balanced": random.uniform(2.0, 28.0),
    }[scenario]
    pot = max(blind * 2, int(pot_multiplier * blind * random.uniform(0.8, players / 2)))
    call_probability = 0.3 if scenario in {"premium_preflop", "value_spot"} else 0.58
    to_call = 0 if random.random() < (1 - call_probability) else random.randint(blind, max(blind, min(bot_stack, int(pot * random.uniform(0.12, 1.35)))))
    opponent_style = random.choices(
        ["UNKNOWN", "PASSIVE", "AGGRESSIVE", "TIGHT_PASSIVE", "CALLING_STATION"],
        weights=[3, 2, 2, 1, 1],
        k=1,
    )[0]
    action_weights = {
        "AGGRESSIVE": [2, 2, 5, 1],
        "PASSIVE": [4, 4, 1, 1],
        "TIGHT_PASSIVE": [4, 2, 1, 3],
        "CALLING_STATION": [2, 6, 1, 1],
        "UNKNOWN": [4, 3, 2, 1],
    }[opponent_style]
    actions = random.choices(["CHECK", "CALL", "RAISE", "FOLD"], weights=action_weights, k=random.randint(0, 7))

    return {
        "gameId": "sim",
        "botId": "bot_1",
        "street": street,
        "holeCards": hole,
        "communityCards": board,
        "pot": pot,
        "toCall": to_call,
        "botStack": bot_stack,
        "opponentStack": opponent_stack,
        "position": random.choice(["BUTTON", "SMALL_BLIND", "BIG_BLIND", "EARLY", "LATE"]),
        "playersCount": players,
        "actions": actions,
        "opponentStyle": opponent_style,
        "opponentHoleCards": [opponent_hole],
        "minRaise": blind,
        "scenario": scenario,
    }


def heuristic_label(payload: dict[str, Any]) -> int:
    return label_situation(payload).index


def generate_dataset(size: int) -> tuple[list[list[float]], list[int]]:
    features: list[list[float]] = []
    labels: list[int] = []
    for _ in range(size):
        payload = sample_situation()
        row, _ = build_features(payload)
        features.append(row)
        labels.append(heuristic_label(payload))
    return features, labels


def dataset_rows(size: int):
    for _ in range(size):
        payload = sample_situation()
        yield row_for_payload(payload)


def row_for_payload(payload: dict[str, Any]) -> dict[str, Any]:
        features, _ = build_features(payload)
        label = label_situation(payload)
        row = {f"f_{idx}": value for idx, value in enumerate(features)}
        row.update(
            {
                "label": label.index,
                "label_name": label.label,
                "confidence": label.confidence,
                "style": label.style,
                "reason": label.reason,
                "payload": json.dumps(payload, separators=(",", ":")),
            }
        )
        return row


def _commit_action(payload: dict[str, Any], action_name: str) -> None:
    blind = max(1, int(payload.get("minRaise", 1)))
    to_call = max(0, int(payload.get("toCall", 0)))
    pot = max(0, int(payload.get("pot", 0)))
    stack = max(0, int(payload.get("botStack", 0)))

    if action_name == "FOLD":
        payload["actions"].append({"street": payload["street"], "actor": "bot", "action": "FOLD", "amount": 0})
        return
    if action_name == "CHECK_CALL":
        amount = min(stack, to_call)
        payload["pot"] = pot + amount
        payload["botStack"] = stack - amount
        payload["actions"].append(
            {"street": payload["street"], "actor": "bot", "action": "CALL" if amount else "CHECK", "amount": amount}
        )
        return

    amount = stack if action_name == "ALL_IN" else min(stack, to_call + blind + int(max(pot, blind) * random.uniform(0.45, 0.95)))
    payload["pot"] = pot + amount
    payload["botStack"] = max(0, stack - amount)
    payload["toCall"] = 0
    payload["actions"].append({"street": payload["street"], "actor": "bot", "action": "RAISE", "amount": amount})


def _villain_response(payload: dict[str, Any], opponent_style: str) -> bool:
    if not payload["actions"]:
        return True
    last = payload["actions"][-1]
    if last.get("actor") != "bot" or last.get("action") not in {"RAISE", "CALL"}:
        return True
    if last.get("action") == "CALL":
        payload["actions"].append({"street": payload["street"], "actor": "villain", "action": "CHECK", "amount": 0})
        return True

    fold_chance = {
        "PASSIVE": 0.48,
        "TIGHT_PASSIVE": 0.58,
        "CALLING_STATION": 0.14,
        "AGGRESSIVE": 0.28,
        "UNKNOWN": 0.36,
    }.get(opponent_style, 0.36)
    if random.random() < fold_chance:
        payload["actions"].append({"street": payload["street"], "actor": "villain", "action": "FOLD", "amount": 0})
        return False

    call_amount = min(int(last.get("amount", 0)), max(0, int(payload.get("opponentStack", 0))))
    payload["opponentStack"] = max(0, int(payload.get("opponentStack", 0)) - call_amount)
    payload["pot"] = int(payload.get("pot", 0)) + call_amount
    payload["actions"].append({"street": payload["street"], "actor": "villain", "action": "CALL", "amount": call_amount})
    return True


def sample_hand_situations(hand_id: int | str) -> list[dict[str, Any]]:
    deck = make_deck()
    random.shuffle(deck)
    scenario = random.choices(
        ["premium_preflop", "speculative", "draw_pressure", "value_spot", "trash", "balanced"],
        weights=[0.14, 0.17, 0.22, 0.2, 0.1, 0.17],
        k=1,
    )[0]
    hole = _sample_hole_cards(deck, scenario)
    opponent_hole = [deck.pop(), deck.pop()]
    full_board = [deck.pop() for _ in range(5)]
    blind = random.choice([20, 50, 100])
    players = random.randint(2, 6)
    opponent_style = random.choices(
        ["UNKNOWN", "PASSIVE", "AGGRESSIVE", "TIGHT_PASSIVE", "CALLING_STATION"],
        weights=[3, 2, 2, 1, 1],
        k=1,
    )[0]
    bot_stack = random.randint(35 * blind, 180 * blind)
    opponent_stack = random.randint(25 * blind, 160 * blind)
    pot = blind * random.randint(3, 8)
    actions: list[Any] = []
    rows: list[dict[str, Any]] = []

    for decision_idx, (street, board_count) in enumerate([("PREFLOP", 0), ("FLOP", 3), ("TURN", 4), ("RIVER", 5)]):
        if bot_stack <= 0 or opponent_stack <= 0:
            break
        opening_pressure = {
            "PREFLOP": random.uniform(0.0, 0.35),
            "FLOP": random.uniform(0.0, 0.55),
            "TURN": random.uniform(0.0, 0.75),
            "RIVER": random.uniform(0.0, 0.95),
        }[street]
        if opponent_style == "AGGRESSIVE":
            opening_pressure += 0.18
        if opponent_style == "PASSIVE":
            opening_pressure -= 0.12
        to_call = 0 if random.random() > opening_pressure else random.randint(blind, max(blind, min(bot_stack, int(max(pot, blind) * random.uniform(0.18, 0.9)))))
        if to_call > 0:
            actions.append({"street": street, "actor": "villain", "action": "RAISE", "amount": to_call})

        payload = {
            "gameId": f"sim-hand-{hand_id}",
            "botId": "bot_1",
            "handId": str(hand_id),
            "decisionIndex": decision_idx,
            "street": street,
            "holeCards": list(hole),
            "communityCards": list(full_board[:board_count]),
            "pot": pot,
            "toCall": to_call,
            "botStack": bot_stack,
            "opponentStack": opponent_stack,
            "position": random.choice(["BUTTON", "SMALL_BLIND", "BIG_BLIND", "EARLY", "LATE"]),
            "playersCount": players,
            "actions": list(actions),
            "opponentStyle": opponent_style,
            "opponentHoleCards": [list(opponent_hole)],
            "minRaise": blind,
            "scenario": scenario,
            "source": "hand_simulation",
        }
        rows.append(copy.deepcopy(payload))
        label = label_situation(payload)
        _commit_action(payload, label.label)
        bot_stack = int(payload["botStack"])
        opponent_stack = int(payload["opponentStack"])
        pot = int(payload["pot"])
        actions = list(payload["actions"])
        if label.label == "FOLD" or not _villain_response(payload, opponent_style):
            break
        opponent_stack = int(payload["opponentStack"])
        pot = int(payload["pot"])
        actions = list(payload["actions"])
    return rows


def hand_dataset_rows(hands: int):
    for hand_id in range(1, hands + 1):
        for payload in sample_hand_situations(hand_id):
            yield row_for_payload(payload)


def export_hand_dataset(hands: int, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    rows = hand_dataset_rows(hands)
    first = next(rows)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(first.keys()))
        writer.writeheader()
        writer.writerow(first)
        writer.writerows(rows)


def export_dataset(size: int, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    rows = dataset_rows(size)
    first = next(rows)
    if output.suffix == ".parquet":
        try:
            import pandas as pd
        except ImportError as exc:
            raise RuntimeError("Parquet export requires pandas and pyarrow") from exc
        pd.DataFrame([first, *rows]).to_parquet(output, index=False)
        return

    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(first.keys()))
        writer.writeheader()
        writer.writerow(first)
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate simulated expert poker situations.")
    parser.add_argument("--samples", type=int, default=100_000)
    parser.add_argument("--hands", type=int)
    parser.add_argument("--output", type=Path, default=Path("data/simulated_poker_dataset.csv"))
    parser.add_argument("--seed", type=int, default=1337)
    args = parser.parse_args()
    random.seed(args.seed)
    if args.hands is not None:
        export_hand_dataset(args.hands, args.output)
    else:
        export_dataset(args.samples, args.output)


if __name__ == "__main__":
    main()
