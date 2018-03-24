// @flow

import path from "path";
import type { Logger } from "log4js";

import FileService from "./fs/FileService";
import {
  MARK_HOLD,
  MARK_SAVE,
  MARK_TRANSFER,
  MARK_REPLACE,
  MARK_DEDUPE,
  MARK_ERASE,
  MARK_BLOCK
} from "../types/FileNameMarks";
import FileNameMarkHelper from "../helpers/FileNameMarkHelper";
import type { FileNameMark } from "../types/FileNameMarks";

import {
  TYPE_FILE_NAME_MATCH,
  // TYPE_SWEEP_DEDUPPER_FILE,
  // TYPE_UNKNOWN_FILE_TYPE,
  TYPE_SCRAP_FILE_TYPE,
  // TYPE_NG_FILE_NAME,
  // TYPE_NG_DIR_PATH,
  TYPE_DAMAGED,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_LONG_SIDE,
  // TYPE_HASH_MATCH,
  // TYPE_HASH_MATCH_RELOCATE,
  // TYPE_HASH_MISMATCH_RELOCATE,
  TYPE_P_HASH_MATCH,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_REJECT_LOW_QUALITY,
  TYPE_P_HASH_REJECT_DIFFERENT_MEAN,
  TYPE_P_HASH_REJECT_LOW_ENTROPY,
  // TYPE_P_HASH_MAY_BE,
  TYPE_P_HASH_MATCH_LOST_FILE,
  TYPE_P_HASH_REJECT_NEWER,
  // TYPE_NO_PROBLEM,
  // TYPE_PROCESS_ERROR,
  TYPE_FILE_MARK_BLOCK,
  TYPE_FILE_MARK_ERASE,
  TYPE_FILE_MARK_DEDUPE,
  TYPE_FILE_MARK_HOLD,
  TYPE_FILE_MARK_SAVE,
  TYPE_FILE_MARK_REPLACE,
  TYPE_DEEP_LEARNING,
  TYPE_P_HASH_MATCH_KEEPING,
  TYPE_P_HASH_MATCH_WILL_KEEP,
  TYPE_P_HASH_MATCH_TRANSFER,
  TYPE_FILE_MARK_TRANSFER,
  TYPE_LOW_RESOLUTION
} from "../types/ReasonTypes";

import type { ReasonType } from "../types/ReasonTypes";
import type { JudgeResultSimple } from "../types/JudgeResult";
import type { Config, HashRow } from "../types";

export default class ExaminationService {
  log: Logger;
  config: Config;
  fs: FileService;
  constructor(config: Config, fs: FileService) {
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
    [, { to_path: toPath }, reason]: [any, HashRow, ReasonType],
    counter: number
  ): string {
    const { dir, name } = path.parse(this.fs.getSourcePath());
    const { ext } = path.parse(toPath);
    const reasonToken = this.createReasonToken(reason);
    return FileNameMarkHelper.mark(
      path.join(dir, `${name}#${counter}.${reasonToken}${ext}`),
      new Set([MARK_ERASE])
    );
  }

  static typeToMarksLookup: { [ReasonType]: Set<FileNameMark> } = {
    [TYPE_FILE_NAME_MATCH]: new Set([MARK_DEDUPE]),
    [TYPE_SCRAP_FILE_TYPE]: new Set([MARK_ERASE]),
    [TYPE_DAMAGED]: new Set([MARK_ERASE]),
    [TYPE_LOW_FILE_SIZE]: new Set([MARK_ERASE]),
    [TYPE_LOW_RESOLUTION]: new Set([MARK_ERASE]),
    [TYPE_LOW_LONG_SIDE]: new Set([MARK_ERASE]),
    [TYPE_P_HASH_MATCH_KEEPING]: new Set([MARK_SAVE]),
    [TYPE_P_HASH_MATCH_WILL_KEEP]: new Set([MARK_SAVE]),
    [TYPE_P_HASH_MATCH_TRANSFER]: new Set([MARK_TRANSFER]),
    [TYPE_DEEP_LEARNING]: new Set([MARK_BLOCK]),
    [TYPE_P_HASH_MATCH]: new Set([MARK_REPLACE]),
    [TYPE_P_HASH_REJECT_DIFFERENT_MEAN]: new Set([MARK_SAVE]),
    [TYPE_FILE_MARK_BLOCK]: new Set([MARK_BLOCK]),
    [TYPE_FILE_MARK_ERASE]: new Set([MARK_ERASE]),
    [TYPE_FILE_MARK_HOLD]: new Set([MARK_HOLD]),
    [TYPE_FILE_MARK_DEDUPE]: new Set([MARK_DEDUPE]),
    [TYPE_FILE_MARK_SAVE]: new Set([MARK_SAVE]),
    [TYPE_FILE_MARK_REPLACE]: new Set([MARK_REPLACE]),
    [TYPE_FILE_MARK_TRANSFER]: new Set([MARK_TRANSFER]),
    [TYPE_P_HASH_REJECT_LOW_RESOLUTION]: new Set([MARK_DEDUPE]),
    [TYPE_P_HASH_REJECT_LOW_FILE_SIZE]: new Set([MARK_DEDUPE]),
    [TYPE_P_HASH_REJECT_LOW_ENTROPY]: new Set([MARK_DEDUPE]),
    [TYPE_P_HASH_REJECT_NEWER]: new Set([MARK_DEDUPE]),
    [TYPE_P_HASH_REJECT_LOW_QUALITY]: new Set([MARK_DEDUPE]),
    [TYPE_P_HASH_MATCH_LOST_FILE]: new Set([MARK_DEDUPE])
  };

  detectMarksByReason = (reason: ReasonType): Set<FileNameMark> =>
    ExaminationService.typeToMarksLookup[reason] || new Set([]);

  createMarkedPath(reason: ReasonType): string {
    const marks = this.detectMarksByReason(reason);
    return FileNameMarkHelper.mark(this.fs.getSourcePath(), marks);
  }

  async rename(reason: ReasonType): Promise<void> {
    this.fs.rename(this.createMarkedPath(reason));
  }

  async arrangeDir(): Promise<void> {
    await Promise.all(
      [
        FileNameMarkHelper.DIR_DEDUPE,
        FileNameMarkHelper.DIR_SAVE,
        FileNameMarkHelper.DIR_REPLACE,
        FileNameMarkHelper.DIR_TRANSFER,
        FileNameMarkHelper.DIR_BLOCK
      ]
        .map(dir => path.join(this.fs.getDirPath(), dir))
        .map(async dirPath => {
          await this.fs.prepareDir(dirPath);
          await this.fs.createDedupperLock(dirPath);
        })
    );
  }

  async arrange(results: JudgeResultSimple[]): Promise<void> {
    if (results.length === 0) {
      return;
    }
    let counter = 0;
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
    await this.rename(results[0][2]);
    await this.arrangeDir();
  }
}
