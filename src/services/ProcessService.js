// @flow
import maxListenersExceededWarning from "max-listeners-exceeded-warning";
import events from "events";
import type { Logger } from "log4js";
import pLimit from "p-limit";

import FileSystemHelper from "./../helpers/FileSystemHelper";
import EnvironmentHelper from "./../helpers/EnvironmentHelper";
import ReportHelper from "./../helpers/ReportHelper";
import LoggerHelper from "./../helpers/LoggerHelper";
import LockHelper from "./../helpers/LockHelper";
import FileService from "./fs/FileService";
import AttributeService from "./fs/AttributeService";
import DbService from "./db/DbService";
import {
  TYPE_REPLACE,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_RELOCATE,
  TYPE_TRANSFER,
  TYPE_HOLD
} from "./../types/ActionTypes";
import { STATE_DEDUPED } from "./../types/FileStates";
import {
  TYPE_ARCHIVE_EXTRACT,
  TYPE_PROCESS_ERROR
} from "./../types/ReasonTypes";
import type { UserBaseConfig, Config, FileInfo } from "./../types";
import type { JudgeResult, JudgeResultSimple } from "./../types/JudgeResult";
import type { ActionType } from "./../types/ActionTypes";
import type { ReasonType } from "./../types/ReasonTypes";

import ExaminationService from "./ExaminationService";
import JudgmentService from "./judgment/JudgmentService";

export default class ProcessService {
  log: Logger;
  config: Config;
  fileService: FileService;
  judgmentService: JudgmentService;
  examinationService: ExaminationService;
  dbService: DbService;
  isParent: boolean;

  constructor(config: Config, path: string, isParent: boolean = true) {
    let { dryrun } = config;
    if (EnvironmentHelper.isTest()) {
      maxListenersExceededWarning();
      dryrun = true;
    }
    let classifyTypeConfig: UserBaseConfig = {};
    if (!FileSystemHelper.isDirectory(path)) {
      const classifyType = AttributeService.detectClassifyTypeByConfig({
        ...config,
        path
      });
      classifyTypeConfig = EnvironmentHelper.loadClassifyTypeConfig(
        config.classifyTypeConfig,
        classifyType
      );
    }
    const pathMatchConfig = EnvironmentHelper.loadPathMatchConfig(
      config.pathMatchConfig,
      path
    );
    this.config = ({
      ...config,
      ...pathMatchConfig,
      ...classifyTypeConfig,
      ...pathMatchConfig.forceConfig,
      ...classifyTypeConfig.forceConfig,
      dryrun,
      path
    }: Config);
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
    const state = this.judgmentService.detectDeleteState(reason);
    if (state) {
      await this.insertToDb({
        ...fileInfo,
        state
      });
    }
    await this.fileService.delete();
  }

  async transfer(fileInfo: FileInfo, [, hitFile]: JudgeResult): Promise<void> {
    if (!hitFile) {
      throw new Error(
        `try transfer, but transfer file missing. path = ${fileInfo.from_path}`
      );
    }
    await this.fileService.delete(hitFile.to_path);
    await this.save(fileInfo);
    await this.insertToDb({
      ...DbService.rowToInfo(hitFile, fileInfo.type),
      state: STATE_DEDUPED
    });
  }

  async replace(fileInfo: FileInfo, [, hitFile]: JudgeResult): Promise<void> {
    if (!hitFile) {
      throw new Error(
        `try replace, but replace file missing. path = ${fileInfo.from_path}`
      );
    }
    const filledInfo = await this.fileService.fillInsertFileInfo(fileInfo);
    await this.insertToDb({
      ...filledInfo,
      to_path: await this.fileService.moveToLibrary(hitFile.to_path, true)
    });
    await this.insertToDb({
      ...DbService.rowToInfo(hitFile, fileInfo.type),
      state: STATE_DEDUPED
    });
    ReportHelper.appendSaveResult(hitFile.to_path);
  }

  async save(fileInfo: FileInfo, isReplace: boolean = true): Promise<void> {
    const toPath = await this.fileService.moveToLibrary();
    await this.insertToDb({ ...fileInfo, to_path: toPath }, isReplace);
    ReportHelper.appendSaveResult(toPath);
  }

  async relocate(fileInfo: FileInfo, [, hitFile]: JudgeResult): Promise<void> {
    if (!hitFile) {
      throw new Error(
        `try relocate, but replace file missing. path = ${fileInfo.from_path}`
      );
    }
    const newToPath = await this.fileService.getFinalDestPath();
    await this.insertToDb(
      {
        ...fileInfo,
        d_hash: hitFile.d_hash,
        p_hash: hitFile.p_hash,
        from_path: hitFile.from_path,
        to_path: newToPath
      },
      true
    );
    await this.fileService.moveToLibrary(newToPath);
    ReportHelper.appendSaveResult(newToPath);
  }

  async hold(reason: ReasonType, results: JudgeResultSimple[]): Promise<void> {
    if (results.length === 0) {
      await this.examinationService.rename(reason);
      if (this.examinationService.detectMarksByReason(reason).size) {
        await this.examinationService.arrangeDir();
      }
      return;
    }

    await this.examinationService.arrange(results);
  }

  async insertToDb(
    fileInfo: FileInfo,
    isReplace: boolean = true
  ): Promise<void> {
    await this.dbService.insert(
      await this.fileService.fillInsertFileInfo(fileInfo),
      isReplace
    );
  }

  fillFileInfo = async (
    fileInfo: FileInfo,
    action: ActionType,
    reason: ReasonType
  ): Promise<FileInfo> => {
    switch (action) {
      case TYPE_DELETE:
        if (this.judgmentService.detectDeleteState(reason)) {
          return this.fileService.fillInsertFileInfo(fileInfo);
        }
        break;
      case TYPE_HOLD:
      case TYPE_RELOCATE:
        break;
      case TYPE_REPLACE:
      case TYPE_SAVE:
      case TYPE_TRANSFER:
        return this.fileService.fillInsertFileInfo(fileInfo);
      default:
        break;
    }
    return fileInfo;
  };

  lock = async () => {
    if (!this.config.pHashIgnoreSameDir) {
      await LockHelper.lockProcess();
    }
  };

  unlock = async () => {
    if (!this.config.pHashIgnoreSameDir) {
      await LockHelper.unlockProcess();
    }
  };

  async processAction(
    fileInfo: FileInfo,
    result: JudgeResult
  ): Promise<boolean> {
    const [action, , reason, results] = result;

    try {
      const filledInfo = await this.fillFileInfo(fileInfo, action, reason);
      await this.lock();
      switch (action) {
        case TYPE_DELETE:
          await this.delete(filledInfo, result);
          break;
        case TYPE_REPLACE:
          await this.replace(filledInfo, result);
          break;
        case TYPE_SAVE:
          await this.save(filledInfo);
          break;
        case TYPE_TRANSFER:
          await this.transfer(filledInfo, result);
          break;
        case TYPE_RELOCATE: {
          await this.relocate(filledInfo, result);
          break;
        }
        case TYPE_HOLD:
          await this.hold(reason, results);
          break;
        default:
      }
      ReportHelper.appendJudgeResult(reason, filledInfo.from_path);
      return true;
    } catch (e) {
      throw e;
    } finally {
      await this.unlock();
      await this.fileService.cleanCacheFile(
        undefined,
        Boolean(this.config.manual)
      );
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
    if (this.isParent) {
      if (this.config.report) {
        await ReportHelper.render(this.config.path || "");
      }
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

  async processArchive(): Promise<boolean> {
    if (this.config.archiveExtract && (await this.fileService.isArchive())) {
      await this.fileService.extractArchive();
      ReportHelper.appendJudgeResult(
        TYPE_ARCHIVE_EXTRACT,
        this.fileService.getSourcePath()
      );
      return true;
    }
    return false;
  }

  async processImportedFile(): Promise<boolean> {
    const hitRows = await this.dbService.queryByToPath({
      type: AttributeService.detectClassifyTypeByConfig(this.config),
      to_path: this.fileService.getSourcePath()
    });
    if (
      hitRows.filter(({ state }) => DbService.isAcceptedState(state)).length
    ) {
      return true;
    }
    return false;
  }

  async processFile(): Promise<boolean> {
    try {
      if (await this.fileService.isDeadLink()) {
        await this.fileService.unlink();
        return true;
      }
      if (await this.processImportedFile()) {
        return true;
      }
      if (await this.processArchive()) {
        return true;
      }
      const fileInfo = await this.fileService.collectFileInfo();
      const isForgetType = this.judgmentService.isForgetType(fileInfo.type);
      await this.fileService.prepareDir(this.config.dbBasePath, true);
      const [
        storedFileInfoByHash,
        storedFileInfoByPHashs,
        storedFileInfoByNames
      ] = await Promise.all(
        isForgetType
          ? [null, [], []]
          : [
              this.dbService
                .queryByHash(fileInfo)
                .then(storedFileInfo => storedFileInfo),
              this.config.pHash ? this.dbService.queryByPHash(fileInfo) : [],
              this.config.useFileName
                ? this.dbService.queryByName(fileInfo)
                : []
            ]
      );
      return this.processAction(
        ...(await Promise.all([
          fileInfo,
          this.judgmentService.detect(
            fileInfo,
            storedFileInfoByHash,
            storedFileInfoByPHashs,
            storedFileInfoByNames
          )
        ]))
      );
    } catch (e) {
      this.log.fatal(e);
      return false;
    }
  }
}
