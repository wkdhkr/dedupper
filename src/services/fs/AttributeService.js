// @flow
import fs from "fs-extra";
import { promisify } from "util";
import path from "path";
import type { Logger } from "log4js";

import RenameService from "./RenameService";
import { TYPE_UNKNOWN } from "../../types/ClassifyTypes";
import type { ClassifyType } from "../../types/ClassifyTypes";
import type { Exact, Config } from "../../types";

const accessAsync = promisify(fs.access);
const statAsync = promisify(fs.stat);

export default class AttributeService {
  log: Logger;
  config: Exact<Config>;
  renameService: RenameService;

  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
    this.renameService = new RenameService(config);
  }

  getSourcePath(): string {
    if (this.config.path) {
      return this.config.path;
    }
    throw new Error("no source path.");
  }

  getParsedPath(
    targetPath?: string
  ): {
    base: string,
    dir: string,
    ext: string,
    name: string,
    root: string
  } {
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
    return path.basename(this.getDirPath(targetPath));
  }

  detectClassifyType(targetPath?: string): ClassifyType {
    const { ext } = this.getParsedPath(targetPath);
    return (
      this.config.classifyTypeByExtension[ext.replace(".", "").toLowerCase()] ||
      TYPE_UNKNOWN
    );
  }

  detectBaseLibraryPath(): string {
    const type = this.detectClassifyType();
    const baseLibraryPath = this.config.baseLibraryPathByType[type];
    return baseLibraryPath || this.getDirPath();
  }

  getFileStat(targetPath?: string): Promise<fs.Stats> {
    return statAsync(targetPath || this.getSourcePath());
  }

  getDirStat(targetPath?: string): Promise<fs.Stats> {
    return statAsync(targetPath || this.getDirPath());
  }

  getLibraryPath(): Promise<string> {
    return this.getDirStat().then(({ ctime }) =>
      path.join(
        this.detectBaseLibraryPath(),
        String(ctime.getFullYear()),
        String(`0${ctime.getMonth() + 1}`).slice(-2)
      )
    );
  }

  async getDestPath(): Promise<string> {
    return this.renameService.converge(
      this.getSourcePath(),
      await this.getLibraryPath()
    );
  }

  isAccessible(targetPath?: string): Promise<boolean> {
    return accessAsync(
      targetPath || this.getSourcePath(),
      // eslint-disable-next-line no-bitwise
      fs.constants.R_OK | fs.constants.W_OK
    )
      .then(() => true)
      .catch(() => false);
  }
}
