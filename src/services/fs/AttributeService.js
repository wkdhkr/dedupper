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

  isSameDir(a: string, b?: string): boolean {
    return this.getDirPath(a) === this.getDirPath(b || undefined);
  }

  getSourcePath = (): string => {
    if (this.config.path) {
      return this.config.path;
    }
    throw new Error("no source path.");
  };

  getParsedPath = (
    targetPath?: string
  ): {
    base: string,
    dir: string,
    ext: string,
    name: string,
    root: string
  } => path.parse(targetPath || this.getSourcePath());

  getFileName(targetPath?: string): string {
    const { name, ext } = this.getParsedPath(targetPath);
    return `${name}${ext}`;
  }

  getDirPath = (targetPath?: string): string => {
    if (this.isDirectory(targetPath)) {
      return targetPath;
    }

    return this.getParsedPath(targetPath).dir;
  };

  getDirName = (targetPath?: string): string =>
    path.basename(this.getDirPath(targetPath));

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
    return this.getStat(targetPath || this.getSourcePath());
  }

  getStat = (targetPath: string): Promise<fs.Stats> => fs.stat(targetPath);

  getDirStat(targetPath?: string): Promise<fs.Stats> {
    return this.getStat(targetPath || this.getDirPath());
  }

  async getLibraryPath(): Promise<string> {
    const { birthtime, mtime } = await this.getDirStat();
    // const { birthtime, mtime } = await this.getFileStat();
    const useTime = birthtime > mtime ? mtime : birthtime;
    return path.join(
      this.detectBaseLibraryPath(),
      String(useTime.getFullYear()),
      String(`0${useTime.getMonth() + 1}`).slice(-2)
    );
  }

  getDestPath = async (targetPath?: string): Promise<string> =>
    this.renameService.converge(
      targetPath || this.getSourcePath(),
      await this.getLibraryPath()
    );

  isDirectory = (targetPath?: string): boolean => {
    try {
      return fs.lstatSync(targetPath || this.getSourcePath()).isDirectory();
    } catch (e) {
      return false;
    }
  };

  isAccessible(targetPath?: string): Promise<boolean> {
    if (targetPath === this.config.dummyPath) {
      return Promise.resolve(false);
    }
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
