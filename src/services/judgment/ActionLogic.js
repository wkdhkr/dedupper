// @flow

import { TYPE_HOLD } from "../../types/ActionTypes";
import type { ActionType } from "../../types/ActionTypes";

export default class ActionLogic {
  fixAction = (isMayBe: boolean, action: ActionType): ActionType =>
    isMayBe ? TYPE_HOLD : action;
}
