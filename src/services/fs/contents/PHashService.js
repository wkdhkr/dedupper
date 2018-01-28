// @flow
import path from "path";
import tmp from "tmp";
import { symlink, unlink } from "fs-extra";
import { promisify } from "util";
import { imageHash, hammingDistance } from "phash";
import type { Logger } from "log4js";

import type { Exact, Config } from "../../../types";

const imageHashAsync = promisify(imageHash);

export default class PHashService {
  log: Logger;
  config: Exact<Config>;
  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
  }

  /**
   * XXX: pHash library cannot process multibyte file path.
   */
  prepareEscapePath = async (targetPath: string): Promise<string> => {
    const tmpPath = await promisify(tmp.tmpName)(targetPath);
    const finalTmpPath = tmpPath + path.parse(targetPath).ext;
    await symlink(path.resolve(targetPath), finalTmpPath);
    return finalTmpPath;
  };

  clearEscapePath = (escapePath: string): Promise<void> => unlink(escapePath);

  calculate = async (targetPath: string): Promise<void | string> => {
    const escapePath = await this.prepareEscapePath(targetPath);
    return imageHashAsync(escapePath)
      .then(async hash => {
        this.log.debug(`calculate pHash: path = ${targetPath} hash = ${hash}`);
        await this.clearEscapePath(escapePath);
        return hash;
      })
      .catch(async e => {
        await this.clearEscapePath(escapePath);
        this.log.warn(e, `path = ${targetPath}`);
      });
  };

  static compare = (a: ?string, b: ?string): number | false => {
    if (!a || !b) {
      return false;
    }
    return hammingDistance(a, b);
  };
}
