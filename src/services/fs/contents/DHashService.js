// @flow
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
    // sharp.cache(false); // avoid file lock
    this.log = config.getLogger(this);
    this.config = config;
  }

  calculate = async (
    targetPath: string,
    isRetried: boolean = false
  ): Promise<null | string> => {
    // avoid canvas dll conflict
    // eslint-disable-next-line global-require
    require("canvas");
    // eslint-disable-next-line global-require
    const dhash = require("dhash-image");
    // eslint-disable-next-line global-require
    const sharp = require("sharp");
    console.log(sharp);
    sharp.cache(false);
    const targetPathFixed = await this.js.fixTargetPath(targetPath);
    let hex = null;
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
          return Promise.resolve(null);
        }
      }
    }
    if (targetPathFixed !== targetPath) {
      await this.js.clearFixedPath(targetPathFixed, targetPath);
    }
    return hex;
  };
}
