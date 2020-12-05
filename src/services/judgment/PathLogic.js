// @flow
import typeof { Logger } from "log4js";

import {
  MARK_BLOCK,
  MARK_DEDUPE,
  MARK_HOLD,
  MARK_ERASE,
  MARK_SAVE,
  MARK_REPLACE,
  MARK_TRANSFER
} from "../../types/FileNameMarks";
import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import AttributeService from "../fs/AttributeService";
import DbService from "../db/DbService";
import ResultLogic from "./ResultLogic";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE,
  TYPE_TRANSFER
} from "../../types/ActionTypes";
import {
  // TYPE_HASH_MATCH,
  TYPE_NG_FILE_NAME,
  TYPE_NG_DIR_PATH,
  TYPE_FILE_NAME_MATCH,
  TYPE_FILE_MARK_BLOCK,
  TYPE_FILE_MARK_ERASE,
  TYPE_FILE_MARK_DEDUPE,
  TYPE_FILE_MARK_HOLD,
  TYPE_FILE_MARK_SAVE,
  TYPE_FILE_MARK_REPLACE,
  TYPE_FILE_MARK_TRANSFER
} from "../../types/ReasonTypes";
import { STATE_ACCEPTED } from "../../types/FileStates";

import type { ReasonType } from "../../types/ReasonTypes";
import type { FileNameMark } from "../../types/FileNameMarks";
import type { JudgeResult } from "../../types/JudgeResult";
import type { Config, FileInfo, HashRow } from "../../types";

export default class PathLogic {
  log: Logger;

  config: Config;

  rl: ResultLogic;

  as: AttributeService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.rl = new ResultLogic(config);
    this.as = new AttributeService(config);
  }

  isNgFileName(name: string): boolean {
    return this.config.ngFileNamePatterns.some(p => {
      if (p instanceof RegExp) {
        return name.match(p);
      }
      return name.toLowerCase() === p.toLowerCase();
    });
  }

  isNgDirPath(targetPath: string): boolean {
    return this.config.ngDirPathPatterns.some(p => {
      if (p instanceof RegExp) {
        return Boolean(targetPath.match(p));
      }
      return targetPath.toLowerCase().includes(p.toLowerCase());
    });
  }

  detectNgPathReason(fileInfo: FileInfo): ?ReasonType {
    if (this.isNgFileName(this.as.getFileName(fileInfo.from_path))) {
      return TYPE_NG_FILE_NAME;
    }
    if (this.isNgDirPath(fileInfo.from_path)) {
      return TYPE_NG_DIR_PATH;
    }
    return null;
  }

  /*
  async detectMarkBlockReason(
    storedFileInfoByHash: ?HashRow
  ): Promise<ReasonType> {
    let reason = TYPE_FILE_MARK_BLOCK;
    if (storedFileInfoByHash) {
      if (await this.as.isExists(storedFileInfoByHash.to_path)) {
        reason = TYPE_HASH_MATCH;
      }
    }
    return reason;
  }
  */

  // eslint-disable-next-line complexity
  async handleFileNameMark(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow,
    storedFileInfoByPHashs: HashRow[],
    storedFileInfoByNames: HashRow[],
    marks: Set<FileNameMark>
  ): Promise<JudgeResult> {
    if (marks.has(MARK_HOLD)) {
      return this.rl.logResult(fileInfo, [
        TYPE_HOLD,
        null,
        TYPE_FILE_MARK_HOLD
      ]);
    }
    if (marks.has(MARK_BLOCK)) {
      if (
        storedFileInfoByHash &&
        storedFileInfoByHash.state >=
          DbService.lookupFileStateDivision(STATE_ACCEPTED) &&
        storedFileInfoByHash &&
        !this.as.isLibraryPlace()
      ) {
        this.log.warn(
          `ignore block. already exists. from = ${fileInfo.from_path} to = ${storedFileInfoByHash.to_path}`
        );
        return this.rl.logResult(fileInfo, [
          TYPE_HOLD,
          null,
          TYPE_FILE_MARK_HOLD
        ]);
      }
      return this.rl.logResult(fileInfo, [
        TYPE_DELETE,
        null,
        TYPE_FILE_MARK_BLOCK
      ]);
    }
    if (marks.has(MARK_DEDUPE)) {
      return this.rl.logResult(fileInfo, [
        TYPE_DELETE,
        null,
        TYPE_FILE_MARK_DEDUPE
      ]);
    }
    if (marks.has(MARK_ERASE)) {
      return this.rl.logResult(fileInfo, [
        TYPE_DELETE,
        null,
        TYPE_FILE_MARK_ERASE
      ]);
    }
    if (marks.has(MARK_REPLACE)) {
      if (storedFileInfoByPHashs.length) {
        return this.rl.logResult(fileInfo, [
          TYPE_REPLACE,
          (await this.detectReplaceFile(fileInfo, storedFileInfoByPHashs)) ||
            storedFileInfoByPHashs[0],
          TYPE_FILE_MARK_REPLACE
        ]);
      }
      if (storedFileInfoByNames.length) {
        return this.rl.logResult(fileInfo, [
          TYPE_REPLACE,
          storedFileInfoByNames[0],
          TYPE_FILE_MARK_REPLACE
        ]);
      }
      this.log.warn(
        `replace mark, but no duplication. path = ${fileInfo.from_path}`
      );
      return this.rl.logResult(fileInfo, [
        TYPE_SAVE,
        null,
        TYPE_FILE_MARK_SAVE
      ]);
    }
    if (marks.has(MARK_TRANSFER)) {
      if (storedFileInfoByPHashs.length) {
        return this.rl.logResult(fileInfo, [
          TYPE_TRANSFER,
          (await this.detectReplaceFile(fileInfo, storedFileInfoByPHashs)) ||
            storedFileInfoByPHashs[0],
          TYPE_FILE_MARK_TRANSFER
        ]);
      }
      this.log.warn(
        `replace mark, but no duplication. path = ${fileInfo.from_path}`
      );
      return this.rl.logResult(fileInfo, [
        TYPE_SAVE,
        null,
        TYPE_FILE_MARK_SAVE
      ]);
    }
    if (marks.has(MARK_SAVE)) {
      return this.rl.logResult(fileInfo, [
        TYPE_SAVE,
        null,
        TYPE_FILE_MARK_SAVE
      ]);
    }
    throw new Error(
      `unknown file mark: marks = ${Array.from(marks).join(",")}`
    );
  }

  detectReplaceFile = async (
    fileInfo: FileInfo,
    storedFileInfoByPHashs: HashRow[]
  ): Promise<?HashRow> => {
    const replacePath = await FileNameMarkHelper.findReplaceFile(
      fileInfo.from_path
    );
    if (!replacePath) {
      return null;
    }
    return storedFileInfoByPHashs.find(h => h.to_path === replacePath);
  };

  handleNameHit = (
    fileInfo: FileInfo,
    storedFileInfoByNames: HashRow[]
  ): JudgeResult =>
    this.rl.logResult(fileInfo, [
      TYPE_HOLD,
      null,
      TYPE_FILE_NAME_MATCH,
      storedFileInfoByNames.map(f => [TYPE_HOLD, f, TYPE_FILE_NAME_MATCH])
    ]);
}
