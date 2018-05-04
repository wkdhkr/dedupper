// @flow
import type { Logger } from "log4js";

import AttributeService from "../fs/AttributeService";
import ContentsLogic from "./ContentsLogic";
import {
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_LOW_LONG_SIDE,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_FILE_MARK_BLOCK,
  TYPE_FILE_MARK_DEDUPE,
  TYPE_FILE_MARK_ERASE,
  TYPE_DEEP_LEARNING
} from "../../types/ReasonTypes";

import type { ReasonType } from "../../types/ReasonTypes";
import type { Config } from "../../types";

export default class ReasonLogicService {
  log: Logger;
  config: Config;
  cl: ContentsLogic;
  as: AttributeService;
  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.cl = new ContentsLogic(config);
    this.as = new AttributeService(config);
  }

  isEraseReasonType = (type: ReasonType): boolean =>
    [
      TYPE_FILE_MARK_ERASE,
      TYPE_LOW_FILE_SIZE,
      TYPE_LOW_RESOLUTION,
      TYPE_LOW_LONG_SIDE
    ].includes(type);

  isBlockReasonType = (type: ReasonType): boolean =>
    [TYPE_FILE_MARK_BLOCK, TYPE_DEEP_LEARNING].includes(type);

  isDedupeReasonType = (type: ReasonType): boolean =>
    [
      TYPE_FILE_MARK_DEDUPE,
      TYPE_P_HASH_REJECT_NEWER,
      TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
      TYPE_P_HASH_REJECT_LOW_RESOLUTION
    ].includes(type);
}
