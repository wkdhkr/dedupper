// @flow
import { writeFile, unlink, exists } from "fs-extra";
import tmp from "tmp-promise";
import jimp from "jimp";

import AttributeService from "../AttributeService";

import type { Config } from "../../../types";

export default class JimpService {
  config: Config;

  as: AttributeService;

  constructor(config: Config) {
    this.as = new AttributeService(config);
    this.config = config;
  }

  fixTargetPath = async (targetPath: string): Promise<string> => {
    const { ext } = this.as.getParsedPath(targetPath);
    if (ext.toLowerCase() === ".bmp" || ext.toLowerCase() === ".gif") {
      const image = await jimp.read(targetPath);
      const buffer = await image.getBufferAsync(jimp.MIME_PNG);
      const tmpPath = (await tmp.tmpName()) + ext;
      await writeFile(tmpPath, buffer);
      return tmpPath;
    }
    return targetPath;
  };

  clearFixedPath = async (
    targetPathFixed: string,
    targetPath: string
  ): Promise<void> => {
    if (targetPathFixed !== targetPath && (await exists(targetPathFixed))) {
      await unlink(targetPathFixed);
    }
  };
}
