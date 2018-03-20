// @flow
import dhash from "dhash-image";
import sharp from "sharp";
import { promisify } from "util";

import PHashService from "./PHashService";

import type { Config } from "../../../types";

export default class DHashService extends PHashService {
  constructor(config: Config) {
    super(config);
    sharp.cache(false); // avoid file lock
    this.log = config.getLogger(this);
    this.config = config;
  }

  calculate = async (targetPath: string): Promise<void | string> => {
    let hex;
    try {
      const hash = await promisify(dhash)(targetPath);
      hex = String(parseInt(hash.toString("hex"), 16));
      this.log.debug(`calculate dHash: path = ${targetPath} hash = ${hex}`);
    } catch (e) {
      this.log.warn(e, `path = ${targetPath}`);
    }
    return hex;
  };
}
