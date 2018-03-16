// @flow
import touch from "touch";
import pify from "pify";
import winattr from "winattr";
import fs from "fs-extra";
import path from "path";
import type { Logger } from "log4js";
import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import DateHelper from "../../helpers/DateHelper";
import RenameService from "./RenameService";
import {
  TYPE_UNKNOWN,
  TYPE_DEDUPPER_LOCK,
  TYPE_DEDUPPER_CACHE
} from "../../types/ClassifyTypes";
import { STATE_KEEPING, STATE_ACCEPTED } from "../../types/FileStates";

import type { ClassifyType } from "../../types/ClassifyTypes";
import type { FileState } from "../../types/FileStates";
import FileSystemHelper from "../../helpers/FileSystemHelper";
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

  getState = (targetPath?: string): FileState => {
    if (!targetPath || this.getSourcePath() === path.resolve(targetPath)) {
      if (this.config.keep) {
        return STATE_KEEPING;
      }
    }
    return STATE_ACCEPTED;
  };

  isSameDir(a: string, b?: string): boolean {
    return this.getDirPath(a) === this.getDirPath(b || undefined);
  }

  getSourcePath = (targetPath?: string): string => {
    if (this.config.path) {
      return path.resolve(targetPath || this.config.path);
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
    return AttributeService.detectClassifyTypeByExtenstion(
      ext,
      this.config.classifyTypeByExtension
    );
  }

  static detectClassifyTypeByExtenstion = (
    ext: string,
    classifyTypeByExtension: { string: ClassifyType }
  ): ClassifyType => {
    if (ext === ".dplock") {
      return TYPE_DEDUPPER_LOCK;
    }
    if (ext === ".dpcache") {
      return TYPE_DEDUPPER_CACHE;
    }
    return (
      classifyTypeByExtension[ext.replace(".", "").toLowerCase()] ||
      TYPE_UNKNOWN
    );
  };

  static detectClassifyTypeByConfig = (config: Config): ClassifyType => {
    if (!config.path) {
      throw new Error("no source path.");
    }
    const { ext } = path.parse(config.path);
    return AttributeService.detectClassifyTypeByExtenstion(
      ext,
      config.classifyTypeByExtension
    );
  };

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

  getLibraryDate = (): Date => {
    const { currentDate } = DateHelper;
    return new Date(
      currentDate.getTime() - this.config.libraryPathHourOffset * 60 * 60 * 1000
    );
  };

  getLibraryPath(): string {
    // const { birthtime, mtime } = await this.getDirStat();
    // const { birthtime, mtime } = await this.getFileStat();
    // const useTime = birthtime > mtime ? mtime : birthtime;
    const useTime = this.getLibraryDate();
    return path.join(
      this.detectBaseLibraryPath(),
      useTime.getFullYear().toString(),
      `${`0${useTime.getMonth() + 1}`.slice(
        -2
      )}-${`0${useTime.getDate()}`.slice(-2)}`
    );
  }

  getName = async (targetPath?: string): Promise<string> =>
    this.getParsedPath(
      FileNameMarkHelper.strip(targetPath || (await this.getDestPath()))
    ).name;

  getDestPath = async (targetPath?: string): Promise<string> =>
    this.renameService.converge(
      targetPath || this.getSourcePath(),
      this.getLibraryPath()
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

  isDirectory = (targetPath?: string): boolean =>
    FileSystemHelper.isDirectory(targetPath || this.getSourcePath());

  touch = async (targetPath: string, force: boolean = false): Promise<void> =>
    !this.config.dryrun || force ? pify(touch)(targetPath) : Promise.resolve();

  hide = async (targetPath: string, force: boolean = false): Promise<void> =>
    !this.config.dryrun || force
      ? pify(winattr.set)(targetPath, { hidden: true })
      : Promise.resolve();

  touchHide = async (
    targetPath: string,
    force: boolean = false
  ): Promise<void> => {
    await this.touch(targetPath, force);
    await this.hide(targetPath, force);
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
