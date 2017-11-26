// @flow
import path from "path";
import log4js from "log4js";
import type { Logger } from "log4js";
import EnvironmentHelper from "./helpers/EnvironmentHelper";

const { EventLogger } = require("node-windows");
const requireUncached = require("require-uncached");

const Cli = require("./Cli");
const FileService = require("./services/fs/FileService");
const DbService = require("./services/DbService");
const defaultConfig = require("./defaultConfig");

let userConfig;
try {
  const userConfigPath = path.join(
    EnvironmentHelper.getHomeDir(),
    ".dedupper.config.js"
  );
  userConfig = requireUncached(userConfigPath);
} catch (e) {
  userConfig = {};
}

type FileInfo = {
  hash: string
};

class App {
  log: Logger;
  cli: Cli;
  config: {
    [string]: string,
    getLogger: ?Function
  };
  fileService: FileService;
  dbService: DbService;

  prepareLogger() {
    const logLevel = this.config.verbose
      ? "debug"
      : this.config.logLevel || this.config.defaultLogLevel;

    this.config.getLogger = (category: string) => {
      const logger = log4js.getLogger(`dedupper/${category}`);
      logger.level = logLevel;
      return logger;
    };
  }

  constructor() {
    this.cli = new Cli();

    this.config = {
      ...defaultConfig,
      ...userConfig,
      ...this.cli.parseArgs()
    };

    this.prepareLogger();

    this.log = this.config.getLogger("Main");
    this.fileService = new FileService(this.config);
    this.dbService = new DbService(this.config);
  }

  run() {
    this.fileService
      .collectFileInfo()
      // ハッシュでDBに問い合わせ、すでに持っていたかチェック
      .then((fileInfo: FileInfo) =>
        this.fileService.prepareDir(this.config.dbBasePath).then(() =>
          this.dbService
            .queryByHash(fileInfo.hash)
            .then(storedFileInfo => {
              if (storedFileInfo) {
                // すでに持っていた事があるので消す
                return this.fileService.delete();
              }
              // 持ってないので保存してDBに記録
              return this.fileService.moveToLibrary().then(() => {
                this.dbService.insert(fileInfo);
              });
            })
            // 失敗したのでエラーを記録
            .catch(e => {
              this.log.fatal(e);
              const el = new EventLogger("dedupper");
              el.error(e);
            })
        )
      );
  }
}

module.exports = App;
