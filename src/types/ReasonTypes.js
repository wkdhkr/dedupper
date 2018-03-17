// @flow

/** The file is archive. extracted. */
export const TYPE_ARCHIVE_EXTRACT = "TYPE_ARCHIVE_EXRACT";
/** The file name matched. May be delete. */
export const TYPE_FILE_NAME_MATCH = "TYPE_FILE_NAME_MATCH";
/** Keep cache file still available. */
export const TYPE_KEEP_DEDUPPER_FILE = "TYPE_KEEP_DEDUPPER_FILE";
/** Delete files for Dedupper as they are no longer needed. */
export const TYPE_SWEEP_DEDUPPER_FILE = "TYPE_SWEEP_DEDUPPER_FILE";
/** Unknown file type. ignore. */
export const TYPE_UNKNOWN_FILE_TYPE = "TYPE_UNKNOWN_FILE_TYPE";
/** Scrap file type. delete. */
export const TYPE_SCRAP_FILE_TYPE = "TYPE_SCRAP_FILE_TYPE";
/** NG file name. delete. */
export const TYPE_NG_FILE_NAME = "TYPE_NG_FILE_NAME";
/** NG directory path. delete. */
export const TYPE_NG_DIR_PATH = "TYPE_NG_DIR_PATH";
/** Damaged file. delete. */
export const TYPE_DAMAGED = "TYPE_DAMAGED";
/** Low file size. delete. */
export const TYPE_LOW_FILE_SIZE = "TYPE_LOW_FILE_SIZE";
/** Low resolution file. delete. */
export const TYPE_LOW_RESOLUTION = "TYPE_LOW_RESOLUTION";
/** Low long side pixel file. delete. */
export const TYPE_LOW_LONG_SIDE = "TYPE_LOW_LONG_SIDE";
/** The hash value matched. Delete. */
export const TYPE_HASH_MATCH = "TYPE_HASH_MATCH";
/** The hash value matched. Relocate. */
export const TYPE_HASH_MATCH_RELOCATE = "TYPE_HASH_MATCH_RELOCATE";
/** There is no record whose hash value matches. do nothing. */
export const TYPE_HASH_MISMATCH_RELOCATE = "TYPE_HASH_MISMATCH_RELOCATE";
/** pHash matched. */
export const TYPE_P_HASH_MATCH = "TYPE_P_HASH_MATCH";
/** Low file size. delete. */
export const TYPE_P_HASH_REJECT_LOW_FILE_SIZE =
  "TYPE_P_HASH_REJECT_LOW_FILE_SIZE";
/** Low resolution file. delete. */
export const TYPE_P_HASH_REJECT_LOW_RESOLUTION =
  "TYPE_P_HASH_REJECT_LOW_RESOLUTION";
/** Low quality file. delete. */
export const TYPE_P_HASH_REJECT_LOW_QUALITY = "TYPE_P_HASH_REJECT_LOW_QUALITY";
/** Different mean file. save. */
export const TYPE_P_HASH_REJECT_DIFFERENT_MEAN =
  "TYPE_P_HASH_REJECT_DIFFERENT_MEAN";
/** Low entropy file. delete. */
export const TYPE_P_HASH_REJECT_LOW_ENTROPY = "TYPE_P_HASH_REJECT_LOW_ENTROPY";
/** pHash matched. Maybe the same image. */
export const TYPE_P_HASH_MAY_BE = "TYPE_P_HASH_MAY_BE";
/** pHash matched. But matched images no longer exist. */
export const TYPE_P_HASH_MATCH_LOST_FILE = "TYPE_P_HASH_MATCH_LOST_FILE";
/** pHash matched. To erase with a new one. */
export const TYPE_P_HASH_REJECT_NEWER = "TYPE_P_HASH_REJECT_NEWER";
/** no problem. Import. */
export const TYPE_NO_PROBLEM = "TYPE_NO_PROBLEM";
/** Processing failed. do nothing. */
export const TYPE_PROCESS_ERROR = "TYPE_PROCESS_ERROR";
/** delete file. */
export const TYPE_FILE_MARK_ERASE = "TYPE_FILE_MARK_ERASE";
/** delete file. */
export const TYPE_FILE_MARK_BLOCK = "TYPE_FILE_MARK_BLOCK";
/** delete file and memory hash. */
export const TYPE_FILE_MARK_DEDUPE = "TYPE_FILE_MARK_DEDUPE";
/** do nothing. */
export const TYPE_FILE_MARK_HOLD = "TYPE_FILE_MARK_HOLD";
/** no problem. Import. */
export const TYPE_FILE_MARK_SAVE = "TYPE_FILE_MARK_SAVE";
/** replace file. destination path is old path. */
export const TYPE_FILE_MARK_REPLACE = "TYPE_FILE_MARK_REPLACE";
/** replace file. destination path is new path. */
export const TYPE_FILE_MARK_TRANSFER = "TYPE_FILE_MARK_TRANSFER";
/** rejected by deep learning */
export const TYPE_DEEP_LEARNING = "TYPE_DEEP_LEARNING";
/** It is probably the same image, but it is specified as "keeping" so save it without replacing it. */
export const TYPE_P_HASH_MATCH_KEEPING = "TYPE_P_HASH_MATCH_KEEPING";
/** It is probably the same image, but it is specified as keeping so save it without deleting it. */
export const TYPE_P_HASH_MATCH_WILL_KEEP = "TYPE_P_HASH_MATCH_WILL_KEEP";
/** Probably it is the same image, but because it is specified as keeping, transfer it without deleting it. */
export const TYPE_P_HASH_MATCH_TRANSFER = "TYPE_P_HASH_MATCH_TRANSFER";
/** replace file. destination path is new path. */
export const TYPE_HASH_MATCH_TRANSFER = "TYPE_HASH_MATCH_TRANSFER";

export type ReasonType =
  | "TYPE_ARCHIVE_EXRACT"
  | "TYPE_FILE_NAME_MATCH"
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
  | "TYPE_FILE_MARK_TRANSFER"
  | "TYPE_DEEP_LEARNING"
  | "TYPE_P_HASH_MATCH_KEEPING"
  | "TYPE_P_HASH_MATCH_WILL_KEEP"
  | "TYPE_P_HASH_MATCH_TRANSFER"
  | "TYPE_HASH_MATCH_TRANSFER";
