// @flow
const fs = require("fs");
const util = require("util");
const path = require("path");
const crypto = require("crypto");

const { promisify } = util;

const accessAsync = promisify(fs.access);
const renameAsync = promisify(fs.rename);
const unlinkAsync = promisify(fs.unlink);
const statAsync = promisify(fs.stat);

class FileService {
  config: {
    path: string,
    classifyTypeByExtension: { [string]: string },
    baseLibraryPathByType: { [string]: string },
    baseDirPathPattern: string,
    quarantineBaseDirPath: string,
    rejectBaseDirPath: string,
    hashAlgorithm: string
  };

  constructor(config: Object) {
    this.config = config;
  }

  delete(targetPath?: string) {
    return unlinkAsync(targetPath || this.getSourcePath());
  }

  calculateHash(targetPath?: string): Promise<string> {
    const shasum = crypto.createHash(this.config.hashAlgorithm);

    return new Promise((resolve, reject) => {
      // Updating shasum with file content
      const s = fs.createReadStream(targetPath || this.getSourcePath());
      s.on("data", data => {
        shasum.update(data);
      });
      s.on("error", reject);
      s.on("end", () => {
        resolve(shasum.digest("hex"));
      });
    });
  }

  getFileStat(targetPath?: string) {
    return statAsync(targetPath || this.getSourcePath());
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

  getQuarantinePath() {
    return this.getSourcePath().replace(
      this.config.baseDirPathPattern,
      this.config.quarantineBaseDirPath
    );
  }

  getRejectPath() {
    return this.getSourcePath().replace(
      this.config.baseDirPathPattern,
      this.config.rejectBaseDirPath
    );
  }

  detectClassifyType() {
    const { ext } = this.getParsedPath();
    return this.config.classifyTypeByExtension[ext];
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
      statAsync(this.getSourcePath()).then(stat => {
        const createDate = new Date(util.inspect(stat.ctime));
        return path.join(
          baseLibraryPath,
          String(createDate.getFullYear()),
          String(createDate.getMonth() + 1)
        );
      })
    );
  }

  isAccessible(targetPath?: string) {
    return accessAsync(
      targetPath || this.getSourcePath(),
      // eslint-disable-next-line no-bitwise
      fs.constants.R_OK | fs.constants.W_OK
    );
  }

  moveToQuarantine() {
    return renameAsync(this.getSourcePath(), this.getQuarantinePath());
  }

  moveToReject() {
    return renameAsync(this.getSourcePath(), this.getRejectPath());
  }

  moveToLibrary(): Promise<void> {
    return this.getLibraryPath().then(libraryPath =>
      renameAsync(this.getSourcePath(), libraryPath)
    );
  }
}

module.exports = FileService;
