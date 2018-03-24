// @flow
import type { Logger } from "log4js";
import AttributeService from "../fs/AttributeService";
import FileCacheService from "../fs/FileCacheService";
import ImageMagickService from "../fs/contents/ImageMagickService";
import DeepLearningService from "../deepLearning/DeepLearningService";
import {
  TYPE_DEDUPPER_CACHE,
  TYPE_DEDUPPER_LOCK,
  TYPE_UNKNOWN,
  TYPE_SCRAP
} from "../../types/ClassifyTypes";
import { TYPE_HOLD, TYPE_DELETE } from "../../types/ActionTypes";
import {
  TYPE_SCRAP_FILE_TYPE,
  TYPE_KEEP_DEDUPPER_FILE,
  TYPE_SWEEP_DEDUPPER_FILE,
  TYPE_UNKNOWN_FILE_TYPE
} from "../../types/ReasonTypes";

import type { ActionType } from "../../types/ActionTypes";
import type { ReasonType } from "../../types/ReasonTypes";
import type { ClassifyType } from "../../types/ClassifyTypes";
import type { Config, FileInfo } from "../../types";

export default class TypeLogic {
  log: Logger;
  config: Config;
  as: AttributeService;
  is: ImageMagickService;
  ds: DeepLearningService;
  fcs: FileCacheService;
  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
    this.is = new ImageMagickService();
    this.ds = new DeepLearningService(config);
    this.fcs = new FileCacheService(config, this.as);
  }

  isForgetType = (type: ClassifyType): boolean =>
    [
      TYPE_UNKNOWN,
      TYPE_DEDUPPER_CACHE,
      TYPE_DEDUPPER_LOCK,
      TYPE_SCRAP
    ].includes(type);

  async detectFileTypeReasonAndAction(
    fileInfo: FileInfo
  ): Promise<?[ReasonType, ActionType]> {
    if (fileInfo.type === TYPE_UNKNOWN) {
      return [TYPE_UNKNOWN_FILE_TYPE, TYPE_HOLD];
    }
    if (fileInfo.type === TYPE_SCRAP) {
      return [TYPE_SCRAP_FILE_TYPE, TYPE_DELETE];
    }
    if (fileInfo.type === TYPE_DEDUPPER_CACHE) {
      if (await this.fcs.isCacheFileActive(fileInfo.from_path)) {
        return [TYPE_KEEP_DEDUPPER_FILE, TYPE_HOLD];
      }
      return [TYPE_SWEEP_DEDUPPER_FILE, TYPE_DELETE];
    }
    if (fileInfo.type === TYPE_DEDUPPER_LOCK) {
      return [TYPE_SWEEP_DEDUPPER_FILE, TYPE_DELETE];
    }
    return null;
  }
}
