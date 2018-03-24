// @flow
import type { Logger } from "log4js";

import AttributeService from "../fs/AttributeService";
import ReasonLogic from "./ReasonLogic";
import {
  STATE_KEEPING,
  STATE_BLOCKED,
  STATE_DEDUPED
} from "../../types/FileStates";

import type { ReasonType } from "../../types/ReasonTypes";
import type {
  StateDeduped,
  StateBlocked,
  FileState
} from "../../types/FileStates";
import type { Config } from "../../types";

export default class StateLogic {
  log: Logger;
  config: Config;
  rl: ReasonLogic;
  as: AttributeService;
  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.rl = new ReasonLogic(config);
    this.as = new AttributeService(config);
  }

  detectDeleteState = (
    type: ReasonType
  ): StateDeduped | StateBlocked | null => {
    if (this.rl.isDedupeReasonType(type)) {
      return STATE_DEDUPED;
    }
    if (this.rl.isBlockReasonType(type)) {
      return STATE_BLOCKED;
    }
    return null;
  };

  isKeep = (state: FileState) => state === STATE_KEEPING;
}
