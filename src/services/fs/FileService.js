// @flow
const fs = require("fs");
const util = require("util");
const path = require("path");
const crypto = require("crypto");
const trash = require("trash");

const { promisify } = util;

const accessAsync = promisify(fs.access);
const renameAsync = promisify(fs.rename);
const statAsync = promisify(fs.stat);

const RenameService = require("./RenameService");
const CT = require("./../../ClassifyTypes");

type FileInfo = {
  hash: string,
  size: number,
  timestamp: number,
  name: string,
  path: string
};

type Config = {
  path: string,
  classifyTypeByExtension: { [string]: string },
  baseLibraryPathByType: { [string]: string },
  quarantineBaseDirPath: string,
  rejectBaseDirPath: string,
  hashAlgorithm: string
};

class FileService {
  config: Config;
  renameService: RenameService;

  constructor(config: Object) {
    this.config = config;
    this.renameService = new RenameService(this.config);
  }

  delete(targetPath?: string) {
    return trash([targetPath || this.getSourcePath()]);
  }

  calculateHash(targetPath?: string): Promise<string> {
    const sourcePath = targetPath || this.getSourcePath();

    const shasum = crypto.createHash(this.config.hashAlgorithm);

    return new Promise((resolve, reject) => {
      const s = fs.createReadStream(sourcePath);
      // 画像の時はメタデータを無視する
      if (this.detectClassifyType() === CT.TYPE_IMAGE) {
        this.imageminService.run(sourcePath).then(([{ data }]) => {
          shasum.update(data);
        });
      } else {
        s.on("data", data => {
          shasum.update(data);
        });
      }
      s.on("error", reject);
      s.on("end", () => {
        resolve(shasum.digest("hex"));
      });
    });
  }

  getFileStat(targetPath?: string) {
    return statAsync(targetPath || this.getSourcePath());
  }

  getDirStat(targetPath?: string) {
    return statAsync(targetPath || this.getDirPath());
  }

  getSourcePath() {
    return this.config.path;
  }

  getParsedPath(targetPath?: string) {
    return path.parse(targetPath || this.getSourcePath());
  }

  getFileName(targetPath?: string) {
    const { name, ext } = this.getParsedPath(targetPath);
    return `${name}.${ext}`;
  }

  getDirPath(targetPath?: string) {
    return this.getParsedPath(targetPath).dir;
  }

  getDirName(targetPath?: string) {
    return this.getDirPath(targetPath)
      .split(path.sep)
      .pop();
  }

  detectClassifyType() {
    const { ext } = this.getParsedPath();
    return this.config.classifyTypeByExtension[ext.toLowerCase()];
  }

  detectBaseLibraryPath(): Promise<string> {
    const type = this.detectClassifyType();
    return new Promise((resolve, reject) => {
      const baseLibraryPath = this.config.baseLibraryPathByType[type];
      if (baseLibraryPath) {
        resolve(baseLibraryPath);
      } else {
        reject(new Error("cannot detect base library path"));
      }
    });
  }

  getLibraryPath(): Promise<string> {
    return this.detectBaseLibraryPath().then(baseLibraryPath =>
      statAsync(this.getSourcePath()).then(stat =>
        path.join(
          baseLibraryPath,
          String(stat.ctime.getFullYear()),
          String(stat.ctime.getMonth() + 1)
        )
      )
    );
  }

  collectFileInfo = (): Promise<FileInfo> =>
    new Promise(resolve => {
      this.calculateHash().then(hash => {
        this.getFileStat().then(stat => {
          resolve({
            hash,
            name: this.getFileName(),
            path: this.getSourcePath(),
            timestamp: stat.ctime.getTime(),
            size: stat.size
          });
        });
      });
    });

  isAccessible(targetPath?: string) {
    return accessAsync(
      targetPath || this.getSourcePath(),
      // eslint-disable-next-line no-bitwise
      fs.constants.R_OK | fs.constants.W_OK
    );
  }

  moveToLibrary(): Promise<void> {
    const sourcePath = this.getSourcePath();
    return this.getLibraryPath().then(libraryPath =>
      renameAsync(sourcePath, this.renameService(sourcePath, libraryPath))
    );
  }
}

module.exports = FileService;
