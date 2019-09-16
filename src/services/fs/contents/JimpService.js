// @flow
import { writeFile } from "fs-extra";
import tmp from "tmp-promise";
import jimp from "jimp";
import FileSystemHelper from "../../../helpers/FileSystemHelper";

import AttributeService from "../AttributeService";

import type { Config } from "../../../types";

export default class JimpService {
  config: Config;

  as: AttributeService;

  constructor(config: Config) {
    this.as = new AttributeService(config);
    this.config = config;
  }

  convertToPngBuffer = async (
    targetPath: string,
    resizeLimit?: number,
    isJpeg?: boolean
  ): Promise<Buffer> => {
    let image = await jimp.read(targetPath);
    if (resizeLimit) {
      image = image.scaleToFit(resizeLimit, resizeLimit);
    }
    const buffer = await image.getBufferAsync(
      isJpeg ? jimp.MIME_JPEG : jimp.MIME_PNG
    );
    return buffer;
  };

  convertToPng = async (
    targetPath: string,
    resizeLimit?: number,
    isJpeg?: boolean
  ): Promise<string> => {
    const { ext } = this.as.getParsedPath(targetPath);
    const buffer = await this.convertToPngBuffer(
      targetPath,
      resizeLimit,
      isJpeg
    );
    const tmpPath = (await tmp.tmpName()) + ext;
    await writeFile(tmpPath, buffer);
    return tmpPath;
  };

  fixTargetPath = async (
    targetPath: string,
    resizeLimit?: number,
    isJpeg?: boolean
  ): Promise<string> => {
    const { ext } = this.as.getParsedPath(targetPath);
    if (
      resizeLimit ||
      ext.toLowerCase() === ".bmp" ||
      ext.toLowerCase() === ".gif"
    ) {
      return this.convertToPng(targetPath, resizeLimit, isJpeg);
    }
    return targetPath;
  };

  clearFixedPath = async (
    targetPathFixed: string,
    targetPath: string
  ): Promise<void> => {
    await FileSystemHelper.clearFixedPath(targetPathFixed, targetPath);
  };
}
