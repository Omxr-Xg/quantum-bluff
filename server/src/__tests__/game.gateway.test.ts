import { jest } from "@jest/globals";
import { GameGateway } from "../sockets/game.gateway.js";
import { activeGames } from "../shared/activeGames.js";
import type { GameTable } from "../logic/GameTable.js";

describe("GameGateway - timeout / auto-FOLD", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    activeGames.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    activeGames.clear();
    jest.useRealTimers();
  });

  test("auto-FOLD après 30 secondes d’inactivité", () => {
    const roomEmitter = {
      emit: jest.fn(),
    };

    const ioMock = {
      on: jest.fn(),
      to: jest.fn(() => roomEmitter),
    } as any;

    const gateway = new GameGateway(ioMock);

    const fakeGame = {
      state: {
        currentTurn: "p1",
      },
      handlePlayerAction: jest.fn(),
      getSanitizedState: jest.fn(() => ({
        id: "room1",
        phase: "PREFLOP",
        pot: 30,
      })),
    };

    activeGames.set("room1", fakeGame as unknown as GameTable);
    (gateway as any).startTurnTimer("room1");

    expect(ioMock.to).toHaveBeenCalledWith("room1");
    expect(roomEmitter.emit).toHaveBeenCalledWith("TURN_TIMER", {
      gameId: "room1",
      timeLeft: 30,
    });

    jest.advanceTimersByTime(30000);

    expect(fakeGame.handlePlayerAction).toHaveBeenCalledWith("p1", "FOLD");
    expect(fakeGame.getSanitizedState).toHaveBeenCalled();
    expect(roomEmitter.emit).toHaveBeenCalledWith("GAME_UPDATE", {
      id: "room1",
      phase: "PREFLOP",
      pot: 30,
    });
  });
});
