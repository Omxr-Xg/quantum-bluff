export type PokerActionType = "FOLD" | "CALL" | "RAISE" | "CHECK";

export interface PokerActionPayload {
  gameId: string;
  handId?: string;
  playerId: string;
  actionType: PokerActionType;
  amount?: number;
  actionId?: string;
  expectedStreet?: string;
}

export type PokerActionErrorCode =
  | "UNAUTHORIZED"
  | "GAME_NOT_FOUND"
  | "NOT_YOUR_TURN"
  | "INVALID_ACTION"
  | "INVALID_RAISE"
  | "DUPLICATE_ACTION"
  | "STALE_ACTION"
  | "TABLE_NOT_LOADED_LOCALLY"
  | "ACTION_ERROR";

export interface PokerActionError {
  code: PokerActionErrorCode;
  message: string;
  httpStatus?: number;
}
