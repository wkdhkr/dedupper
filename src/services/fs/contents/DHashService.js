// @flow
import tmp from "tmp-promise";
import { promisify } from "util";

import PHashService from "./PHashService";
import JimpService from "./JimpService";
import AttributeService from "../AttributeService";

import type { Config } from "../../../types";
import ImageMagickService from "./ImageMagickService";

export default class DHashService extends PHashService {
  config: Config;

  as: AttributeService;

  js: JimpService;

  is: ImageMagickService;

  constructor(config: Config) {
    super(config);
    this.as = new AttributeService(config);
    this.js = new JimpService(config);
    this.is = new ImageMagickService(config);
    // sharp.cache(false); // avoid file lock
    this.log = config.getLogger(this);
    this.config = config;
  }

  // eslint-disable-next-line complexity
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
    sharp.cache(false);
    let targetPathFixed = await this.js.fixTargetPath(targetPath);
    let hex = null;
    try {
      const hash = await promisify(dhash)(targetPathFixed);
      hex = String(parseInt(hash.toString("hex"), 16));
      this.log.debug(`calculate dHash: path = ${targetPath} hash = ${hex}`);
    } catch (e) {
      if (!isRetried && e.message.includes("Input image exceeds pixel limit")) {
        this.log.warn(e, `path = ${targetPath}`);
        const { ext } = this.as.getParsedPath(targetPath);
        await this.js.clearFixedPath(targetPathFixed, targetPath);
        targetPathFixed = (await tmp.tmpName()) + ext;
        await this.is.resize(targetPath, targetPathFixed, 1000, 1000);
        try {
          hex = await this.calculate(targetPathFixed);
        } catch (ne) {
          this.log.warn(ne, `path = ${targetPath}`);
        }
      } else if (
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
          await this.js.clearFixedPath(targetPathFixed, targetPath);
          targetPathFixed = await this.js.convertToPng(targetPath);
          hex = this.calculate(targetPathFixed, 1000);
        } catch (ne) {
          this.log.warn(ne, `path = ${targetPath}`);
        }
      }
    }
    if (targetPathFixed !== targetPath) {
      await this.js.clearFixedPath(targetPathFixed, targetPath);
    }
    return hex;
  };
}
