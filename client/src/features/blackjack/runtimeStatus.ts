export type BlackjackRuntimeErrorCode =
  | "TABLE_LOCKED"
  | "TABLE_RECOVERING"
  | "TABLE_STATE_STALE"
  | "TABLE_UNAVAILABLE"
  | "TABLE_DB_RUNTIME_MISMATCH"
  | "TABLE_NOT_LOADED_LOCALLY";

export interface BlackjackRuntimeUiState {
  messageKey?: string;
  disableActions: boolean;
  severity: "info" | "warning" | "error";
}

export function mapBlackjackRuntimeCodeToUi(
  code?: string
): BlackjackRuntimeUiState | null {
  if (!code) return null;
  switch (code) {
    case "TABLE_RECOVERING":
      return {
        messageKey: "bjMulti.runtime.tableRecovering",
        disableActions: true,
        severity: "warning",
      };
    case "TABLE_STATE_STALE":
      return {
        messageKey: "bjMulti.runtime.tableStateStale",
        disableActions: true,
        severity: "warning",
      };
    case "TABLE_UNAVAILABLE":
      return {
        messageKey: "bjMulti.runtime.tableUnavailable",
        disableActions: true,
        severity: "error",
      };
    case "TABLE_DB_RUNTIME_MISMATCH":
      return {
        messageKey: "bjMulti.runtime.tableMismatch",
        disableActions: true,
        severity: "error",
      };
    case "TABLE_NOT_LOADED_LOCALLY":
      return {
        messageKey: "bjMulti.runtime.tableNotLoadedLocally",
        disableActions: true,
        severity: "info",
      };
    case "TABLE_LOCKED":
      return {
        messageKey: "bjMulti.runtime.tableLocked",
        disableActions: false,
        severity: "info",
      };
    default:
      return {
        messageKey: "bjMulti.runtime.unknown",
        disableActions: true,
        severity: "warning",
      };
  }
}

