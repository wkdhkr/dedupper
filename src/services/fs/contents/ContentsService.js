// @flow
import type { Logger } from "log4js";

import { TYPE_IMAGE, TYPE_VIDEO } from "../../../types/ClassifyTypes";

import HashService from "./HashService";
import PHashService from "./PHashService";
import FFProbeService from "./FFProbeService";
import ImageMagickService from "./ImageMagickService";
import ImageSizeService from "./ImageSizeService";
import type AttributeService from "../AttributeService";
import type { ImageContentsInfo, Exact, Config } from "../../../types";

export default class ContentsService {
  log: Logger;
  config: Exact<Config>;
  as: AttributeService;
  hashService: HashService;
  pHashService: PHashService;
  ffProbeService: FFProbeService;
  imageMagickService: ImageMagickService;
  imageSizeService: ImageSizeService;

  constructor(config: Exact<Config>, as: AttributeService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = as;
    this.hashService = new HashService(config, as);
    this.pHashService = new PHashService(config);
    this.ffProbeService = new FFProbeService();
    this.imageMagickService = new ImageMagickService();
    this.imageSizeService = new ImageSizeService();
  }

  calculateHash(): Promise<string> {
    return this.hashService.calculate(this.as.getSourcePath());
  }

  calculatePHash(): Promise<void | string> {
    if (this.as.detectClassifyType() === TYPE_IMAGE) {
      return this.pHashService.calculate(this.as.getSourcePath());
    }
    return Promise.resolve();
  }

  readImageSize(): Promise<{ width: number, height: number, ratio: number }> {
    return this.imageSizeService
      .read(this.as.getSourcePath())
      .then(r => ({ ...r, ratio: r.width / r.height || 0 }));
  }

  async readInfo(): Promise<ImageContentsInfo> {
    switch (this.as.detectClassifyType()) {
      case TYPE_IMAGE:
        return Promise.all([this.readImageSize(), this.isImageDamaged()]).then(
          ([info, damaged]) => ({ ...info, damaged })
        );
      case TYPE_VIDEO:
        return this.ffProbeService.read(this.as.getSourcePath());
      default:
        return {
          width: 0,
          height: 0,
          ratio: 0,
          damaged: false
        };
    }
  }

  isImageDamaged(): Promise<boolean> {
    return this.imageMagickService.isDamaged(this.as.getSourcePath());
  }
}
