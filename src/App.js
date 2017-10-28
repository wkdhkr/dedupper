// @flow

const { EventLogger } = require("node-windows");

const Cli = require("./Cli");
const FileService = require("./services/FileService");
const DbService = require("./services/DbService");
const config = require("./config");
const { name: packageName } = require("./../package");

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
      ...config,
      ...this.cli.parseArgs()
    };

    this.fileService = new FileService(this.config);
    this.dbService = new DbService(this.config);
  }

  run() {
    return (
      this.fileService
        .calculateHash()
        // ハッシュでDBに問い合わせ、すでに持っていたかチェック
        .then(hash => this.dbService.queryByHash(hash))
        .then(result => {
          if (result) {
            const { path } = result;
            return (
              this.fileService
                .isAccessible(path)
                // すでに持っているので消す
                .then(() => this.fileService.delete())
                // 持っていたことがあるので隔離
                .catch(() => this.fileService.moveToQuarantine())
            );
          }
          // 持ってないので保存してDBに記録
          return this.fileService.moveToLibrary().then(this.dbService.save);
        })
        // 失敗したので差し戻す
        .catch(e => {
          const log = new EventLogger(packageName);
          log.error(e);
          return this.fileService.moveToReject();
        })
    );
  }
}

module.exports = App;
