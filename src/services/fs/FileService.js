// @flow
import waitOn from "wait-on";
import { exec } from "child-process-promise";
import sleep from "await-sleep";
import mv from "mv";
import path from "path";
import mkdirp from "mkdirp";
import { writeFile, symlink, unlink, pathExists } from "fs-extra";
import deleteEmpty from "delete-empty";
import recursiveReadDir from "recursive-readdir";
import pify from "pify";
import trash from "trash";

import type { Logger } from "log4js";
import AttributeService from "./AttributeService";
import FileCacheService from "./FileCacheService";
import ContentsService from "./contents/ContentsService";
import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import {
  TYPE_IMAGE,
  TYPE_DEDUPPER_CACHE,
  TYPE_DEDUPPER_LOCK
} from "../../types/ClassifyTypes";
import { STATE_ERASED } from "../../types/FileStates";
import {
  DELETE_MODE_MOVE,
  DELETE_MODE_ERASE
} from "../../types/DeleteModeTypes";
import type { Config, FileInfo } from "../../types";

const mvAsync: (string, string) => Promise<void> = pify(mv);
const mkdirAsync: string => Promise<void> = pify(mkdirp);

export default class FileService {
  log: Logger;

  config: Config;

  as: AttributeService;

  cs: ContentsService;

  fcs: FileCacheService;

  getSourcePath: (targetPath?: string) => string;

  getDestPath: (targetPath?: string) => Promise<string>;

  getDirPath: (targetPath?: string) => string;

  isDirectory: (targetPath?: string) => boolean;

  isDeadLink: (targetPath?: string) => Promise<boolean>;

  isArchive: (targetPath?: string) => boolean;

  isLibraryPlace: (targetPath?: string) => boolean;

  cleanCacheFile: (targetPath?: string, force?: boolean) => Promise<void>;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
    this.cs = new ContentsService(config, this.as);
    this.fcs = new FileCacheService(config, this.as);
    this.getSourcePath = this.as.getSourcePath;
    this.getDirPath = this.as.getDirPath;
    this.getDestPath = this.as.getDestPath;
    this.isDirectory = this.as.isDirectory;
    this.isDeadLink = this.as.isDeadLink;
    this.isArchive = this.as.isArchive;
    this.isLibraryPlace = (...args) => this.as.isLibraryPlace(...args);
    this.cleanCacheFile = this.fcs.clean;
  }

  pathExists = async (targetPath: string) => pathExists(targetPath);

  write = async (targetPath: string, content: any): Promise<void> =>
    writeFile(targetPath, content);

  extractArchive = async () => {
    const execCommand = [
      this.config.archiveExtractCommand,
      JSON.stringify(this.getSourcePath())
    ].join(" ");
    if (!this.config.dryrun) {
      await exec(execCommand);
    }
  };

  wait = (targetPath?: string): Promise<void> =>
    new Promise((resolve, reject) => {
      waitOn(
        {
          resources: [path.resolve(targetPath || this.getSourcePath())],
          timeout: 60000
        },
        err => {
          if (err) {
            reject();
            return;
          }
          resolve();
        }
      );
    });

  createSymLink = async (from: string, to: string): Promise<void> => {
    if (this.config.dryrun) {
      return;
    }
    if (await pathExists(to)) {
      this.log.warn(`symlink exists already: path = ${to}`);
      return;
    }
    symlink(path.resolve(from), to);
  };

  unlink = async (targetPath?: string): Promise<void> => {
    const finalTargetPath = this.getSourcePath(targetPath);
    this.log.debug(`unlink: path = ${finalTargetPath}`);
    if (this.config.dryrun) {
      return;
    }
    await unlink(finalTargetPath);
    await this.waitDelete(finalTargetPath);
  };

  prepareDir = async (
    targetPath: string,
    force: boolean = false
  ): Promise<void> => {
    if (await this.isDirectory(targetPath)) {
      return;
    }
    this.log.debug(`mkdir: path = ${targetPath}`);
    if (!this.config.dryrun || force) {
      await mkdirAsync(targetPath);
    }
  };

  collectFilePaths = async (targetPath?: string): Promise<string[]> =>
    recursiveReadDir(targetPath || this.getSourcePath());

  async isMinorFile(targetPath: string): Promise<boolean> {
    const stats = await this.as.getStat(targetPath);
    if (stats.isSymbolicLink()) {
      return true;
    }
    if (
      [TYPE_DEDUPPER_CACHE, TYPE_DEDUPPER_LOCK].includes(
        this.as.detectClassifyType(targetPath)
      )
    ) {
      return true;
    }
    return false;
  }

  async delete(targetPath?: string, isRetry: boolean = false) {
    const finalTargetPath = this.getSourcePath(targetPath);
    if (!(await pathExists(finalTargetPath))) {
      return;
    }
    try {
      const isMinorFile = await this.isMinorFile(finalTargetPath);
      if (isMinorFile === false && !isRetry) {
        this.log.warn(`delete file/dir: path = ${finalTargetPath}`);
      }

      if (!this.config.dryrun) {
        if (isMinorFile) {
          await this.unlink(finalTargetPath);
          return;
        }
        await this.handleDelete(finalTargetPath);
      }
    } catch (e) {
      // retry. avoid EBUSY error
      // this.log.warn(e);
      if (await pathExists(finalTargetPath)) {
        await sleep(200);
        await this.delete(finalTargetPath);
      }
    }
  }

  waitDelete = async (targetPath: string): Promise<void> => {
    let i = 0;
    // eslint-disable-next-line no-await-in-loop
    while (await pathExists(targetPath)) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(200);
      i += 1;
      if (i === 60 * 5) {
        throw new Error(`wait delete timeout path = ${targetPath}`);
      }
    }
  };

  handleDelete = async (targetPath: string): Promise<void> => {
    this.log.info(`delete path = ${targetPath}`);
    if (this.config.deleteMode === DELETE_MODE_MOVE) {
      const parsedPath = path.parse(targetPath);
      const destPath = path.join(
        parsedPath.root,
        // TODO: config
        ".trash",
        parsedPath.dir.replace(parsedPath.root, ""),
        parsedPath.base
      );
      // TODO: move to rename function
      await this.prepareDir(this.as.getDirPath(destPath));
      await this.rename(targetPath, destPath);
    } else if (this.config.deleteMode === DELETE_MODE_ERASE) {
      await this.unlink(targetPath);
    } else {
      await trash([targetPath], { glob: false });
    }
    await this.waitDelete(targetPath);
  };

  async rename(from: string, to?: string, isRetry: boolean = false) {
    const finalFrom = to ? from : this.getSourcePath();
    const finalTo = to || from;
    if (finalFrom === finalTo) {
      return;
    }
    if (!isRetry) {
      this.log.info(`rename file: from = ${finalFrom}, to = ${finalTo}`);
    }
    if (this.config.dryrun) {
      return;
    }
    try {
      await mvAsync(finalFrom, finalTo);
      return;
    } catch (e) {
      // retry. avoid EBUSY error
      this.log.warn(e);
      if (await pathExists(finalFrom)) {
        await sleep(200);
        await this.rename(finalFrom, finalTo, true);
        return;
      }
      throw e;
    }
  }

  createDedupperLock = async (dirPath: string): Promise<void> =>
    this.as.touchHide(path.join(dirPath, `${process.pid}.dplock`));

  async deleteEmptyDirectory(targetPath?: string) {
    if (!this.config.dryrun) {
      try {
        await sleep(3000);
        const deletedDirs = await pify(deleteEmpty)(
          targetPath || this.as.getSourcePath(),
          { verbose: false }
        );
        (deletedDirs || []).forEach(d =>
          this.log.info(`delete empty dir: path = ${d}`)
        );
      } catch (e) {
        this.log.warn(e);
      }
    }
  }

  fillInsertFileInfo = async (fileInfo: FileInfo): Promise<FileInfo> => {
    let filledInfo = fileInfo;
    const isImageHashNeeded =
      fileInfo.state !== STATE_ERASED && fileInfo.type === TYPE_IMAGE;
    if (isImageHashNeeded && !fileInfo.p_hash) {
      const pHash = await this.cs.calculatePHash();
      if (!pHash) {
        throw new Error("cannot fill pHash");
      }
      filledInfo = {
        ...filledInfo,
        p_hash: pHash
      };
      await this.fcs.write(filledInfo);
    }
    if (isImageHashNeeded && !fileInfo.d_hash) {
      const dHash = await this.cs.calculateDHash();
      if (!dHash) {
        throw new Error("cannot fill dHash");
      }
      filledInfo = {
        ...filledInfo,
        d_hash: dHash
      };
      await this.fcs.write(filledInfo);
    }
    return filledInfo;
  };

  fillCachedFileInfo = async (cachedFileInfo: FileInfo): Promise<FileInfo> => {
    if (
      cachedFileInfo.type === TYPE_IMAGE &&
      !cachedFileInfo.d_hash &&
      this.config.pHash
    ) {
      const filledInfo = {
        ...cachedFileInfo,
        d_hash: await this.cs.calculateDHash(cachedFileInfo.from_path)
      };
      await this.fcs.write(filledInfo);
      return filledInfo;
    }
    return cachedFileInfo;
  };

  collectFileInfo = async (): Promise<FileInfo> => {
    const cachedFileInfo = await this.fcs.load();
    if (cachedFileInfo) {
      return this.fillCachedFileInfo(cachedFileInfo);
    }
    const fileInfo = await Promise.all([
      this.config.pHash ? this.cs.calculatePHash() : Promise.resolve(),
      this.config.pHash ? this.cs.calculateDHash() : Promise.resolve(),
      this.cs.readInfo(),
      this.as.getFileStat(),
      this.getDestPath(),
      this.as.getName()
    ]).then(([pHash, dHash, info, { size, birthtime }, destPath, name]) => ({
      p_hash: pHash,
      d_hash: dHash,
      name,
      type: this.as.detectClassifyType(),
      from_path: this.as.getSourcePath(),
      to_path: destPath,
      timestamp: birthtime.getTime(),
      size,
      state: this.as.getState(),
      ...info
    }));

    await this.fcs.write(fileInfo);
    return fileInfo;
  };

  async getFinalDestPath(
    priorDestPath?: string,
    isReplace?: boolean
  ): Promise<string> {
    let destPath = priorDestPath || (await this.getDestPath());
    if (this.config.manual) {
      destPath = FileNameMarkHelper.strip(this.getSourcePath());
    } else if (!isReplace) {
      let i = 1;
      const originalDestPath = destPath;
      // eslint-disable-next-line no-await-in-loop
      while (await pathExists(destPath)) {
        const parsedPath = this.as.getParsedPath(originalDestPath);
        destPath = path.join(
          parsedPath.dir,
          `${parsedPath.name}_${i}${parsedPath.ext}`
        );
        i += 1;
      }
    }
    return destPath;
  }

  async moveToLibrary(
    priorDestPath?: string,
    isReplace?: boolean
  ): Promise<string> {
    const destPath = await this.getFinalDestPath(priorDestPath, isReplace);
    if (isReplace && (await pathExists(destPath))) {
      // avoid overwrite, use recyclebin
      await this.delete(destPath);
    }
    await this.prepareDir(this.as.getDirPath(destPath));
    await this.rename(this.as.getSourcePath(), destPath);
    return destPath;
  }
}
