// @flow

import path from "path";
import type { Logger } from "log4js";

import FileService from "./fs/FileService";
import { MARK_REPLACE, MARK_DEDUPE, MARK_ERASE } from "../types/FileNameMarks";
import FileNameMarkHelper from "../helpers/FileNameMarkHelper";
import type { FileNameMark } from "../types/FileNameMarks";

import {
  /*
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
  TYPE_HASH_MISMATCH_RELOCATE, */
  TYPE_P_HASH_MATCH /* ,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_MAY_BE,
  TYPE_P_HASH_MATCH_LOST_FILE,
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_NO_PROBLEM,
  TYPE_PROCESS_ERROR
  */
} from "../types/ReasonTypes";

import type { ReasonType } from "../types/ReasonTypes";
import type { JudgeResultSimple } from "../types/JudgeResult";
import type { Exact, Config, HashRow } from "../types/";

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
      .replace("REJECT_", "") || "REPLACE";

  createLinkPath(
    [, hitFile, reason]: [any, HashRow, ReasonType],
    counter: number
  ): string {
    const { dir, name } = path.parse(this.fs.getSourcePath());
    const { ext } = path.parse(hitFile.to_path);
    const reasonToken = this.createReasonToken(reason);
    console.log(reasonToken, reason);
    return FileNameMarkHelper.mark(
      path.join(dir, `${name}_${counter}.${reasonToken}${ext}`),
      new Set([MARK_ERASE])
    );
  }

  detectMarksByReason = (reason: ReasonType): Set<FileNameMark> => {
    switch (reason) {
      case TYPE_P_HASH_MATCH:
        return new Set([MARK_REPLACE]);
      default:
        return new Set([MARK_DEDUPE]);
    }
  };

  createMarkedPath(reason: ReasonType): string {
    const marks = this.detectMarksByReason(reason);
    return FileNameMarkHelper.mark(this.fs.getSourcePath(), marks);
  }

  async arrange(results: JudgeResultSimple[]): Promise<void> {
    if (results.length === 0) {
      return;
    }
    let counter = 1;
    await Promise.all(
      results.map(([action, hitFile, reason]) => {
        if (!hitFile) {
          return Promise.resolve();
        }
        counter += 1;
        return this.fs.createSymLink(
          hitFile.to_path,
          this.createLinkPath([action, hitFile, reason], counter)
        );
      })
    );

    await this.fs.rename(this.createMarkedPath(results[0][2]));
    await Promise.all(
      [
        FileNameMarkHelper.DIR_DEDUPE,
        FileNameMarkHelper.DIR_SAVE,
        FileNameMarkHelper.DIR_REPLACE
      ].map(dir => this.fs.prepareDir(path.join(this.fs.getDirPath(), dir)))
    );
  }
}
