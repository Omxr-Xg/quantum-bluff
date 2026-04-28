import json

from poker.replay_real_matches import replay


def test_replay_json_payload(tmp_path):
    input_path = tmp_path / "matches.json"
    output_path = tmp_path / "report.csv"
    input_path.write_text(
        json.dumps(
            [
                {
                    "action": "CALL",
                    "payload": {
                        "street": "FLOP",
                        "holeCards": ["Ah", "Kd"],
                        "communityCards": ["Qs", "Jc", "2d"],
                        "pot": 450,
                        "toCall": 100,
                        "botStack": 1200,
                        "opponentStack": 900,
                        "position": "BUTTON",
                        "playersCount": 2,
                        "actions": [],
                        "minRaise": 100,
                    },
                }
            ]
        ),
        encoding="utf-8",
    )
    rows = replay(input_path, output_path)
    assert len(rows) == 1
    assert output_path.exists()
    assert rows[0]["valid_shape"] is True
