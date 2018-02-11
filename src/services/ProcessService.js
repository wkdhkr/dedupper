// @flow
import events from "events";
import type { Logger } from "log4js";
import pLimit from "p-limit";

import EnvironmentHelper from "./../helpers/EnvironmentHelper";
import ReportHelper from "./../helpers/ReportHelper";
import LoggerHelper from "./../helpers/LoggerHelper";
import LockHelper from "./../helpers/LockHelper";
import FileService from "./fs/FileService";
import DbService from "./DbService";
import {
  // TYPE_HOLD,
  TYPE_REPLACE,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_RELOCATE,
  TYPE_HOLD
} from "./../types/ActionTypes";
import { STATE_DEDUPED } from "./../types/FileStates";
import { TYPE_PROCESS_ERROR } from "./../types/ReasonTypes";
import type { Exact, Config, FileInfo } from "./../types";
import type { JudgeResult } from "./../types/JudgeResult";

import JudgmentService from "./JudgmentService";
import ExaminationService from "./ExaminationService";

export default class ProcessService {
  log: Logger;
  config: Exact<Config>;
  fileService: FileService;
  judgmentService: JudgmentService;
  examinationService: ExaminationService;
  dbService: DbService;
  isParent: boolean;

  constructor(config: Exact<Config>, path: string, isParent: boolean = true) {
    this.config = ({
      ...config,
      ...EnvironmentHelper.loadPathMatchConfig(config.pathMatchConfig, path),
      dryrun: EnvironmentHelper.isTest() ? true : config.dryrun,
      path
    }: Exact<Config>);
    this.isParent = isParent;

    this.log = this.config.getLogger(this);
    this.fileService = new FileService(this.config);
    this.judgmentService = new JudgmentService(this.config);
    this.dbService = new DbService(this.config);
    this.examinationService = new ExaminationService(
      this.config,
      this.fileService
    );
  }

  getResults = () => {
    ReportHelper.sortResults();
    return {
      judge: ReportHelper.getJudgeResults(),
      save: ReportHelper.getSaveResults()
    };
  };

  async delete(fileInfo: FileInfo, [, , reason]: JudgeResult): Promise<void> {
    await this.fileService.delete();
    if (this.judgmentService.isDedupeReasonType(reason)) {
      await this.dbService.insert({
        ...fileInfo,
        state: STATE_DEDUPED
      });
    }
  }

  async replace(fileInfo: FileInfo, [, hitFile]: JudgeResult): Promise<void> {
    if (!hitFile) {
      throw new Error(
        `try replace, but replace file missing. path = ${fileInfo.from_path}`
      );
    }
    await this.dbService.insert({
      ...fileInfo,
      to_path: await this.fileService.moveToLibrary(hitFile.to_path, true)
    });
    await this.dbService.insert({
      ...DbService.rowToInfo(hitFile, fileInfo.type),
      state: STATE_DEDUPED
    });
    ReportHelper.appendSaveResult(hitFile.to_path);
  }

  async save(fileInfo: FileInfo): Promise<void> {
    await this.fileService.moveToLibrary();
    await this.dbService.insert(fileInfo, false);
    ReportHelper.appendSaveResult(fileInfo.to_path);
  }

  async relocate(fileInfo: FileInfo, [, hitFile]: JudgeResult): Promise<void> {
    if (!hitFile) {
      throw new Error(
        `try relocate, but replace file missing. path = ${fileInfo.from_path}`
      );
    }
    const newToPath = await this.fileService.getDestPath(hitFile.from_path);
    await this.dbService.insert(
      {
        ...fileInfo,
        to_path: await this.fileService.moveToLibrary(newToPath)
      },
      false
    );
    ReportHelper.appendSaveResult(newToPath);
  }

  async processAction(
    fileInfo: FileInfo,
    result: JudgeResult
  ): Promise<boolean> {
    const [action, , reason, results] = result;

    try {
      await LockHelper.lockProcess();
      switch (action) {
        case TYPE_DELETE:
          await this.delete(fileInfo, result);
          break;
        case TYPE_REPLACE:
          await this.replace(fileInfo, result);
          break;
        case TYPE_SAVE:
          await this.save(fileInfo);
          break;
        case TYPE_RELOCATE: {
          await this.relocate(fileInfo, result);
          break;
        }
        case TYPE_HOLD:
          await this.examinationService.arrange(results);
          break;
        default:
      }
      ReportHelper.appendJudgeResult(reason, fileInfo.from_path);
      return true;
    } catch (e) {
      throw e;
    } finally {
      LockHelper.unlockProcess();
    }
  }

  async process(): Promise<boolean> {
    let result;
    if (await this.fileService.isDirectory()) {
      result = (await this.processDirectory()).every(Boolean);
    } else {
      result = await this.processFile();
    }
    if (!result) {
      if (this.config.path) {
        ReportHelper.appendJudgeResult(TYPE_PROCESS_ERROR, this.config.path);
      }
    }
    if (this.isParent && this.config.report) {
      await ReportHelper.render(this.config.path || "");
      await LoggerHelper.flush();
    }
    return result;
  }

  async processDirectory(): Promise<boolean[]> {
    const filePaths = await this.fileService.collectFilePaths();
    const limit = pLimit(this.config.maxWorkers);
    const eventEmitter = new events.EventEmitter();
    eventEmitter.setMaxListeners(
      eventEmitter.getMaxListeners() * this.config.maxWorkers
    );

    const results = await Promise.all(
      filePaths.map(f =>
        limit(async () => {
          const ps = new ProcessService(this.config, f, false);
          return ps.process();
        })
      )
    );
    await this.fileService.deleteEmptyDirectory();
    return results;
  }

  async processFile(): Promise<boolean> {
    try {
      if (await this.fileService.isDeadLink()) {
        await this.fileService.unlink();
        return true;
      }
      const fileInfo = await this.fileService.collectFileInfo();
      const isForgetType = this.judgmentService.isForgetType(fileInfo.type);
      await this.fileService.prepareDir(this.config.dbBasePath, true);
      return Promise.all(
        isForgetType
          ? [null, []]
          : [
              this.dbService
                .queryByHash(fileInfo)
                .then(storedFileInfo => storedFileInfo),
              this.config.pHash ? this.dbService.queryByPHash(fileInfo) : []
            ]
      )
        .then(([storedFileInfoByHash, storedFileInfoByPHashs]) =>
          Promise.all([
            fileInfo,
            this.judgmentService.detect(
              fileInfo,
              storedFileInfoByHash,
              storedFileInfoByPHashs
            )
          ])
        )
        .then(args => this.processAction(...args))
        .catch(e => {
          this.log.fatal(e);
          return false;
        });
    } catch (e) {
      this.log.fatal(e);
      return false;
    }
  }
}
