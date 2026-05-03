from poker.expert_rules import label_situation


def payload(**overrides):
    base = {
        "street": "FLOP",
        "holeCards": ["Ah", "Ad"],
        "communityCards": ["As", "2d", "7c"],
        "pot": 600,
        "toCall": 100,
        "botStack": 1000,
        "opponentStack": 900,
        "position": "BUTTON",
        "playersCount": 2,
        "actions": [],
        "opponentStyle": "UNKNOWN",
        "minRaise": 100,
    }
    base.update(overrides)
    return base


def test_strong_short_stack_can_all_in():
    label = label_situation(payload(botStack=700, opponentStack=650))
    assert label.label in {"ALL_IN", "RAISE"}
    assert label.confidence > 0.7


def test_weak_hand_folds_to_large_call():
    label = label_situation(
        payload(
            street="RIVER",
            holeCards=["2h", "7d"],
            communityCards=["Qs", "Jc", "9d", "4s", "3c"],
            pot=300,
            toCall=900,
            botStack=1000,
        )
    )
    assert label.label == "FOLD"


def test_draw_calls_with_price():
    label = label_situation(
        payload(
            street="FLOP",
            holeCards=["Ah", "Kh"],
            communityCards=["2h", "7h", "9c"],
            pot=800,
            toCall=80,
            botStack=2000,
        )
    )
    assert label.label in {"CHECK_CALL", "RAISE"}
