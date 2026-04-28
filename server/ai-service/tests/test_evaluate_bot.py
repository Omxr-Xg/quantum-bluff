from poker.evaluate_bot import evaluate


def test_evaluate_returns_core_metrics():
    report = evaluate(10)
    assert report["samples"] == 10
    assert 0 <= report["teacher_agreement"] <= 1
    assert report["average_decision_latency_ms"] >= 0
    assert "ai_action_distribution" in report
