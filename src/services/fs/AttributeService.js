// @flow
import touch from "touch";
import pify from "pify";
import winattr from "winattr";
import fs from "fs-extra";
import path from "path";
import type { Logger } from "log4js";

import RenameService from "./RenameService";
import {
  TYPE_UNKNOWN,
  TYPE_DEDUPPER_LOCK,
  TYPE_DEDUPPER_CACHE
} from "../../types/ClassifyTypes";
import type { ClassifyType } from "../../types/ClassifyTypes";
import type { Config } from "../../types";

export default class AttributeService {
  log: Logger;
  config: Config;
  renameService: RenameService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.renameService = new RenameService(config);
  }

  isSameDir(a: string, b?: string): boolean {
    return this.getDirPath(a) === this.getDirPath(b || undefined);
  }

  getSourcePath = (): string => {
    if (this.config.path) {
      return path.resolve(this.config.path);
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
    if (targetPath && this.isDirectory(targetPath)) {
      return targetPath;
    }

    return this.getParsedPath(targetPath).dir;
  };

  getDirName = (targetPath?: string): string =>
    path.basename(this.getDirPath(targetPath));

  detectClassifyType(targetPath?: string): ClassifyType {
    const { ext } = this.getParsedPath(targetPath);
    if (ext === ".dplock") {
      return TYPE_DEDUPPER_LOCK;
    }
    if (ext === ".dpcache") {
      return TYPE_DEDUPPER_CACHE;
    }
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

  isDeadLink = async (targetPath?: string): Promise<boolean> => {
    try {
      const finalTargetPath = targetPath || this.getSourcePath();
      const destPath = await fs.readlink(finalTargetPath);

      try {
        await fs.stat(destPath);
        return false;
      } catch (e) {
        return true;
      }
    } catch (e) {
      return false;
    }
  };

  isDirectory = (targetPath?: string): boolean => {
    try {
      return fs.lstatSync(targetPath || this.getSourcePath()).isDirectory();
    } catch (e) {
      return false;
    }
  };

  touch = async (targetPath: string): Promise<void> =>
    !this.config.dryrun ? pify(touch)(targetPath) : Promise.resolve();

  hide = async (targetPath: string): Promise<void> =>
    !this.config.dryrun
      ? pify(winattr.set)(targetPath, { hidden: true })
      : Promise.resolve();

  touchHide = async (targetPath: string): Promise<void> => {
    await this.touch(targetPath);
    await this.hide(targetPath);
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
