// @flow

export const STATE_BLOCKED = "STATE_BLOCKED";
export const STATE_KEEPING = "STATE_KEEPING";
export const STATE_ACCEPTED = "STATE_ACCEPTED";
export const STATE_DEDUPED = "STATE_DEDUPED";

export type StateBlocked = "STATE_BLOCKED";
export type StateKeeping = "STATE_KEEPING";
export type StateAccepted = "STATE_ACCEPTED";
export type StateDeduped = "STATE_DEDUPED";

export type FileState =
  | StateBlocked
  | StateKeeping
  | StateAccepted
  | StateDeduped;
