// @flow

export const TYPE_KEEP_DEDUPPER_FILE = "TYPE_KEEP_DEDUPPER_FILE";
export const TYPE_SWEEP_DEDUPPER_FILE = "TYPE_SWEEP_DEDUPPER_FILE";
export const TYPE_UNKNOWN_FILE_TYPE = "TYPE_UNKNOWN_FILE_TYPE";
export const TYPE_SCRAP_FILE_TYPE = "TYPE_SCRAP_FILE_TYPE";
export const TYPE_NG_FILE_NAME = "TYPE_NG_FILE_NAME";
export const TYPE_NG_DIR_PATH = "TYPE_NG_DIR_PATH";
export const TYPE_DAMAGED = "TYPE_DAMAGED";
export const TYPE_LOW_FILE_SIZE = "TYPE_LOW_FILE_SIZE";
export const TYPE_LOW_RESOLUTION = "TYPE_LOW_RESOLUTION";
export const TYPE_LOW_LONG_SIDE = "TYPE_LOW_LONG_SIDE";
export const TYPE_HASH_MATCH = "TYPE_HASH_MATCH";
export const TYPE_HASH_MATCH_RELOCATE = "TYPE_HASH_MATCH_RELOCATE";
export const TYPE_HASH_MISMATCH_RELOCATE = "TYPE_HASH_MISMATCH_RELOCATE";
export const TYPE_P_HASH_MATCH = "TYPE_P_HASH_MATCH";
export const TYPE_P_HASH_REJECT_LOW_FILE_SIZE =
  "TYPE_P_HASH_REJECT_LOW_FILE_SIZE";
export const TYPE_P_HASH_REJECT_LOW_RESOLUTION =
  "TYPE_P_HASH_REJECT_LOW_RESOLUTION";
export const TYPE_P_HASH_REJECT_LOW_QUALITY = "TYPE_P_HASH_REJECT_LOW_QUALITY";
export const TYPE_P_HASH_REJECT_DIFFERENT_MEAN =
  "TYPE_P_HASH_REJECT_DIFFERENT_MEAN";
export const TYPE_P_HASH_REJECT_LOW_ENTROPY = "TYPE_P_HASH_REJECT_LOW_ENTROPY";
export const TYPE_P_HASH_MAY_BE = "TYPE_P_HASH_MAY_BE";
export const TYPE_P_HASH_MATCH_LOST_FILE = "TYPE_P_HASH_MATCH_LOST_FILE";
export const TYPE_P_HASH_REJECT_NEWER = "TYPE_P_HASH_REJECT_NEWER";
export const TYPE_NO_PROBLEM = "TYPE_NO_PROBLEM";
export const TYPE_PROCESS_ERROR = "TYPE_PROCESS_ERROR";
export const TYPE_FILE_MARK_BLOCK = "TYPE_FILE_MARK_BLOCK";
export const TYPE_FILE_MARK_ERASE = "TYPE_FILE_MARK_ERASE";
export const TYPE_FILE_MARK_DEDUPE = "TYPE_FILE_MARK_DEDUPE";
export const TYPE_FILE_MARK_HOLD = "TYPE_FILE_MARK_HOLD";
export const TYPE_FILE_MARK_SAVE = "TYPE_FILE_MARK_SAVE";
export const TYPE_FILE_MARK_REPLACE = "TYPE_FILE_MARK_REPLACE";
export const TYPE_DEEP_LEARNING = "TYPE_DEEP_LEARNING";

export type ReasonType =
  | "TYPE_KEEP_DEDUPPER_FILE"
  | "TYPE_SWEEP_DEDUPPER_FILE"
  | "TYPE_UNKNOWN_FILE_TYPE"
  | "TYPE_SCRAP_FILE_TYPE"
  | "TYPE_NG_FILE_NAME"
  | "TYPE_NG_DIR_PATH"
  | "TYPE_DAMAGED"
  | "TYPE_LOW_FILE_SIZE"
  | "TYPE_LOW_RESOLUTION"
  | "TYPE_LOW_LONG_SIDE"
  | "TYPE_HASH_MATCH"
  | "TYPE_HASH_MATCH_RELOCATE"
  | "TYPE_HASH_MISMATCH_RELOCATE"
  | "TYPE_P_HASH_MATCH"
  | "TYPE_P_HASH_REJECT_LOW_FILE_SIZE"
  | "TYPE_P_HASH_REJECT_LOW_RESOLUTION"
  | "TYPE_P_HASH_REJECT_LOW_QUALITY"
  | "TYPE_P_HASH_REJECT_DIFFERENT_MEAN"
  | "TYPE_P_HASH_REJECT_LOW_ENTROPY"
  | "TYPE_P_HASH_MAY_BE"
  | "TYPE_P_HASH_MATCH_LOST_FILE"
  | "TYPE_P_HASH_REJECT_NEWER"
  | "TYPE_NO_PROBLEM"
  | "TYPE_PROCESS_ERROR"
  | "TYPE_FILE_MARK_BLOCK"
  | "TYPE_FILE_MARK_ERASE"
  | "TYPE_FILE_MARK_DEDUPE"
  | "TYPE_FILE_MARK_HOLD"
  | "TYPE_FILE_MARK_SAVE"
  | "TYPE_FILE_MARK_REPLACE"
  | "TYPE_DEEP_LEARNING";
