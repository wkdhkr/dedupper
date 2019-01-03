// @flow
import { writeFile, unlink } from "fs-extra";
import tmp from "tmp-promise";
import dhash from "dhash-image";
import jimp from "jimp";
import sharp from "sharp";
import { promisify } from "util";

import AttributeService from "../AttributeService";
import PHashService from "./PHashService";

import type { Config } from "../../../types";

export default class DHashService extends PHashService {
  config: Config;

  as: AttributeService;

  constructor(config: Config) {
    super(config);
    this.as = new AttributeService(config);
    sharp.cache(false); // avoid file lock
    this.log = config.getLogger(this);
    this.config = config;
  }

  fixTargetPath = async (targetPath: string): Promise<string> => {
    const { ext } = this.as.getParsedPath(targetPath);
    if (ext.toLowerCase() === ".bmp") {
      const image = await jimp.read(targetPath);
      const buffer = await image.getBufferAsync(jimp.MIME_PNG);
      const tmpPath = (await tmp.tmpName()) + ext;
      await writeFile(tmpPath, buffer);
      return tmpPath;
    }
    return targetPath;
  };

  clearFixedPath = (escapePath: string): Promise<void> => unlink(escapePath);

  calculate = async (targetPath: string): Promise<void | string> => {
    const targetPathFixed = await this.fixTargetPath(targetPath);
    let hex;
    try {
      const hash = await promisify(dhash)(targetPathFixed);
      hex = String(parseInt(hash.toString("hex"), 16));
      this.log.debug(`calculate dHash: path = ${targetPath} hash = ${hex}`);
    } catch (e) {
      this.log.warn(e, `path = ${targetPath}`);
    }
    if (targetPathFixed !== targetPath) {
      await this.clearFixedPath(targetPathFixed);
    }
    return hex;
  };
}
