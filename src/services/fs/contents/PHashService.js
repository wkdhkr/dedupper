// @flow
import { promisify } from "util";
import { imageHash, hammingDistance } from "phash";
import type { Logger } from "log4js";

import JimpService from "./JimpService";
import FileSystemHelper from "../../../helpers/FileSystemHelper";
import type { Config } from "../../../types";

const imageHashAsync = promisify(imageHash);

export default class PHashService {
  log: Logger;

  config: Config;

  js: JimpService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.js = new JimpService(config);
  }

  /**
   * XXX: pHash library cannot process multibyte file path.
   */
  prepareEscapePath = async (targetPath: string): Promise<string> => {
    return FileSystemHelper.prepareEscapePath(targetPath);
  };

  clearEscapePath = (escapePath: string): Promise<void> =>
    FileSystemHelper.clearEscapePath(escapePath);

  calculate = async (targetPath: string): Promise<null | string> => {
    let escapePath = null;
    try {
      escapePath = await this.prepareEscapePath(targetPath);
      const targetPathFixed = await this.js.fixTargetPath(escapePath);
      const hash = await imageHashAsync(targetPathFixed);
      this.log.debug(`calculate pHash: path = ${targetPath} hash = ${hash}`);
      await this.clearEscapePath(escapePath);
      await this.js.clearFixedPath(targetPathFixed, targetPath);
      return hash;
    } catch (e) {
      this.log.warn(e, `path = ${targetPath}`);
      if (escapePath) {
        await this.clearEscapePath(escapePath);
      }
    }
    return null;
  };

  static compare = (a: ?string, b: ?string): number | false => {
    if (!a || !b) {
      return false;
    }
    return hammingDistance(a, b);
  };
}
