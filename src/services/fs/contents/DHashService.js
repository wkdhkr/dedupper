// @flow
import dhash from "dhash-image";
import sharp from "sharp";
import { promisify } from "util";

import PHashService from "./PHashService";
import JimpService from "./JimpService";

import type { Config } from "../../../types";

export default class DHashService extends PHashService {
  config: Config;

  js: JimpService;

  constructor(config: Config) {
    super(config);
    this.js = new JimpService(config);
    sharp.cache(false); // avoid file lock
    this.log = config.getLogger(this);
    this.config = config;
  }

  calculate = async (targetPath: string): Promise<void | string> => {
    const targetPathFixed = await this.js.fixTargetPath(targetPath);
    let hex;
    try {
      const hash = await promisify(dhash)(targetPathFixed);
      hex = String(parseInt(hash.toString("hex"), 16));
      this.log.debug(`calculate dHash: path = ${targetPath} hash = ${hex}`);
    } catch (e) {
      this.log.warn(e, `path = ${targetPath}`);
    }
    if (targetPathFixed !== targetPath) {
      await this.js.clearFixedPath(targetPathFixed, targetPath);
    }
    return hex;
  };
}
