// @flow

/**
 * Images that are not saved, can not meet the criteria, and are blocked.
 * Excluded from searching for pHash deduplication.
 */
export const STATE_BLOCKED = "STATE_BLOCKED";
/**
 * Accepted image. And to be protected.
 * In most cases, when duplicate files are detected, files in this state are not deleted.
 * pHash deduplication search target.
 */
export const STATE_KEEPING = "STATE_KEEPING";
/**
 * Accepted image. pHash deduplication search target.
 */
export const STATE_ACCEPTED = "STATE_ACCEPTED";
/**
 * Deduplicated, unimported images.
 * Excluded from searching for pHash deduplication.
 */
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
