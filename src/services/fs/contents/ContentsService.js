// @flow
import typeof { Logger } from "log4js";

import {
  TYPE_AUDIO,
  TYPE_IMAGE,
  TYPE_VIDEO,
  TYPE_TEXT
} from "../../../types/ClassifyTypes";

import HashService from "./HashService";
import PHashService from "./PHashService";
import DHashService from "./DHashService";
import FFProbeService from "./FFProbeService";
import FFMpegService from "./FFMpegService";
import ImageMagickService from "./ImageMagickService";
import type AttributeService from "../AttributeService";
import type { ImageContentsInfo, Config } from "../../../types";

export default class ContentsService {
  log: Logger;

  config: Config;

  as: AttributeService;

  hashService: HashService;

  pHashService: PHashService;

  dHashService: DHashService;

  ffProbeService: FFProbeService;

  ffMpegService: FFMpegService;

  imageMagickService: ImageMagickService;

  constructor(config: Config, as: AttributeService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = as;
    this.hashService = new HashService(config, as);
    this.pHashService = new PHashService(config);
    this.dHashService = new DHashService(config);
    this.ffProbeService = new FFProbeService();
    this.ffMpegService = new FFMpegService();
    this.imageMagickService = new ImageMagickService();
  }

  calculateHash(): Promise<string> {
    return this.hashService.calculate(this.as.getSourcePath());
  }

  calculatePHash(): Promise<null | string> {
    if (this.as.detectClassifyType() === TYPE_IMAGE) {
      return this.pHashService.calculate(this.as.getSourcePath());
    }
    return Promise.resolve(null);
  }

  calculateDHash(targetPath?: string): Promise<null | string> {
    if (this.as.detectClassifyType() === TYPE_IMAGE) {
      return this.dHashService.calculate(targetPath || this.as.getSourcePath());
    }
    return Promise.resolve(null);
  }

  async readInfo(): Promise<ImageContentsInfo> {
    switch (this.as.detectClassifyType()) {
      case TYPE_IMAGE: {
        const info = await this.imageMagickService.identify(
          this.as.getSourcePath()
        );
        this.log.debug(
          "calculate hash: path = ",
          `${this.as.getSourcePath()} hash = ${info.hash}`
        );
        return info;
      }
      case TYPE_AUDIO: {
        const info = await this.ffMpegService.read(this.as.getSourcePath());
        return {
          width: 0,
          height: 0,
          ratio: 0,
          hash: info.hash,
          damaged: this.config.ignoreAudioDamage ? false : info.damaged
        };
      }
      case TYPE_VIDEO: {
        const [hash, info] = await Promise.all([
          this.calculateHash(),
          this.ffProbeService.read(this.as.getSourcePath())
        ]);
        return {
          ...{
            ...info,
            damaged: this.config.ignoreVideoDamage ? false : info.damaged
          },
          hash
        };
      }
      case TYPE_TEXT:
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
}
