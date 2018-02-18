// @flow
import { unlink, pathExistsSync, readFile, writeFile } from "fs-extra";
import type { Logger } from "log4js";

import pkg from "./../../../package.json";
import AttributeService from "./AttributeService";
import { STATE_ACCEPTED } from "../../types/FileStates";
import {
  TYPE_DEDUPPER_LOCK,
  TYPE_DEDUPPER_CACHE,
  TYPE_UNKNOWN
} from "../../types/ClassifyTypes";
import type { Config, FileInfo } from "../../types";
import type { ClassifyType } from "../../types/ClassifyTypes";

export default class FileCacheService {
  log: Logger;
  config: Config;
  as: AttributeService;

  constructor(config: Config, as: AttributeService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = as;
  }

  getCacheFilePath = (targetPath?: string) =>
    `${targetPath || this.as.getSourcePath()}.dpcache`;

  createEmptyFileInfo = (): FileInfo => ({
    p_hash: null,
    d_hash: null,
    hash: "",
    damaged: false,
    width: 0,
    height: 0,
    ratio: 0,
    size: 0,
    timestamp: 0,
    name: this.as.getFileName(),
    type: TYPE_UNKNOWN,
    to_path: "",
    from_path: this.as.getSourcePath(),
    state: STATE_ACCEPTED
  });

  loadJson = async (targetPath: string): Promise<FileInfo> =>
    JSON.parse(await readFile(targetPath, "utf8"));

  isCacheFileActive = async (targetPath: string): Promise<boolean> => {
    try {
      const { from_path: fromPath } = await this.loadJson(targetPath);
      return pathExistsSync(fromPath);
    } catch (e) {
      this.log.error(e);
      return false;
    }
  };

  cleanCacheFile = async (targetPath?: string): Promise<void> => {
    const cacheFilePath = this.getCacheFilePath(targetPath);
    if (!pathExistsSync(cacheFilePath)) {
      return;
    }
    if (await this.isCacheFileActive(cacheFilePath)) {
      return;
    }
    if (!this.config.dryrun) {
      await unlink(cacheFilePath);
    }
  };

  isIgnoreType = (type: ClassifyType) =>
    [TYPE_DEDUPPER_CACHE, TYPE_DEDUPPER_LOCK].includes(type);

  loadCacheFile = async (targetPath?: string): Promise<?FileInfo> => {
    if (!this.config.cache) {
      return null;
    }
    const type = this.as.detectClassifyType(targetPath);
    if (this.isIgnoreType(type)) {
      return {
        ...this.createEmptyFileInfo(),
        type
      };
    }
    const cacheFilePath = this.getCacheFilePath();
    if (pathExistsSync(cacheFilePath)) {
      const { birthtime } = await this.as.getFileStat(cacheFilePath);
      const stat = await this.as.getFileStat(targetPath);
      // if timestamp is newer, ignore cache file.
      if (stat.mtime > birthtime || stat.birthtime > birthtime) {
        return null;
      }
      this.log.debug(
        `file info cache hit. path = ${targetPath || this.as.getSourcePath()}`
      );
      const fileInfo = {
        ...(await this.loadJson(cacheFilePath)),
        type: this.as.detectClassifyType(targetPath),
        to_path: await this.as.getDestPath(targetPath)
      };
      if (fileInfo.version !== pkg.version) {
        return null;
      }
      return fileInfo;
    }
    return null;
  };

  writeCacheFile = async (fileInfo: FileInfo): Promise<void> => {
    if (!this.config.cache) {
      return;
    }
    const cacheFilePath = this.getCacheFilePath();
    await writeFile(
      cacheFilePath,
      JSON.stringify({
        version: pkg.version,
        ...fileInfo
      }),
      "utf8"
    );
    await this.as.touchHide(cacheFilePath);
  };
}
