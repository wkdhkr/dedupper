// @flow

/** delete and memory as block state. */
export const MARK_BLOCK = "MARK_BLOCK";
/** delete file. */
export const MARK_ERASE = "MARK_ERASE";
/** do nothing. */
export const MARK_HOLD = "MARK_HOLD";
/** delete and memory as dedupe state. */
export const MARK_DEDUPE = "MARK_DEDUPE";
/** import file. */
export const MARK_SAVE = "MARK_SAVE";
/** replace file. destination path is old path. */
export const MARK_REPLACE = "MARK_REPLACE";
/** replace file. destination path is new path. */
export const MARK_TRANSFER = "MARK_TRANSFER";

export type FileNameMark =
  | "MARK_BLOCK"
  | "MARK_ERASE"
  | "MARK_HOLD"
  | "MARK_DEDUPE"
  | "MARK_SAVE"
  | "MARK_REPLACE"
  | "MARK_TRANSFER";
