from __future__ import annotations

import argparse
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


def sample_situation() -> dict[str, Any]:
    deck = make_deck()
    random.shuffle(deck)
    street = random.choices(STREETS, weights=[0.38, 0.28, 0.2, 0.14], k=1)[0]
    board_count = {"PREFLOP": 0, "FLOP": 3, "TURN": 4, "RIVER": 5}[street]
    hole = [deck.pop(), deck.pop()]
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
    pot = max(blind * 2, int(random.uniform(2, 28) * blind * random.uniform(0.8, players / 2)))
    to_call = 0 if random.random() < 0.42 else random.randint(blind, max(blind, min(bot_stack, int(pot * random.uniform(0.15, 1.25)))))
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
        "minRaise": blind,
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
        yield row


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
    parser.add_argument("--output", type=Path, default=Path("data/simulated_poker_dataset.csv"))
    args = parser.parse_args()
    export_dataset(args.samples, args.output)


if __name__ == "__main__":
    main()
