// @flow
import path from "path";
import requireUncached from "require-uncached";
import events from "events";

import maxListenersExceededWarning from "max-listeners-exceeded-warning";

import type { Logger } from "log4js";
import pLimit from "p-limit";
import EnvironmentHelper from "./helpers/EnvironmentHelper";
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
  isParent = true;

  constructor() {
    this.cli = new Cli();

    const config = {
      ...defaultConfig,
      ...userConfig,
      ...this.cli.parseArgs()
    };

    const logLevel = config.verbose
      ? "trace"
      : config.logLevel || config.defaultLogLevel;

    config.getLogger = (clazz: Object) => {
      const logger = LoggerHelper.getLogger(clazz);
      logger.level = logLevel;
      if (this.config.quiet) {
        logger.level = "none";
      }
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
    [action, hitFile]: [ActionType, ?HashRow, any]
  ): Promise<void> {
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
        break;
      case TYPE_SAVE:
        await this.fileService.moveToLibrary();
        this.dbService.insert(fileInfo);
        break;
      case TYPE_RELOCATE: {
        const newToPath = await this.fileService.getDestPath(fromPath);
        this.dbService.insert({
          ...fileInfo,
          to_path: await this.fileService.moveToLibrary(newToPath)
        });
        break;
      }
      default:
    }
  }

  setPath(p: string) {
    this.config.path = p;
  }

  async process(): Promise<void> {
    if (await this.fileService.isDirectory()) {
      maxListenersExceededWarning();
      await this.processDirectory();
    } else {
      await this.processFile();
    }
  }

  async run(): Promise<void> {
    try {
      if (this.config.dryrun && this.isParent) {
        this.log.info("dryrun mode.");
      }

      await this.process();

      if (this.isParent) {
        setTimeout(() => console.log("\ndone.\nPress any key to exit..."), 500);
        (process.stdin: any).setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", process.exit.bind(process, 0));
      }
    } catch (e) {
      this.log.fatal(e);
      if (this.isParent) {
        process.exit(1);
      }
    }
  }

  async processDirectory(): Promise<void> {
    const filePaths = await this.fileService.collectFilePaths();
    const limit = pLimit(this.config.maxWorkers);
    const eventEmitter = new events.EventEmitter();
    eventEmitter.setMaxListeners(
      eventEmitter.getMaxListeners() * this.config.maxWorkers
    );

    await Promise.all(
      filePaths.map(f =>
        limit(async () => {
          const app = new App();
          app.setPath(f);
          app.isParent = false;
          await app.run();
        })
      )
    );
    await this.fileService.deleteEmptyDirectory();
  }

  async processFile(): Promise<void> {
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
      .then(args => this.processActions(...args));
  }
}

module.exports = App;
