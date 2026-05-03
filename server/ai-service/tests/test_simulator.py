from pathlib import Path

from poker.simulator import export_dataset, generate_dataset, sample_situation


def test_sample_situation_has_required_fields():
    payload = sample_situation()
    assert len(payload["holeCards"]) == 2
    assert payload["street"] in {"PREFLOP", "FLOP", "TURN", "RIVER"}
    assert payload["playersCount"] >= 2


def test_generate_dataset_shapes():
    rows, labels = generate_dataset(10)
    assert len(rows) == 10
    assert len(labels) == 10
    assert all(label in {0, 1, 2, 3} for label in labels)


def test_export_dataset_csv(tmp_path: Path):
    output = tmp_path / "dataset.csv"
    export_dataset(5, output)
    text = output.read_text(encoding="utf-8")
    assert "label_name" in text
    assert len(text.splitlines()) == 6
