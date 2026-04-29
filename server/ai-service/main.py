from __future__ import annotations

from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

from poker.decision import PUBLIC_ACTIONS, LinearPolicyModel, predict_decision


class PokerPredictRequest(BaseModel):
    gameId: str | None = None
    botId: str | None = None
    street: str = "PREFLOP"
    holeCards: list[Any] = Field(min_length=2, max_length=2)
    communityCards: list[Any] = Field(default_factory=list, max_length=5)
    pot: int = Field(ge=0)
    toCall: int = Field(ge=0)
    botStack: int = Field(ge=0)
    opponentStack: int = Field(ge=0)
    position: str | int = "BUTTON"
    playersCount: int = Field(default=2, ge=2, le=9)
    actions: list[Any] = Field(default_factory=list)
    opponentStyle: str | None = None
    opponentHoleCards: list[list[Any]] = Field(default_factory=list)
    minRaise: int = Field(default=1, ge=1)

    @field_validator("street")
    @classmethod
    def normalize_street(cls, value: str) -> str:
        return value.upper()


class PokerPredictResponse(BaseModel):
    action: Literal["FOLD", "CHECK", "CALL", "RAISE", "ALL_IN"]
    amount: int = Field(ge=0)
    confidence: float = Field(ge=0, le=1)
    style: str = "unknown"
    reason: str


app = FastAPI(title="Quantum Bluff Expert Bot AI", version="1.0.0")
model = LinearPolicyModel.load()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "expert_bot.pt"}


@app.post("/predict/poker", response_model=PokerPredictResponse)
def predict_poker(request: PokerPredictRequest) -> PokerPredictResponse:
    try:
        decision = predict_decision(request.model_dump(), model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="AI prediction failed") from exc

    if decision.action not in PUBLIC_ACTIONS:
        raise HTTPException(status_code=500, detail="AI produced an invalid action")
    return PokerPredictResponse(
        action=decision.action,
        amount=decision.amount,
        confidence=decision.confidence,
        style=decision.style,
        reason=decision.reason,
    )
