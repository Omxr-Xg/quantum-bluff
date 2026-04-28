from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from .features import FEATURE_NAMES
from .simulator import generate_dataset
from .expert_rules import LABELS


class ExpertPolicy(nn.Module):
    def __init__(self, input_size: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, 48),
            nn.ReLU(),
            nn.Dropout(0.08),
            nn.Linear(48, 24),
            nn.ReLU(),
            nn.Linear(24, 4),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def _load_dataset(path: Path) -> tuple[list[list[float]], list[int]]:
    rows: list[list[float]] = []
    labels: list[int] = []
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        feature_columns = [f"f_{idx}" for idx in range(len(FEATURE_NAMES))]
        for row in reader:
            rows.append([float(row[column]) for column in feature_columns])
            labels.append(int(row["label"]))
    return rows, labels


def _split(rows: list[list[float]], labels: list[int], validation_ratio: float, seed: int):
    indices = list(range(len(rows)))
    random.Random(seed).shuffle(indices)
    cut = max(1, int(len(indices) * (1 - validation_ratio)))
    train_idx = indices[:cut]
    validation_idx = indices[cut:] or indices[-1:]
    return (
        [rows[idx] for idx in train_idx],
        [labels[idx] for idx in train_idx],
        [rows[idx] for idx in validation_idx],
        [labels[idx] for idx in validation_idx],
    )


def _evaluate(model: ExpertPolicy, x: torch.Tensor, y: torch.Tensor) -> dict:
    model.eval()
    with torch.no_grad():
        logits = model(x)
        loss = nn.CrossEntropyLoss()(logits, y).item()
        pred = logits.argmax(dim=1)
        accuracy = (pred == y).float().mean().item()
        matrix = [[0 for _ in LABELS] for _ in LABELS]
        for expected, actual in zip(y.tolist(), pred.tolist()):
            matrix[expected][actual] += 1
    model.train()
    return {"loss": loss, "accuracy": accuracy, "confusion_matrix": matrix}


def _linear_layer(layer: nn.Linear) -> dict:
    return {
        "weights": layer.weight.detach().tolist(),
        "bias": layer.bias.detach().tolist(),
    }


def train(samples: int, epochs: int, output: Path, dataset: Path | None = None, metrics_output: Path | None = None) -> None:
    rows, labels = _load_dataset(dataset) if dataset else generate_dataset(samples)
    train_rows, train_labels, validation_rows, validation_labels = _split(rows, labels, 0.2, 1337)
    train_x = torch.tensor(train_rows, dtype=torch.float32)
    train_y = torch.tensor(train_labels, dtype=torch.long)
    validation_x = torch.tensor(validation_rows, dtype=torch.float32)
    validation_y = torch.tensor(validation_labels, dtype=torch.long)
    loader = DataLoader(TensorDataset(train_x, train_y), batch_size=256, shuffle=True)
    model = ExpertPolicy(len(FEATURE_NAMES))
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.01, weight_decay=0.001)
    loss_fn = nn.CrossEntropyLoss()
    history = []

    for epoch in range(epochs):
        for batch_x, batch_y in loader:
            optimizer.zero_grad()
            loss = loss_fn(model(batch_x), batch_y)
            loss.backward()
            optimizer.step()
        history.append({"epoch": epoch + 1, **_evaluate(model, validation_x, validation_y)})

    layers = [module for module in model.net if isinstance(module, nn.Linear)]
    artifact = {
        "format": "quantum-bluff-mlp-policy-v2",
        "input_size": len(FEATURE_NAMES),
        "feature_names": list(FEATURE_NAMES),
        "actions": list(LABELS),
        "layers": [_linear_layer(layer) for layer in layers],
        "training": {
            "samples": len(rows),
            "train_samples": len(train_rows),
            "validation_samples": len(validation_rows),
            "epochs": epochs,
            "label_source": "simulated expert_rules.py",
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    metrics = {
        "labels": list(LABELS),
        "final": history[-1] if history else _evaluate(model, validation_x, validation_y),
        "history": history,
    }
    target_metrics = metrics_output or output.with_name("training_metrics.json")
    target_metrics.write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Quantum Bluff expert poker bot policy.")
    parser.add_argument("--samples", type=int, default=50_000)
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--dataset", type=Path)
    parser.add_argument("--output", type=Path, default=Path("model/expert_bot.pt"))
    parser.add_argument("--metrics-output", type=Path)
    args = parser.parse_args()
    train(args.samples, args.epochs, args.output, args.dataset, args.metrics_output)


if __name__ == "__main__":
    main()
