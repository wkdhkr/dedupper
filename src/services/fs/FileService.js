// @flow
import crypto from "crypto";
import mkdirp from "mkdirp";
import fs from "fs";
import util from "util";
import path from "path";
import trash from "trash";
import type { Logger } from "log4js";

import { TYPE_IMAGE } from "./../../ClassifyTypes";

import RenameService from "./RenameService";
import ImageminService from "./ImageminService";

const { promisify } = util;

const accessAsync = promisify(fs.access);
const renameAsync = promisify(fs.rename);
const statAsync = promisify(fs.stat);
const mkdirAsync = promisify(mkdirp);

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
  log: Logger;
  config: Config;
  renameService: RenameService;
  imageminService: ImageminService;

  constructor(config: Object) {
    this.log = config.getLogger("FileService");
    this.config = config;
    this.renameService = new RenameService(this.config);
    this.imageminService = new ImageminService();
  }

  prepareDir = (targetPath: string): Promise<void> => {
    this.log.debug(`mkdir: path = ${targetPath}`);
    return this.config.dryrun ? new Promise(r => r()) : mkdirAsync(targetPath);
  };

  delete(targetPath?: string): Promise<void> {
    const finalTargetPath = targetPath || this.getSourcePath();
    this.log.debug(`delete file: path = ${finalTargetPath}`);
    return this.config.dryrun
      ? new Promise(r => r())
      : trash([finalTargetPath]);
  }

  rename(from: string, to: ?string): Promise<void> {
    const finalFrom = to ? from : this.getSourcePath();
    const finalTo = to || from;
    this.log.debug(`rename file: from = ${finalFrom} to = ${finalTo}`);
    return this.config.dryrun
      ? new Promise(r => r())
      : renameAsync(finalFrom, finalTo);
  }

  calculateHash(targetPath?: string): Promise<string> {
    const sourcePath = targetPath || this.getSourcePath();
    const shasum = crypto.createHash(this.config.hashAlgorithm);

    return new Promise((resolve, reject) => {
      const r = hash => {
        this.log.debug(`calculate hash: path = ${sourcePath} hash = ${hash}`);
        resolve(hash);
      };

      // 画像の時はメタデータを無視する
      if (this.detectClassifyType() === TYPE_IMAGE) {
        this.imageminService.run(sourcePath).then(([{ data }]) => {
          shasum.update(data);
          r(shasum.digest("hex"));
        });
      } else {
        const s = fs.createReadStream(sourcePath);
        s.on("data", data => {
          shasum.update(data);
        });
        s.on("error", reject);
        s.on("end", () => {
          r(shasum.digest("hex"));
        });
      }
    });
  }

  getFileStat(targetPath?: string): Promise<fs.Stats> {
    return statAsync(targetPath || this.getSourcePath());
  }

  getDirStat(targetPath?: string): Promise<fs.Stats> {
    return statAsync(targetPath || this.getDirPath());
  }

  getSourcePath(): string {
    return this.config.path;
  }

  getParsedPath(targetPath?: string): { [string]: string } {
    return path.parse(targetPath || this.getSourcePath());
  }

  getFileName(targetPath?: string): string {
    const { name, ext } = this.getParsedPath(targetPath);
    return `${name}${ext}`;
  }

  getDirPath(targetPath?: string): string {
    return this.getParsedPath(targetPath).dir;
  }

  getDirName(targetPath?: string): string {
    return this.getDirPath(targetPath)
      .split(path.sep)
      .pop();
  }

  detectClassifyType(): string {
    const { ext } = this.getParsedPath();
    return this.config.classifyTypeByExtension[
      ext.replace(".", "").toLowerCase()
    ];
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
    return Promise.all([this.detectBaseLibraryPath(), this.getDirStat()]).then(
      ([baseLibraryPath, { ctime }]) =>
        path.join(
          baseLibraryPath,
          String(ctime.getFullYear()),
          String(`0${ctime.getMonth() + 1}`).slice(-2)
        )
    );
  }

  collectFileInfo = (): Promise<FileInfo> =>
    new Promise(resolve => {
      Promise.all([
        this.calculateHash(),
        this.getFileStat(),
        this.getDirStat()
      ]).then(([hash, { size }, { ctime }]) => {
        resolve({
          hash,
          name: this.getFileName(),
          path: this.getSourcePath(),
          timestamp: ctime.getTime(),
          size
        });
      });
    });

  isAccessible(targetPath?: string): Promise<Boolean> {
    return accessAsync(
      targetPath || this.getSourcePath(),
      // eslint-disable-next-line no-bitwise
      fs.constants.R_OK | fs.constants.W_OK
    );
  }

  moveToLibrary(): Promise<void> {
    const sourcePath = this.getSourcePath();
    return new Promise((resolve, reject) => {
      this.getLibraryPath()
        .then(libraryPath =>
          this.renameService.converge(sourcePath, libraryPath)
        )
        .then(destPath =>
          this.prepareDir(this.getDirPath(destPath)).then(() =>
            this.rename(sourcePath, destPath).then(() => resolve())
          )
        )
        .catch(e => reject(e));
    });
  }
}

module.exports = FileService;
