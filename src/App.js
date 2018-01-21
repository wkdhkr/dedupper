// @flow
import path from "path";
import requireUncached from "require-uncached";
import type { Logger } from "log4js";

import EnvironmentHelper from "./helpers/EnvironmentHelper";
import LoggerHelper from "./helpers/LoggerHelper";
import Cli from "./Cli";
import FileService from "./services/fs/FileService";
import DbService from "./services/DbService";
import {
  TYPE_HOLD,
  TYPE_REPLACE,
  TYPE_DELETE,
  TYPE_SAVE
} from "./types/ActionTypes";
import type { Exact, Config, UserConfig, FileInfo, HashRow } from "./types";
import type { ActionType } from "./types/ActionTypes";

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

class App {
  log: Logger;
  config: Exact<Config>;
  cli: Cli;
  fileService: FileService;
  judgmentService: JudgmentService;
  dbService: DbService;

  constructor() {
    this.cli = new Cli();

    const config = {
      ...defaultConfig,
      ...userConfig,
      ...this.cli.parseArgs()
    };

    const logLevel = config.verbose
      ? "debug"
      : config.logLevel || config.defaultLogLevel;

    config.getLogger = (clazz: Object) => {
      const logger = LoggerHelper.getLogger(clazz);
      logger.level = logLevel;
      return logger;
    };
    this.config = (config: Exact<Config>);
    if (this.config.logConfig) {
      if (this.config.dryrun) {
        this.config.log4jsConfig.categories.default.appenders = ["out"];
      }
      LoggerHelper.configure(config.log4jsConfig);
    }
    this.log = this.config.getLogger(this);

    this.fileService = new FileService(this.config);
    this.judgmentService = new JudgmentService(this.config);
    this.dbService = new DbService(this.config);
  }

  async processActions(
    fileInfo: FileInfo,
    [action, replacementFile]: [ActionType, ?HashRow]
  ): Promise<void> {
    const toPath = replacementFile ? replacementFile.path : fileInfo.to_path;
    switch (action) {
      case TYPE_DELETE:
        this.fileService.delete();
        break;
      case TYPE_REPLACE:
        this.dbService.insert({
          ...fileInfo,
          to_path: await this.fileService.moveToLibrary(toPath)
        });
        break;
      case TYPE_SAVE:
        await this.fileService.moveToLibrary();
        this.dbService.insert(fileInfo);
        break;
      case TYPE_HOLD:
      default:
    }
  }

  async run(): Promise<void> {
    if (this.config.dryrun) {
      this.log.info("dryrun mode.");
    }
    const errorLog = e => this.log.fatal(e);
    const fileInfo = await this.fileService.collectFileInfo();
    const isForgetType = this.judgmentService.isForgetType(fileInfo.type);
    await this.fileService.prepareDir(this.config.dbBasePath, true);
    Promise.all(
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
      .catch(errorLog)
      .then(() => {
        if (this.config.wait) {
          setTimeout(
            () => console.log("\ndone.\nPress any key to exit..."),
            500
          );
          (process.stdin: any).setRawMode(true);
          process.stdin.resume();
          process.stdin.on("data", process.exit.bind(process, 0));
        }
      });
  }
}

module.exports = App;
