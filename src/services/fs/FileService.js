// @flow
import crypto from "crypto";
import mkdirp from "mkdirp";
import fs from "fs-extra";
import util from "util";
import path from "path";
import trash from "trash";
import type { Logger } from "log4js";

import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import type { Exact, Config, FileInfo } from "../../types";

import RenameService from "./RenameService";
import ImageminService from "./ImageminService";

const { promisify } = util;

const accessAsync = promisify(fs.access);
const moveAsync = promisify(fs.move);
const statAsync = promisify(fs.stat);
const mkdirAsync = promisify(mkdirp);

export default class FileService {
  log: Logger;
  config: Exact<Config>;
  renameService: RenameService;
  imageminService: ImageminService;

  constructor(config: Exact<Config>) {
    this.log = config.getLogger("FileService");
    this.config = config;
    this.renameService = new RenameService(this.config);
    this.imageminService = new ImageminService();
  }

  prepareDir = (targetPath: string, force: boolean = false): Promise<void> => {
    this.log.debug(`mkdir: path = ${targetPath}`);
    return this.config.dryrun && !force
      ? new Promise(r => r())
      : mkdirAsync(targetPath);
  };

  delete(targetPath?: string): Promise<void> {
    const finalTargetPath = targetPath || this.getSourcePath();
    this.log.info(`delete file: path = ${finalTargetPath}`);
    return this.config.dryrun
      ? new Promise(r => r())
      : trash([finalTargetPath]);
  }

  rename(from: string, to: ?string): Promise<void> {
    const finalFrom = to ? from : this.getSourcePath();
    const finalTo = to || from;
    this.log.info(`rename file: from = ${finalFrom} to = ${finalTo}`);
    return this.config.dryrun
      ? new Promise(r => r())
      : moveAsync(finalFrom, finalTo);
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
        this.imageminService
          .run(sourcePath)
          .then(([{ data }]) => {
            shasum.update(data);
            r(shasum.digest("hex"));
          })
          .catch(reject);
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

  getDestPath(): Promise<string> {
    return this.getLibraryPath().then(libraryPath =>
      this.renameService.converge(this.getSourcePath(), libraryPath)
    );
  }

  collectFileInfo = (): Promise<FileInfo> =>
    new Promise((resolve, reject) => {
      Promise.all([
        this.calculateHash(),
        this.getFileStat(),
        this.getDirStat(),
        this.getDestPath()
      ])
        .then(([hash, { size }, { ctime }, destPath]) => {
          resolve({
            hash,
            name: this.getFileName(),
            from_path: this.getSourcePath(),
            to_path: destPath,
            timestamp: ctime.getTime(),
            size
          });
        })
        .catch(e => reject(e));
    });

  isAccessible(targetPath?: string): Promise<Boolean> {
    return accessAsync(
      targetPath || this.getSourcePath(),
      // eslint-disable-next-line no-bitwise
      fs.constants.R_OK | fs.constants.W_OK
    );
  }

  moveToLibrary(): Promise<void> {
    return this.getDestPath()
      .then(destPath =>
        this.prepareDir(this.getDirPath(destPath)).then(() => destPath)
      )
      .then(destPath => this.rename(this.getSourcePath(), destPath));
  }
}
