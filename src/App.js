// @flow

const { EventLogger } = require("node-windows");
const requireUncached = require("require-uncached");
const path = require("path");

const Cli = require("./Cli");
const FileService = require("./services/fs/FileService");
const DbService = require("./services/DbService");
const defaultConfig = require("./defaultConfig");
const { name: packageName } = require("./../package");

const homeDir =
  process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

let userConfig;
try {
  const userConfigPath = path.join([homeDir, ".dedupper.config.js"]);
  userConfig = requireUncached(userConfigPath);
} catch (e) {
  userConfig = {};
}

type FileInfo = {
  hash: string
};

class App {
  cli: Cli;
  config: {};
  fileService: FileService;
  dbService: DbService;

  constructor() {
    this.cli = new Cli();
  }

  initialize() {
    this.config = {
      ...defaultConfig,
      ...userConfig,
      ...this.cli.parseArgs()
    };

    this.fileService = new FileService(this.config);
    this.dbService = new DbService(this.config);
  }

  run() {
    return (
      this.fileService
        .collectFileInfo()
        // ハッシュでDBに問い合わせ、すでに持っていたかチェック
        .then((fileInfo: FileInfo) =>
          this.dbService
            .queryByHash(fileInfo.hash)
            .then((storedFileInfo: FileInfo) => {
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
              const log = new EventLogger(packageName);
              log.error(e);
            })
        )
    );
  }
}

module.exports = App;
