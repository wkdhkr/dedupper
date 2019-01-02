// @flow

export const TYPE_ARCHIVE = "TYPE_ARCHIVE";
export const TYPE_IMAGE = "TYPE_IMAGE";
export const TYPE_VIDEO = "TYPE_VIDEO";
export const TYPE_AUDIO = "TYPE_AUDIO";
export const TYPE_TEXT = "TYPE_TEXT";
export const TYPE_SCRAP = "TYPE_SCRAP";
export const TYPE_UNKNOWN = "TYPE_UNKNOWN";
export const TYPE_DEDUPPER_LOCK = "TYPE_DEDUPPER_LOCK";
export const TYPE_DEDUPPER_CACHE = "TYPE_DEDUPPER_CACHE";

export type ClassifyType =
  | "TYPE_ARCHIVE"
  | "TYPE_IMAGE"
  | "TYPE_VIDEO"
  | "TYPE_AUDIO"
  | "TYPE_TEXT"
  | "TYPE_SCRAP"
  | "TYPE_UNKNOWN"
  | "TYPE_DEDUPPER_LOCK"
  | "TYPE_DEDUPPER_CACHE";
