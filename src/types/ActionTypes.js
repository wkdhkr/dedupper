// @flow

/** do nothing */
export const TYPE_HOLD = "TYPE_HOLD";
/** delete file */
export const TYPE_DELETE = "TYPE_DELETE";
/** import file */
export const TYPE_SAVE = "TYPE_SAVE";
/** replace file */
export const TYPE_REPLACE = "TYPE_REPLACE";
/** relocate file */
export const TYPE_RELOCATE = "TYPE_RELOCATE";
/** transfer file */
export const TYPE_TRANSFER = "TYPE_TRANSFER";

export type ActionType =
  | "TYPE_HOLD"
  | "TYPE_DELETE"
  | "TYPE_SAVE"
  | "TYPE_REPLACE"
  | "TYPE_RELOCATE"
  | "TYPE_TRANSFER";
