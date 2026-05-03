from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

from .decision import predict_decision


def _load_records(path: Path) -> list[dict[str, Any]]:
    if path.suffix == ".json":
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, list) else raw.get("situations", [])

    with path.open("r", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _payload_from_record(record: dict[str, Any]) -> dict[str, Any]:
    if "payload" in record and record["payload"]:
        return json.loads(record["payload"]) if isinstance(record["payload"], str) else record["payload"]
    return record


def _comment(real_action: str, ai_action: str) -> str:
    if real_action == ai_action:
        return "same action"
    if ai_action == "FOLD":
        return "AI chooses lower-risk fold"
    if ai_action in {"RAISE", "ALL_IN"}:
        return "AI chooses more aggressive pressure"
    return "AI prefers pot-control/call line"


def replay(input_path: Path, output_path: Path) -> list[dict[str, Any]]:
    records = _load_records(input_path)
    rows = []
    for idx, record in enumerate(records, start=1):
        payload = _payload_from_record(record)
        decision = predict_decision(payload)
        real_action = str(record.get("action") or record.get("realAction") or record.get("actionType") or "UNKNOWN").upper()
        rows.append(
            {
                "situation": idx,
                "street": payload.get("street"),
                "real_action": real_action,
                "ai_action": decision.action,
                "ai_amount": decision.amount,
                "confidence": round(decision.confidence, 4),
                "style": decision.style,
                "valid_shape": decision.action in {"FOLD", "CHECK", "CALL", "RAISE", "ALL_IN"},
                "comment": _comment(real_action, decision.action),
            }
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()) if rows else ["situation"])
        writer.writeheader()
        writer.writerows(rows)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay real match situations through the Expert AI without training on them.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("model/real_match_replay.csv"))
    args = parser.parse_args()
    rows = replay(args.input, args.output)
    print(f"Replayed {len(rows)} situations into {args.output}")


if __name__ == "__main__":
    main()
