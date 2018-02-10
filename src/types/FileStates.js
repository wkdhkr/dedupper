// @flow

export const STATE_GROUPED = "STATE_GROUPED";
export const STATE_ACCEPTED = "STATE_ACCEPTED";
export const STATE_DEDUPED = "STATE_DEDUPED";
export const STATE_REPLACED = "STATE_REPLACED";

export type FileState =
  | "STATE_GROUPED"
  | "STATE_ACCEPTED"
  | "STATE_DEDUPED"
  | "STATE_REPLACED";
