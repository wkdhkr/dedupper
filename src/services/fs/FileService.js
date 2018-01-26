// @flow
import path from "path";
import mkdirp from "mkdirp";
import { move, pathExistsSync } from "fs-extra";
import { promisify } from "util";
import trash from "trash";
import type { Logger } from "log4js";

import type { Exact, Config, FileInfo } from "../../types";

import AttributeService from "./AttributeService";
import ContentsService from "./contents/ContentsService";

const mkdirAsync: string => Promise<void> = promisify(mkdirp);

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

  prepareDir = (targetPath: string, force: boolean = false): Promise<void> => {
    this.log.debug(`mkdir: path = ${targetPath}`);
    return this.config.dryrun && !force
      ? Promise.resolve()
      : mkdirAsync(targetPath);
  };

  delete(targetPath?: string): Promise<void> {
    const finalTargetPath = targetPath || this.as.getSourcePath();
    this.log.warn(`delete file: path = ${finalTargetPath}`);
    return this.config.dryrun ? Promise.resolve() : trash([finalTargetPath]);
  }

  rename(from: string, to?: string): Promise<void> {
    const finalFrom = to ? from : this.as.getSourcePath();
    const finalTo = to || from;
    this.log.info(`rename file: from = ${finalFrom}, to = ${finalTo}`);
    return this.config.dryrun ? Promise.resolve() : move(finalFrom, finalTo);
  }

  async getDestPath(targetPath?: string): Promise<string> {
    return this.as.getDestPath(targetPath);
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

  async moveToLibrary(priorDestPath?: string): Promise<string> {
    let destPath = priorDestPath || (await this.getDestPath());
    let i = 1;
    while (pathExistsSync(destPath)) {
      const parsedPath = this.as.getParsedPath(destPath);
      destPath = path.join(
        parsedPath.dir,
        `${parsedPath.name}_${i}${parsedPath.ext}`
      );
      i += 1;
    }
    await this.prepareDir(destPath);
    await this.rename(this.as.getSourcePath(), destPath);
    return destPath;
  }
}
