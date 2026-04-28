from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from pathlib import Path

from .decision import predict_decision
from .expert_rules import label_situation
from .features import build_features
from .simulator import sample_situation


def baseline_action(payload: dict) -> str:
    _, ctx = build_features(payload)
    if ctx.hand_strength > 0.74:
        return "RAISE"
    if float(payload.get("toCall", 0)) <= 0:
        return "CHECK_CALL"
    if ctx.hand_strength > ctx.pot_odds + 0.04:
        return "CHECK_CALL"
    return "FOLD"


def evaluate(samples: int) -> dict:
    ai_actions: Counter[str] = Counter()
    baseline_actions: Counter[str] = Counter()
    labels: Counter[str] = Counter()
    latencies: list[float] = []
    agrees_with_teacher = 0
    aggression_points = 0

    for _ in range(samples):
        payload = sample_situation()
        teacher = label_situation(payload)
        start = time.perf_counter()
        decision = predict_decision(payload)
        latencies.append((time.perf_counter() - start) * 1000)
        normalized_ai = "CHECK_CALL" if decision.action in {"CHECK", "CALL"} else decision.action
        ai_actions[normalized_ai] += 1
        baseline_actions[baseline_action(payload)] += 1
        labels[teacher.label] += 1
        if normalized_ai == teacher.label:
            agrees_with_teacher += 1
        if decision.action in {"RAISE", "ALL_IN"}:
            aggression_points += 2
        elif decision.action in {"CALL", "CHECK"}:
            aggression_points += 1

    return {
        "samples": samples,
        "teacher_agreement": agrees_with_teacher / max(samples, 1),
        "average_decision_latency_ms": sum(latencies) / max(len(latencies), 1),
        "max_decision_latency_ms": max(latencies, default=0),
        "ai_action_distribution": dict(ai_actions),
        "baseline_action_distribution": dict(baseline_actions),
        "teacher_label_distribution": dict(labels),
        "aggression_factor": aggression_points / max(samples, 1),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate Python Expert AI against a simple old-bot baseline.")
    parser.add_argument("--samples", type=int, default=1000)
    parser.add_argument("--output", type=Path, default=Path("model/evaluation_report.json"))
    args = parser.parse_args()
    report = evaluate(args.samples)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
