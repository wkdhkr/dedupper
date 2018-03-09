// @flow

import path from "path";
import chalk from "chalk";

import {
  TYPE_FILE_NAME_MATCH,
  TYPE_SWEEP_DEDUPPER_FILE,
  TYPE_UNKNOWN_FILE_TYPE,
  TYPE_SCRAP_FILE_TYPE,
  TYPE_NG_FILE_NAME,
  TYPE_NG_DIR_PATH,
  TYPE_DAMAGED,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_LOW_LONG_SIDE,
  TYPE_HASH_MATCH,
  TYPE_HASH_MATCH_RELOCATE,
  TYPE_HASH_MISMATCH_RELOCATE,
  TYPE_P_HASH_MATCH,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_REJECT_LOW_QUALITY,
  TYPE_P_HASH_REJECT_DIFFERENT_MEAN,
  TYPE_P_HASH_REJECT_LOW_ENTROPY,
  TYPE_P_HASH_MAY_BE,
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_NO_PROBLEM,
  TYPE_PROCESS_ERROR,
  TYPE_FILE_MARK_BLOCK,
  TYPE_FILE_MARK_ERASE,
  TYPE_FILE_MARK_DEDUPE,
  TYPE_FILE_MARK_HOLD,
  TYPE_FILE_MARK_SAVE,
  TYPE_FILE_MARK_REPLACE,
  TYPE_DEEP_LEARNING,
  TYPE_KEEP_DEDUPPER_FILE,
  TYPE_FILE_MARK_TRANSFER,
  TYPE_P_HASH_MATCH_KEEPING,
  TYPE_P_HASH_MATCH_WILL_KEEP,
  TYPE_P_HASH_MATCH_TRANSFER,
  TYPE_HASH_MATCH_TRANSFER
} from "../types/ReasonTypes";

import type { ReasonType } from "../types/ReasonTypes";

export default class ReportHelper {
  static judgeResults: [ReasonType, string][] = [];
  static saveResults: string[] = [];
  static reasonOrder = [
    TYPE_PROCESS_ERROR,
    TYPE_DAMAGED,
    TYPE_HASH_MISMATCH_RELOCATE,
    TYPE_SWEEP_DEDUPPER_FILE,
    TYPE_UNKNOWN_FILE_TYPE,
    TYPE_SCRAP_FILE_TYPE,
    TYPE_FILE_NAME_MATCH,
    TYPE_P_HASH_REJECT_NEWER,
    TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
    TYPE_P_HASH_REJECT_LOW_RESOLUTION,
    TYPE_P_HASH_REJECT_LOW_QUALITY,
    TYPE_P_HASH_REJECT_DIFFERENT_MEAN,
    TYPE_P_HASH_REJECT_LOW_ENTROPY,
    TYPE_P_HASH_MATCH_KEEPING,
    TYPE_P_HASH_MATCH_WILL_KEEP,
    TYPE_P_HASH_MATCH_TRANSFER,
    TYPE_HASH_MATCH_TRANSFER,
    TYPE_LOW_FILE_SIZE,
    TYPE_LOW_RESOLUTION,
    TYPE_DEEP_LEARNING,
    TYPE_LOW_LONG_SIDE,
    TYPE_NG_FILE_NAME,
    TYPE_NG_DIR_PATH,
    TYPE_HASH_MATCH,
    TYPE_P_HASH_MAY_BE,
    TYPE_P_HASH_MATCH,
    TYPE_HASH_MATCH_RELOCATE,
    TYPE_NO_PROBLEM,
    TYPE_FILE_MARK_BLOCK,
    TYPE_FILE_MARK_ERASE,
    TYPE_FILE_MARK_DEDUPE,
    TYPE_FILE_MARK_HOLD,
    TYPE_FILE_MARK_SAVE,
    TYPE_FILE_MARK_TRANSFER,
    TYPE_FILE_MARK_REPLACE
  ];

  static getSaveResults(): string[] {
    return this.saveResults;
  }

  static getJudgeResults(): [ReasonType, string][] {
    return this.judgeResults;
  }

  static flush() {
    this.judgeResults = [];
    this.saveResults = [];
  }

  static appendSaveResult(toPath: string) {
    this.saveResults.push(toPath);
  }

  static isIgnoreReasonType = (type: ReasonType) =>
    [TYPE_KEEP_DEDUPPER_FILE].includes(type);

  static appendJudgeResult(...args: [ReasonType, string]) {
    if (ReportHelper.isIgnoreReasonType(args[0])) {
      return;
    }
    this.judgeResults.push(args);
  }

  /* eslint-disable complexity */
  static colorizeReasonType(type: string): string {
    const typeLabel = type.padStart(TYPE_P_HASH_REJECT_LOW_RESOLUTION.length);
    switch (type) {
      // may be result
      case TYPE_P_HASH_MAY_BE:
        return chalk.bold.yellow(typeLabel);
      // save
      case TYPE_P_HASH_MATCH_KEEPING:
      case TYPE_P_HASH_MATCH_WILL_KEEP:
      case TYPE_FILE_MARK_TRANSFER:
      case TYPE_FILE_MARK_REPLACE:
      case TYPE_P_HASH_MATCH:
      case TYPE_HASH_MATCH_RELOCATE:
      case TYPE_NO_PROBLEM:
      case TYPE_FILE_MARK_SAVE:
        return chalk.bold.bgGreen(typeLabel);
      // damaged
      case TYPE_DAMAGED:
        return chalk.bold.bgMagenta(typeLabel);
      // critical error
      case TYPE_HASH_MISMATCH_RELOCATE:
        return chalk.bold.bgRed(typeLabel);
      // delete file with warning
      case TYPE_FILE_NAME_MATCH:
      case TYPE_P_HASH_MATCH_TRANSFER:
      case TYPE_SCRAP_FILE_TYPE:
      case TYPE_LOW_FILE_SIZE:
      case TYPE_LOW_RESOLUTION:
      case TYPE_LOW_LONG_SIDE:
      case TYPE_NG_FILE_NAME:
      case TYPE_NG_DIR_PATH:
      case TYPE_DEEP_LEARNING:
      case TYPE_HASH_MATCH_TRANSFER:
        return chalk.bold.bgYellow(typeLabel);
      // delete file explicit
      case TYPE_FILE_MARK_BLOCK:
      case TYPE_FILE_MARK_ERASE:
      case TYPE_FILE_MARK_DEDUPE:
      case TYPE_HASH_MATCH:
      case TYPE_P_HASH_REJECT_LOW_FILE_SIZE:
      case TYPE_P_HASH_REJECT_NEWER:
      case TYPE_P_HASH_REJECT_LOW_RESOLUTION:
      case TYPE_P_HASH_REJECT_LOW_QUALITY:
      case TYPE_P_HASH_REJECT_DIFFERENT_MEAN:
      case TYPE_P_HASH_REJECT_LOW_ENTROPY:
        return chalk.bold.bgBlue(typeLabel);
      // other
      case TYPE_UNKNOWN_FILE_TYPE:
      case TYPE_SWEEP_DEDUPPER_FILE:
      case TYPE_FILE_MARK_HOLD:
      default:
        return chalk.bold.bgWhite.black(typeLabel);
    }
  }
  /* eslint-enable complexity */

  static async render(basePath: string): Promise<void> {
    return new Promise(r => {
      setTimeout(() => {
        console.log(this.createRenderString(basePath));
        r();
      }, 200);
    });
  }

  static sortResults() {
    this.judgeResults.sort(([a, aPath], [b, bPath]) => {
      const aRank = this.reasonOrder.indexOf(a);
      const bRank = this.reasonOrder.indexOf(b);
      if (aRank === bRank) {
        return aPath < bPath ? -1 : 1;
      }
      return aRank < bRank ? -1 : 1;
    });
    this.saveResults.sort();
  }

  static createRenderString(basePath: string): string {
    const lines = [];
    this.sortResults();

    this.judgeResults.forEach(([type, targetPath]) => {
      let printPath = targetPath.replace(basePath + path.sep, "");
      printPath =
        printPath === targetPath ? path.basename(targetPath) : printPath;

      lines.push(`${this.colorizeReasonType(type)} ${printPath}`);
      /*
      lines.push(`${this.colorizeReasonType(TYPE_NO_PROBLEM)} ${printPath}`);
      lines.push(`${this.colorizeReasonType(TYPE_DAMAGED)} ${printPath}`);
      lines.push(
        `${this.colorizeReasonType(TYPE_HASH_MISMATCH_RELOCATE)} ${printPath}`
      );
      lines.push(`${this.colorizeReasonType(TYPE_NG_FILE_NAME)} ${printPath}`);
      lines.push(`${this.colorizeReasonType(TYPE_HASH_MATCH)} ${printPath}`);
      */
    });

    this.saveResults.forEach(toPath => {
      lines.push(
        `${chalk.cyan.bgWhiteBright("SAVED")} ${chalk.bold.bgCyan(toPath)}`
      );
    });
    return `\n${lines.join("\n")}`;
  }
}
