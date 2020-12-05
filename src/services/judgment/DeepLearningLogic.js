// @flow
import typeof { Logger } from "log4js";

import DeepLearningService from "../deepLearning/DeepLearningService";
import { TYPE_DEEP_LEARNING } from "../../types/ReasonTypes";

import type { ReasonType } from "../../types/ReasonTypes";
import type { Config, FileInfo } from "../../types";

export default class DeepLearningLogic {
  log: Logger;

  config: Config;

  ds: DeepLearningService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ds = new DeepLearningService(config);
  }

  async detectDeepLearningReason(fileInfo: FileInfo): Promise<?ReasonType> {
    if (await this.ds.isAcceptable(fileInfo)) {
      return null;
    }
    return TYPE_DEEP_LEARNING;
  }
}
