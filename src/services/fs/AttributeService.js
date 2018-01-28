// @flow
import fs from "fs-extra";
import path from "path";
import type { Logger } from "log4js";

import RenameService from "./RenameService";
import { TYPE_UNKNOWN } from "../../types/ClassifyTypes";
import type { ClassifyType } from "../../types/ClassifyTypes";
import type { Exact, Config } from "../../types";

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
    return fs.stat(targetPath || this.getSourcePath());
  }

  getDirStat(targetPath?: string): Promise<fs.Stats> {
    return fs.stat(targetPath || this.getDirPath());
  }

  async getLibraryPath(): Promise<string> {
    const { birthtime } = await this.getFileStat();
    return path.join(
      this.detectBaseLibraryPath(),
      String(birthtime.getFullYear()),
      String(`0${birthtime.getMonth() + 1}`).slice(-2)
    );
  }

  async getDestPath(targetPath?: string): Promise<string> {
    return this.renameService.converge(
      targetPath || this.getSourcePath(),
      await this.getLibraryPath()
    );
  }

  async isDirectory(targetPath?: string): Promise<boolean> {
    return (await fs.lstat(targetPath || this.getSourcePath())).isDirectory();
  }

  isAccessible(targetPath?: string): Promise<boolean> {
    return fs
      .access(
        targetPath || this.getSourcePath(),
        // eslint-disable-next-line no-bitwise
        fs.constants.R_OK | fs.constants.W_OK
      )
      .then(() => true)
      .catch(() => false);
  }
}
