// @flow
import sleep from "await-sleep";
import path from "path";
import mkdirp from "mkdirp";
import { symlink, unlink, move, pathExistsSync } from "fs-extra";
import deleteEmpty from "delete-empty";
import recursiveReadDir from "recursive-readdir";
import pify from "pify";
import trash from "trash";
import type { Logger } from "log4js";

import AttributeService from "./AttributeService";
import ContentsService from "./contents/ContentsService";
import { STATE_ACCEPTED } from "../../types/FileStates";
import type { Exact, Config, FileInfo } from "../../types";

const mkdirAsync: string => Promise<void> = pify(mkdirp);

export default class FileService {
  log: Logger;
  config: Exact<Config>;
  as: AttributeService;
  cs: ContentsService;
  getSourcePath: () => string;
  getDestPath: (targetPath?: string) => Promise<string>;
  getDirPath: (targetPath?: string) => string;
  isDirectory: (targetPath?: string) => Promise<boolean>;

  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
    this.cs = new ContentsService(config, this.as);
    this.getSourcePath = this.as.getSourcePath;
    this.getDirPath = this.as.getDirPath;
    this.getDestPath = this.as.getDestPath;
    this.isDirectory = this.as.isDirectory;
  }

  createSymLink = (from: string, to: string): Promise<void> => {
    if (this.config.dryrun) {
      return Promise.resolve();
    }
    if (pathExistsSync(to)) {
      this.log.warn(`symlink exists already: path = ${to}`);
      return Promise.resolve();
    }
    return symlink(path.resolve(from), to);
  };

  unlink = (targetPath: string): Promise<void> => unlink(targetPath);

  prepareDir = async (
    targetPath: string,
    force: boolean = false
  ): Promise<void> => {
    if (await this.isDirectory(targetPath)) {
      return;
    }
    this.log.debug(`mkdir: path = ${targetPath}`);
    if (!this.config.dryrun || !force) {
      await mkdirAsync(targetPath);
    }
  };

  async collectFilePaths(targetPath?: string): Promise<string[]> {
    return recursiveReadDir(targetPath || this.getSourcePath());
  }

  async delete(targetPath?: string): Promise<void> {
    const finalTargetPath = targetPath || this.getSourcePath();
    const stats = await this.as.getStat(finalTargetPath);

    if (stats.isSymbolicLink() === false) {
      this.log.warn(`delete file/dir: path = ${finalTargetPath}`);
    }

    if (!this.config.dryrun) {
      if (stats.isSymbolicLink()) {
        await this.unlink(finalTargetPath);
      } else {
        await trash([finalTargetPath]);
      }
      await this.waitDelete(finalTargetPath);
    }
  }

  waitDelete = async (targetPath: string): Promise<void> => {
    let i = 0;
    while (pathExistsSync(targetPath)) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
      i += 1;
      if (i === 60) {
        throw new Error(`wait delete timeout path = ${targetPath}`);
      }
    }
  };

  rename(from: string, to?: string): Promise<void> {
    const finalFrom = to ? from : this.getSourcePath();
    const finalTo = to || from;
    this.log.info(`rename file: from = ${finalFrom}, to = ${finalTo}`);
    return this.config.dryrun ? Promise.resolve() : move(finalFrom, finalTo);
  }

  async deleteEmptyDirectory(targetPath?: string): Promise<void> {
    if (!this.config.dryrun) {
      try {
        const deletedDirs = await pify(deleteEmpty)(
          targetPath || this.as.getSourcePath(),
          { verbose: false }
        );
        deletedDirs.forEach(d =>
          this.log.info(`delete empty dir: path = ${d}`)
        );
      } catch (e) {
        this.log.warn(e);
      }
    }
  }

  collectFileInfo = (): Promise<FileInfo> =>
    Promise.all([
      this.cs.calculatePHash(),
      this.cs.calculateDHash(),
      this.cs.readInfo(),
      this.as.getFileStat(),
      this.as.getDirStat(),
      this.getDestPath()
    ]).then(([pHash, dHash, info, { size }, { birthtime }, destPath]) => ({
      p_hash: pHash,
      d_hash: dHash,
      name: this.as.getFileName(),
      type: this.as.detectClassifyType(),
      from_path: this.as.getSourcePath(),
      to_path: destPath,
      timestamp: birthtime.getTime(),
      size,
      state: STATE_ACCEPTED,
      ...info
    }));

  async moveToLibrary(
    priorDestPath?: string,
    isReplace?: boolean
  ): Promise<string> {
    let destPath = priorDestPath || (await this.getDestPath());
    if (isReplace) {
      if (pathExistsSync(destPath)) {
        // avoid overwrite, use recyclebin
        await this.delete(destPath);
      }
    } else {
      let i = 1;
      const originalDestPath = destPath;
      while (pathExistsSync(destPath)) {
        const parsedPath = this.as.getParsedPath(originalDestPath);
        destPath = path.join(
          parsedPath.dir,
          `${parsedPath.name}_${i}${parsedPath.ext}`
        );
        i += 1;
      }
    }
    await this.prepareDir(this.as.getDirPath(destPath));
    await this.rename(this.as.getSourcePath(), destPath);
    return destPath;
  }
}
