// @flow

import path from "path";
import type { Logger } from "log4js";

import FileService from "./fs/FileService";
/*
import {
  TYPE_UNKNOWN_FILE_TYPE,
  TYPE_SCRAP_FILE_TYPE,
  TYPE_DAMAGED,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_LOW_LONG_SIDE,
  TYPE_NG_FILE_NAME,
  TYPE_NG_DIR_PATH,
  TYPE_HASH_MATCH,
  TYPE_HASH_MATCH_RELOCATE,
  TYPE_HASH_MISMATCH_RELOCATE,
  TYPE_P_HASH_MATCH,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_MAY_BE,
  TYPE_P_HASH_MATCH_LOST_FILE,
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_NO_PROBLEM,
  TYPE_PROCESS_ERROR
} from "../types/ReasonTypes";

import type { ClassifyType } from "../types/ClassifyTypes";
*/
import type { ReasonType } from "../types/ReasonTypes";
import type { JudgeResultSimple } from "../types/JudgeResult";
import type { Exact, Config } from "../types";

export default class ExaminationService {
  log: Logger;
  config: Exact<Config>;
  fs: FileService;
  constructor(config: Exact<Config>, fs: FileService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.fs = fs;
  }

  createReasonToken = (reason: ReasonType): string =>
    reason
      .replace("TYPE_", "")
      .replace("P_HASH_", "")
      .replace(/MATCH($|_)/, "")
      .replace("REJECT_", "");

  createLinkPath([, , reason]: JudgeResultSimple, counter: number): string {
    const { dir, name, ext } = path.parse(this.fs.getSourcePath());
    const reasonToken = this.createReasonToken(reason);
    return `${dir}${name}_${counter}.${reasonToken}.!d${ext}`;
  }

  async arrange(results: JudgeResultSimple[]): Promise<void> {
    results.forEach(result => {});
  }
}
