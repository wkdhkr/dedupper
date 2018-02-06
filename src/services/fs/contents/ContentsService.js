// @flow
import type { Logger } from "log4js";

import { TYPE_IMAGE, TYPE_VIDEO } from "../../../types/ClassifyTypes";

import HashService from "./HashService";
import PHashService from "./PHashService";
import DHashService from "./DHashService";
import FFProbeService from "./FFProbeService";
import ImageMagickService from "./ImageMagickService";
import type AttributeService from "../AttributeService";
import type { ImageContentsInfo, Exact, Config } from "../../../types";

export default class ContentsService {
  log: Logger;
  config: Exact<Config>;
  as: AttributeService;
  hashService: HashService;
  pHashService: PHashService;
  dHashService: DHashService;
  ffProbeService: FFProbeService;
  imageMagickService: ImageMagickService;

  constructor(config: Exact<Config>, as: AttributeService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = as;
    this.hashService = new HashService(config, as);
    this.pHashService = new PHashService(config);
    this.dHashService = new DHashService(config);
    this.ffProbeService = new FFProbeService();
    this.imageMagickService = new ImageMagickService();
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

  calculateDHash(): Promise<void | string> {
    if (this.as.detectClassifyType() === TYPE_IMAGE) {
      return this.dHashService.calculate(this.as.getSourcePath());
    }
    return Promise.resolve();
  }

  async readInfo(): Promise<ImageContentsInfo> {
    switch (this.as.detectClassifyType()) {
      case TYPE_IMAGE:
        return this.imageMagickService.identify(this.as.getSourcePath());
      case TYPE_VIDEO:
        return {
          ...(await this.ffProbeService.read(this.as.getSourcePath())),
          hash: await this.calculateHash()
        };
      default:
        return {
          hash: await this.calculateHash(),
          width: 0,
          height: 0,
          ratio: 0,
          damaged: false
        };
    }
  }

  async isImageDamaged(): Promise<boolean> {
    const targetPath = this.as.getSourcePath();
    const isDamaged = await this.imageMagickService.isDamaged(targetPath);
    if (isDamaged) {
      this.log.warn(`damaged image, path = ${targetPath}`);
    }
    return isDamaged;
  }
}
