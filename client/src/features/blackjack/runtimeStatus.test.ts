import {
  mapBlackjackRuntimeCodeToUi,
  type BlackjackRuntimeUiState,
} from "./runtimeStatus";

function expectState(
  state: BlackjackRuntimeUiState | null,
  expected: Partial<BlackjackRuntimeUiState> & { messageKey: string }
) {
  expect(state).not.toBeNull();
  expect(state?.messageKey).toBe(expected.messageKey);
  if (typeof expected.disableActions === "boolean") {
    expect(state?.disableActions).toBe(expected.disableActions);
  }
  if (expected.severity) {
    expect(state?.severity).toBe(expected.severity);
  }
}

describe("runtimeStatus mapping", () => {
  it("maps TABLE_RECOVERING to warning and disables actions", () => {
    const state = mapBlackjackRuntimeCodeToUi("TABLE_RECOVERING");
    expectState(state, {
      messageKey: "bjMulti.runtime.tableRecovering",
      disableActions: true,
      severity: "warning",
    });
  });

  it("maps TABLE_LOCKED to info without disabling actions", () => {
    const state = mapBlackjackRuntimeCodeToUi("TABLE_LOCKED");
    expectState(state, {
      messageKey: "bjMulti.runtime.tableLocked",
      disableActions: false,
      severity: "info",
    });
  });

  it("maps unknown code to fallback and disables actions", () => {
    const state = mapBlackjackRuntimeCodeToUi("TABLE_FUTURE_NEW_CODE");
    expectState(state, {
      messageKey: "bjMulti.runtime.unknown",
      disableActions: true,
      severity: "warning",
    });
  });

  it("returns null when code is undefined", () => {
    expect(mapBlackjackRuntimeCodeToUi(undefined)).toBeNull();
  });
});

