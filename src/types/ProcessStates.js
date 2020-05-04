// @flow
export const STATE_NONE = 0;
export const STATE_NG = 1;
export const STATE_OK = 2;
export const STATE_SKIP = 3;
export type StateNone = 0;
export type StateNg = 1;
export type StateOk = 2;
export type StateSkip = 3;

export type ProcessState = StateNone | StateNg | StateOk | StateSkip;
