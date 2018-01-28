// @flow
import path from "path";
import requireUncached from "require-uncached";
import events from "events";
import maxListenersExceededWarning from "max-listeners-exceeded-warning";
import type { Logger } from "log4js";
import pLimit from "p-limit";
import EnvironmentHelper from "./helpers/EnvironmentHelper";
import ReportHelper from "./helpers/ReportHelper";
import LoggerHelper from "./helpers/LoggerHelper";
import Cli from "./Cli";
import FileService from "./services/fs/FileService";
import DbService from "./services/DbService";
import {
  // TYPE_HOLD,
  TYPE_REPLACE,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_RELOCATE
} from "./types/ActionTypes";
import type { Exact, Config, UserConfig, FileInfo, HashRow } from "./types";
import type { ActionType } from "./types/ActionTypes";
import type { ReasonType } from "./types/ReasonTypes";

import defaultConfig from "./defaultConfig";
import JudgmentService from "./services/JudgmentService";

let userConfig: UserConfig;
try {
  const userConfigPath = path.join(
    EnvironmentHelper.getHomeDir(),
    ".dedupper.config.js"
  );
  userConfig = requireUncached(userConfigPath);
} catch (e) {
  // no user config
}

export default class App {
  log: Logger;
  config: Exact<Config>;
  cli: Cli;
  fileService: FileService;
  judgmentService: JudgmentService;
  dbService: DbService;
  isParent = true;

  constructor() {
    this.cli = new Cli();

    const isTest = process.env.NODE_ENV === "test";

    const config = {
      ...defaultConfig,
      ...(isTest ? null : userConfig),
      ...this.cli.parseArgs()
    };

    if (isTest) {
      config.dryrun = true;
    }

    const logLevel = config.verbose
      ? "trace"
      : config.logLevel || config.defaultLogLevel;

    config.getLogger = (clazz: Object) => {
      const logger = LoggerHelper.getLogger(clazz);
      if (this.config.quiet) {
        logger.level = "off";
      } else {
        logger.level = logLevel;
      }
      return logger;
    };
    this.config = (config: Exact<Config>);
    if (this.config.logConfig) {
      if (this.config.dryrun) {
        this.config.log4jsConfig.categories.default.appenders = ["out"];
      }
      if (!this.config.quiet) {
        LoggerHelper.configure(config.log4jsConfig);
      }
    }
    this.log = this.config.getLogger(this);

    this.fileService = new FileService(this.config);
    this.judgmentService = new JudgmentService(this.config);
    this.dbService = new DbService(this.config);
  }

  getResults = () => {
    ReportHelper.sortResults();
    return {
      judge: ReportHelper.getJudgeResults(),
      save: ReportHelper.getSaveResults()
    };
  };

  async processActions(
    fileInfo: FileInfo,
    [action, hitFile, reason]: [ActionType, ?HashRow, ReasonType]
  ): Promise<boolean> {
    const toPath = (() => (hitFile ? hitFile.to_path : fileInfo.to_path))();
    const fromPath = (() =>
      hitFile ? hitFile.from_path : fileInfo.from_path)();

    switch (action) {
      case TYPE_DELETE:
        this.fileService.delete();
        break;
      case TYPE_REPLACE:
        this.dbService.insert({
          ...fileInfo,
          to_path: await this.fileService.moveToLibrary(toPath)
        });
        ReportHelper.appendSaveResult(toPath);
        break;
      case TYPE_SAVE:
        await this.fileService.moveToLibrary();
        this.dbService.insert(fileInfo);
        ReportHelper.appendSaveResult(toPath);
        break;
      case TYPE_RELOCATE: {
        const newToPath = await this.fileService.getDestPath(fromPath);
        this.dbService.insert({
          ...fileInfo,
          to_path: await this.fileService.moveToLibrary(newToPath)
        });
        ReportHelper.appendSaveResult(newToPath);
        break;
      }
      default:
    }
    ReportHelper.appendJudgeResult(reason, fileInfo.from_path);
    return true;
  }

  setPath(p: string) {
    this.config.path = p;
  }

  async run(): Promise<void> {
    let isError = false;
    try {
      if (this.config.dryrun) {
        this.log.info("dryrun mode.");
      }

      const result = await this.process();
      if (!result) {
        isError = true;
      }
    } catch (e) {
      this.log.fatal(e);
    }

    if (this.config.report) {
      await ReportHelper.render(this.config.path || "");
    }
    await this.close(isError);
  }

  async close(isError: boolean): Promise<void> {
    await LoggerHelper.flush();
    if (this.config.wait) {
      setTimeout(() => console.log("\ndone.\nPress any key to exit..."), 500);
      (process.stdin: any).setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", process.exit.bind(process, isError ? 1 : 0));
    } else if (isError) {
      process.exit(1);
    }
  }

  async process(): Promise<boolean> {
    if (await this.fileService.isDirectory()) {
      maxListenersExceededWarning();
      return (await this.processDirectory()).every(Boolean);
    }
    return this.processFile();
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
          const app = new App();
          app.setPath(f);
          app.isParent = false;
          return app.process();
        })
      )
    );
    await this.fileService.deleteEmptyDirectory();
    return results;
  }

  async processFile(): Promise<boolean> {
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
      .then(args => this.processActions(...args))
      .catch(e => {
        this.log.fatal(e);
        return false;
      });
  }
}
