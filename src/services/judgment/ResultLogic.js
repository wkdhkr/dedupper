// @flow
import type { Logger } from "log4js";

import AttributeService from "../fs/AttributeService";
import {
  TYPE_SWEEP_DEDUPPER_FILE,
  TYPE_DAMAGED,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_LOW_LONG_SIDE,
  TYPE_P_HASH_MATCH
} from "../../types/ReasonTypes";

import type { ReasonType } from "../../types/ReasonTypes";
import type { JudgeResult, JudgeResultSimple } from "../../types/JudgeResult";
import type { Config, FileInfo } from "../../types";

export default class ResultLogic {
  log: Logger;

  config: Config;

  as: AttributeService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
  }

  /* eslint-disable complexity */
  logResult(
    { from_path: fromPath, size, width, height, p_hash: pHash }: FileInfo,
    result: JudgeResultSimple | JudgeResult
  ): JudgeResult {
    let message = null;
    let isWarn = false;
    const reasonType: ReasonType = result[2];
    switch (reasonType) {
      case TYPE_SWEEP_DEDUPPER_FILE:
        return this.convertToFullResult(result);
      case TYPE_LOW_FILE_SIZE:
        message = `size = ${size}`;
        break;
      case TYPE_DAMAGED:
        isWarn = true;
        break;
      case TYPE_LOW_RESOLUTION:
      case TYPE_LOW_LONG_SIDE:
        message = `res = ${width}x${height}`;
        break;
      case TYPE_P_HASH_MATCH:
        {
          const info = result[1];
          if (info) {
            message = `p_hash = ${String(pHash)}-${String(info.p_hash)}`;
          }
        }
        break;
      default:
    }
    const finalMessage = message
      ? `judge: case = ${result[2]}, path = ${fromPath}, ${message}`
      : `judge: case = ${result[2]}, path = ${fromPath}`;
    if (isWarn) {
      this.log.warn(finalMessage);
    } else {
      this.log.info(finalMessage);
    }

    const pHashMatchResults = ((result: any): JudgeResult)[3];

    if (pHashMatchResults) {
      pHashMatchResults.forEach(([action, hitFile, reason]) => {
        if (hitFile) {
          this.log.info(
            `pHash match judge: from_path = ${fromPath} to_path = ${
              hitFile.to_path
            } action = ${action} reason = ${reason}`
          );
        } else {
          this.log.info(
            `pHash match judge: from_path = ${fromPath} action = ${action} reason = ${reason}`
          );
        }
      });
    }
    return this.convertToFullResult(result);
  }
  /* eslint-enable complexity */

  convertToFullResult = (
    result: JudgeResultSimple | JudgeResult
  ): JudgeResult => {
    if (result.length === 3) {
      return [result[0], result[1], result[2], []];
    }
    return ((result: any): JudgeResult);
  };
}
