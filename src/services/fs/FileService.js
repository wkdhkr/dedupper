// @flow
import sleep from "await-sleep";
import path from "path";
import mkdirp from "mkdirp";
import { move, pathExistsSync } from "fs-extra";
import deleteEmpty from "delete-empty";
import recursiveReadDir from "recursive-readdir";
import pify from "pify";
import trash from "trash";
import type { Logger } from "log4js";

import type { Exact, Config, FileInfo } from "../../types";

import AttributeService from "./AttributeService";
import ContentsService from "./contents/ContentsService";

const mkdirAsync: string => Promise<void> = pify(mkdirp);

export default class FileService {
  log: Logger;
  config: Exact<Config>;
  as: AttributeService;
  cs: ContentsService;

  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
    this.cs = new ContentsService(config, this.as);
  }

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
    return recursiveReadDir(targetPath || this.as.getSourcePath());
  }

  async isDirectory(targetPath?: string): Promise<boolean> {
    return this.as.isDirectory(targetPath);
  }

  async delete(targetPath?: string): Promise<void> {
    const finalTargetPath = targetPath || this.as.getSourcePath();
    this.log.warn(`delete file: path = ${finalTargetPath}`);
    if (!this.config.dryrun) {
      await trash([finalTargetPath]);
    }
  }

  waitDelete = async (targetPath: string): Promise<void> => {
    let i = 0;
    while (pathExistsSync(targetPath)) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
      i += 1;
      if (i === 60) {
        break;
      }
    }
  };

  rename(from: string, to?: string): Promise<void> {
    const finalFrom = to ? from : this.as.getSourcePath();
    const finalTo = to || from;
    this.log.info(`rename file: from = ${finalFrom}, to = ${finalTo}`);
    return this.config.dryrun ? Promise.resolve() : move(finalFrom, finalTo);
  }

  async getDestPath(targetPath?: string): Promise<string> {
    return this.as.getDestPath(targetPath);
  }

  async deleteEmptyDirectory(targetPath?: string): Promise<void> {
    if (!this.config.dryrun) {
      const deletedDirs = await pify(deleteEmpty)(
        targetPath || this.as.getSourcePath(),
        { verbose: false }
      );
      deletedDirs.forEach(d => this.log.info(`delete empty dir: path = ${d}`));
    }
  }

  collectFileInfo = (): Promise<FileInfo> =>
    Promise.all([
      this.cs.calculateHash(),
      this.cs.calculatePHash(),
      this.cs.readInfo(),
      this.as.getFileStat(),
      this.as.getDirStat(),
      this.getDestPath()
    ]).then(([hash, pHash, info, { size }, { birthtime }, destPath]) => ({
      hash,
      p_hash: pHash,
      name: this.as.getFileName(),
      type: this.as.detectClassifyType(),
      from_path: this.as.getSourcePath(),
      to_path: destPath,
      timestamp: birthtime.getTime(),
      size,
      ...info
    }));

  async moveToLibrary(
    priorDestPath?: string,
    isReplace?: boolean
  ): Promise<string> {
    let destPath = priorDestPath || (await this.getDestPath());
    if (isReplace) {
      if (pathExistsSync(destPath)) {
        await this.delete(destPath);
      }
    } else {
      let i = 1;
      while (pathExistsSync(destPath)) {
        const parsedPath = this.as.getParsedPath(destPath);
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
