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

  calculate = async (
    targetPath: string,
    isRetried: boolean = false
  ): Promise<void | string> => {
    const targetPathFixed = await this.js.fixTargetPath(targetPath);
    let hex;
    try {
      const hash = await promisify(dhash)(targetPathFixed);
      hex = String(parseInt(hash.toString("hex"), 16));
      this.log.debug(`calculate dHash: path = ${targetPath} hash = ${hex}`);
    } catch (e) {
      if (
        !isRetried &&
        (e.message.includes(
          "Input file is missing or of an unsupported image format"
        ) ||
          e.message.includes(
            "Input file is missing or of an unsupported image format"
          ))
      ) {
        this.log.warn(e, `path = ${targetPath}`);
        try {
          // $FlowFixMe
          return this.calculate(await this.js.convertToPng(targetPath), true);
        } catch (ne) {
          this.log.warn(ne, `path = ${targetPath}`);
          return Promise.resolve();
        }
      }
    }
    if (targetPathFixed !== targetPath) {
      await this.js.clearFixedPath(targetPathFixed, targetPath);
    }
    return hex;
  };
}
