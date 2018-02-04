// @flow

import path from "path";
import chalk from "chalk";

import {
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
  TYPE_P_HASH_MAY_BE,
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_NO_PROBLEM,
  TYPE_PROCESS_ERROR
} from "../types/ReasonTypes";

import type { ReasonType } from "../types/ReasonTypes";

export default class ReportHelper {
  static judgeResults: [ReasonType, string][] = [];
  static saveResults: string[] = [];
  static reasonOrder = [
    TYPE_PROCESS_ERROR,
    TYPE_DAMAGED,
    TYPE_HASH_MISMATCH_RELOCATE,
    TYPE_UNKNOWN_FILE_TYPE,
    TYPE_SCRAP_FILE_TYPE,
    TYPE_P_HASH_REJECT_NEWER,
    TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
    TYPE_P_HASH_REJECT_LOW_RESOLUTION,
    TYPE_LOW_FILE_SIZE,
    TYPE_LOW_RESOLUTION,
    TYPE_LOW_LONG_SIDE,
    TYPE_NG_FILE_NAME,
    TYPE_NG_DIR_PATH,
    TYPE_HASH_MATCH,
    TYPE_P_HASH_MAY_BE,
    TYPE_P_HASH_MATCH,
    TYPE_HASH_MATCH_RELOCATE,
    TYPE_NO_PROBLEM
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

  static appendJudgeResult(...args: [ReasonType, string]) {
    this.judgeResults.push(args);
  }

  /* eslint-disable complexity */
  static colorizeReasonType(type: string): string {
    const typeLabel = type.padStart(TYPE_HASH_MISMATCH_RELOCATE.length);
    switch (type) {
      case TYPE_P_HASH_MAY_BE:
        return chalk.bold.yellow(typeLabel);
      case TYPE_P_HASH_MATCH:
      case TYPE_HASH_MATCH_RELOCATE:
      case TYPE_NO_PROBLEM:
        return chalk.bold.bgGreen(typeLabel);
      case TYPE_DAMAGED:
        return chalk.bold.bgMagenta(typeLabel);
      case TYPE_HASH_MISMATCH_RELOCATE:
        return chalk.bold.bgRed(typeLabel);
      case TYPE_SCRAP_FILE_TYPE:
      case TYPE_LOW_FILE_SIZE:
      case TYPE_LOW_RESOLUTION:
      case TYPE_LOW_LONG_SIDE:
      case TYPE_NG_FILE_NAME:
      case TYPE_NG_DIR_PATH:
        return chalk.bold.bgYellow(typeLabel);
      case TYPE_HASH_MATCH:
      case TYPE_P_HASH_REJECT_LOW_FILE_SIZE:
      case TYPE_P_HASH_REJECT_NEWER:
      case TYPE_P_HASH_REJECT_LOW_RESOLUTION:
        return chalk.bold.bgBlue(typeLabel);
      case TYPE_UNKNOWN_FILE_TYPE:
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