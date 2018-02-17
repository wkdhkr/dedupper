// @flow

export const STATE_BLOCKED = "STATE_BLOCKED";
export const STATE_GROUPED = "STATE_GROUPED";
export const STATE_ACCEPTED = "STATE_ACCEPTED";
export const STATE_DEDUPED = "STATE_DEDUPED";

export type FileState =
  | "STATE_BLOCKED"
  | "STATE_GROUPED"
  | "STATE_ACCEPTED"
  | "STATE_DEDUPED";
