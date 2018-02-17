// @flow

export const MARK_BLOCK = "MARK_BLOCK";
export const MARK_ERASE = "MARK_ERASE";
export const MARK_HOLD = "MARK_HOLD";
export const MARK_DEDUPE = "MARK_DEDUPE";
export const MARK_SAVE = "MARK_SAVE";
export const MARK_REPLACE = "MARK_REPLACE";

export type FileNameMark =
  | "MARK_BLOCK"
  | "MARK_ERASE"
  | "MARK_HOLD"
  | "MARK_DEDUPE"
  | "MARK_SAVE"
  | "MARK_REPLACE";
