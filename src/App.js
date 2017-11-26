// @flow
import path from "path";
import log4js from "log4js";
import type { Logger } from "log4js";
import requireUncached from "require-uncached";
import EnvironmentHelper from "./helpers/EnvironmentHelper";
import Cli from "./Cli";
import FileService from "./services/fs/FileService";
import DbService from "./services/DbService";
import type { Exact, Config, UserConfig, FileInfo } from "./types";

import defaultConfig from "./defaultConfig";

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

    config.getLogger = (category: string) => {
      const logger = log4js.getLogger(`dedupper/${category}`);
      logger.level = logLevel;
      return logger;
    };
    this.config = (config: Exact<Config>);

    this.log = this.config.getLogger("Main");
    this.fileService = new FileService(this.config);
    this.dbService = new DbService(this.config);
  }

  run() {
    const errorLog = e => this.log.fatal(e);
    Promise.all([
      this.fileService.collectFileInfo(),
      this.fileService.prepareDir(this.config.dbBasePath, true)
    ])
      .then(([fileInfo: FileInfo]) =>
        this.dbService
          .queryByHash(fileInfo.hash)
          .then(storedFileInfo => [fileInfo, storedFileInfo])
      )
      .then(([fileInfo, storedFileInfo]) => {
        if (storedFileInfo) {
          // すでに持っていた事があるので消す
          return this.fileService.delete();
        }
        // 持ってないので保存してDBに記録
        return this.fileService.moveToLibrary().then(() => {
          this.dbService.insert(fileInfo);
        });
      })
      .catch(errorLog);
  }
}

module.exports = App;
