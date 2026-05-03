from poker.hand_evaluator import evaluate_hand, parse_card


def cards(*tokens: str):
    return [parse_card(token) for token in tokens]


def assert_category(hole, board, expected):
    result = evaluate_hand(cards(*hole), cards(*board))
    assert result.category == expected
    assert 0 <= result.normalized_score <= 1


def test_pair():
    assert_category(["Ah", "Ad"], ["2c", "7s", "9d"], "PAIR")


def test_two_pair():
    assert_category(["Ah", "Ad"], ["2c", "2s", "9d", "Jh", "Qc"], "TWO_PAIR")


def test_three_of_a_kind():
    assert_category(["Ah", "Ad"], ["Ac", "2s", "9d", "Jh", "Qc"], "THREE_OF_A_KIND")


def test_straight():
    assert_category(["Ah", "Kd"], ["Qs", "Jc", "10d", "2h", "3s"], "STRAIGHT")


def test_flush():
    assert_category(["Ah", "Kh"], ["2h", "7h", "9h", "Jc", "Qs"], "FLUSH")


def test_full_house():
    assert_category(["Ah", "Ad"], ["Ac", "2s", "2d", "Jh", "Qc"], "FULL_HOUSE")


def test_four_of_a_kind():
    assert_category(["Ah", "Ad"], ["Ac", "As", "2d", "Jh", "Qc"], "FOUR_OF_A_KIND")


def test_straight_flush():
    assert_category(["Ah", "Kh"], ["Qh", "Jh", "10h", "2d", "3s"], "STRAIGHT_FLUSH")


def test_draw_signals():
    result = evaluate_hand(cards("Ah", "Kh"), cards("2h", "7h", "9c"))
    assert result.flush_draw is True
    assert result.overcards == 2
