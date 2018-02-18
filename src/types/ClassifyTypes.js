// @flow

export const TYPE_IMAGE = "TYPE_IMAGE";
export const TYPE_VIDEO = "TYPE_VIDEO";
export const TYPE_SCRAP = "TYPE_SCRAP";
export const TYPE_UNKNOWN = "TYPE_UNKNOWN";
export const TYPE_DEDUPPER_LOCK = "TYPE_DEDUPPER_LOCK";
export const TYPE_DEDUPPER_CACHE = "TYPE_DEDUPPER_CACHE";

export type ClassifyType =
  | "TYPE_IMAGE"
  | "TYPE_VIDEO"
  | "TYPE_SCRAP"
  | "TYPE_UNKNOWN"
  | "TYPE_DEDUPPER_LOCK"
  | "TYPE_DEDUPPER_CACHE";
