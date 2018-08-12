// @flow
import type { ActionType } from "./ActionTypes";
import type { ReasonType } from "./ReasonTypes";
import type { HashRow } from ".";

export type JudgeResultSimple = [ActionType, ?HashRow, ReasonType];
export type JudgeResult = [
  ActionType,
  ?HashRow,
  ReasonType,
  JudgeResultSimple[]
];
