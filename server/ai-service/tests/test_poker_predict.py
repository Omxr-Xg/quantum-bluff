from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def base_payload(**overrides):
    payload = {
        "gameId": "test",
        "botId": "bot_1",
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
    }
    payload.update(overrides)
    return payload


def test_prediction_returns_valid_action():
    response = client.post("/predict/poker", json=base_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["action"] in {"FOLD", "CHECK", "CALL", "RAISE", "ALL_IN"}
    assert 0 <= body["confidence"] <= 1


def test_weak_hand_can_fold_against_bad_price():
    response = client.post(
        "/predict/poker",
        json=base_payload(
            street="RIVER",
            holeCards=["2h", "7d"],
            communityCards=["Qs", "Jc", "9d", "4s", "3c"],
            pot=300,
            toCall=900,
            botStack=1000,
        ),
    )
    assert response.status_code == 200
    assert response.json()["action"] in {"FOLD", "CALL", "ALL_IN"}


def test_strong_hand_is_aggressive_or_calls():
    response = client.post(
        "/predict/poker",
        json=base_payload(
            street="RIVER",
            holeCards=["Ah", "Ad"],
            communityCards=["As", "Ac", "2d", "7s", "9h"],
            pot=900,
            toCall=100,
            botStack=2000,
        ),
    )
    assert response.status_code == 200
    assert response.json()["action"] in {"CALL", "RAISE", "ALL_IN"}
