// @flow
import { Logger } from "log4js";
import touch from "touch";
import pify from "pify";
import winattr from "winattr";
import fs from "fs-extra";
import path from "path";
import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import DateHelper from "../../helpers/DateHelper";
import RenameService from "./RenameService";
import {
  TYPE_UNKNOWN,
  TYPE_DEDUPPER_LOCK,
  TYPE_DEDUPPER_CACHE,
  TYPE_ARCHIVE
} from "../../types/ClassifyTypes";
import { STATE_KEEPING, STATE_ACCEPTED } from "../../types/FileStates";

import type { ClassifyType } from "../../types/ClassifyTypes";
import type { FileState } from "../../types/FileStates";
import FileSystemHelper from "../../helpers/FileSystemHelper";
import type { Config } from "../../types";

export default class AttributeService {
  log: typeof Logger;

  config: Config;

  renameService: RenameService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.renameService = new RenameService(config);
  }

  isExists: (targetPath?: string) => Promise<boolean> = async (
    targetPath?: string
  ): Promise<boolean> => fs.pathExists(targetPath || this.getSourcePath());

  getState: (targetPath?: string) => FileState = (
    targetPath?: string
  ): FileState => {
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

  getSourcePath: (targetPath?: string) => string = (
    targetPath?: string
  ): string => {
    if (targetPath) {
      return path.resolve(targetPath);
    }
    if (this.config.path) {
      return path.resolve(this.config.path);
    }
    throw new Error("no source path.");
  };

  getParsedPath: (
    targetPath?: string
  ) => {
    base: string,
    dir: string,
    ext: string,
    name: string,
    root: string,
    ...
  } = (
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

  getDirPath: (targetPath?: string) => string = (
    targetPath?: string
  ): string => {
    if (targetPath && this.isDirectory(targetPath)) {
      return targetPath;
    }

    return this.getParsedPath(targetPath).dir;
  };

  getDirName: (targetPath?: string) => string = (targetPath?: string): string =>
    path.basename(this.getDirPath(targetPath));

  detectClassifyType(targetPath?: string): ClassifyType {
    const { ext } = this.getParsedPath(targetPath);
    return AttributeService.detectClassifyTypeByExtenstion(
      ext,
      this.config.classifyTypeByExtension
    );
  }

  static detectClassifyTypeByExtenstion: (
    ext: string,
    classifyTypeByExtension: { string: ClassifyType, ... }
  ) => ClassifyType = (
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

  static detectClassifyTypeByConfig: (config: Config) => ClassifyType = (
    config: Config
  ): ClassifyType => {
    if (!config.path) {
      throw new Error("no source path.");
    }
    const { ext } = path.parse(config.path);
    return AttributeService.detectClassifyTypeByExtenstion(
      ext,
      config.classifyTypeByExtension
    );
  };

  detectBaseLibraryPath(targetPath?: string): string {
    const type = this.detectClassifyType(targetPath);
    const baseLibraryPath = this.config.baseLibraryPathByType[type];
    return baseLibraryPath || this.getDirPath(targetPath);
  }

  getFileStat(targetPath?: string): Promise<typeof fs.Stats> {
    return this.getStat(targetPath || this.getSourcePath());
  }

  getStat: (targetPath: string) => Promise<any> = (
    targetPath: string
  ): Promise<typeof fs.Stats> => fs.stat(targetPath);

  getDirStat(targetPath?: string): Promise<typeof fs.Stats> {
    return this.getStat(targetPath || this.getDirPath());
  }

  getLibraryDate: () => Date = (): Date => {
    if (this.config.libraryPathDate) {
      return this.config.libraryPathDate;
    }
    const { currentDate } = DateHelper;
    return new Date(
      currentDate.getTime() - this.config.libraryPathHourOffset * 60 * 60 * 1000
    );
  };

  getLibraryPath: (targetPath?: string) => string = (
    targetPath?: string
  ): string => {
    // const { birthtime, mtime } = await this.getDirStat();
    // const { birthtime, mtime } = await this.getFileStat();
    // const useTime = birthtime > mtime ? mtime : birthtime;
    const useTime = this.getLibraryDate();
    return path.join(
      this.detectBaseLibraryPath(targetPath),
      useTime.getFullYear().toString(),
      `${`0${useTime.getMonth() + 1}`.slice(
        -2
      )}-${`0${useTime.getDate()}`.slice(-2)}`
    );
  };

  getName: (targetPath?: string) => Promise<string> = async (
    targetPath?: string
  ): Promise<string> =>
    this.getParsedPath(
      FileNameMarkHelper.strip(targetPath || (await this.getDestPath()))
    ).name;

  getDestPath: (targetPath?: string) => Promise<string> = async (
    targetPath?: string
  ): Promise<string> =>
    this.renameService.converge(
      targetPath || this.getSourcePath(),
      this.getLibraryPath()
    );

  isArchive: () => boolean = () => this.detectClassifyType() === TYPE_ARCHIVE;

  isDeadLink: (targetPath?: string) => Promise<boolean> = async (
    targetPath?: string
  ): Promise<boolean> => {
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

  isDirectory: (targetPath?: string) => boolean = (
    targetPath?: string
  ): boolean =>
    FileSystemHelper.isDirectory(targetPath || this.getSourcePath());

  touch: (targetPath: string, force?: boolean) => Promise<void> = async (
    targetPath: string,
    force: boolean = false
  ): Promise<void> =>
    !this.config.dryrun || force ? pify(touch)(targetPath) : Promise.resolve();

  hide: (targetPath: string, force?: boolean) => Promise<void> = async (
    targetPath: string,
    force: boolean = false
  ): Promise<void> =>
    !this.config.dryrun || force
      ? pify(winattr.set)(targetPath, { hidden: true })
      : Promise.resolve();

  touchHide: (targetPath: string, force?: boolean) => Promise<void> = async (
    targetPath: string,
    force: boolean = false
  ): Promise<void> => {
    await this.touch(targetPath, force);
    await this.hide(targetPath, force);
  };

  isLibraryPlace(targetPath?: string): boolean {
    const finalTargetPath = targetPath || this.getSourcePath();
    const baseLibraryPath = this.detectBaseLibraryPath(finalTargetPath);
    return path.resolve(finalTargetPath).startsWith(baseLibraryPath);
  }

  async isAccessible(targetPath?: string): Promise<boolean> {
    if (targetPath === this.config.dummyPath) {
      return Promise.resolve(false);
    }
    try {
      await fs.access(
        targetPath || this.getSourcePath(),
        // eslint-disable-next-line no-bitwise
        fs.constants.R_OK | fs.constants.W_OK
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}
