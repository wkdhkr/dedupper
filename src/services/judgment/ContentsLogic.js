// @flow
import type { Logger } from "log4js";

import AttributeService from "../fs/AttributeService";
import ImageMagickService from "../fs/contents/ImageMagickService";
import ActionLogicService from "./ActionLogic";
import { TYPE_DELETE, TYPE_SAVE } from "../../types/ActionTypes";
import {
  TYPE_DAMAGED,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_LOW_LONG_SIDE,
  TYPE_P_HASH_REJECT_LOW_QUALITY,
  TYPE_P_HASH_REJECT_DIFFERENT_MEAN,
  TYPE_P_HASH_REJECT_LOW_ENTROPY
} from "../../types/ReasonTypes";

import type { ReasonType } from "../../types/ReasonTypes";
import type { JudgeResultSimple } from "../../types/JudgeResult";
import type { Config, FileInfo, HashRow } from "../../types";

export default class ContentsLogic {
  log: Logger;

  config: Config;

  as: AttributeService;

  al: ActionLogicService;

  is: ImageMagickService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
    this.al = new ActionLogicService();
    this.is = new ImageMagickService();
  }

  isLowFileSize = ({ size, type }: FileInfo): boolean => {
    const minSize = this.config.minFileSizeByType[type];
    if (!minSize) {
      return false;
    }
    return size < minSize;
  };

  isLowResolution({ width, height, type }: FileInfo): boolean {
    const minRes = this.config.minResolutionByType[type];
    if (!minRes) {
      return false;
    }
    if (width * height < minRes) {
      return true;
    }
    return false;
  }

  isLowLongSide({ width, height, type }: FileInfo): boolean {
    const minLongSide = this.config.minLongSideByType[type];
    if (!minLongSide) {
      return false;
    }
    const longSide = width > height ? width : height;
    if (longSide < minLongSide) {
      return true;
    }
    return false;
  }

  async collectStatisticFactor(
    fileInfo: FileInfo,
    storedFileInfo: HashRow
  ): Promise<{
    isSmallEntropy: boolean,
    isLowQuality: boolean,
    isDifferentMean: boolean,
    isStatisticError: false
  }> {
    const [statistic, storedStatistic] = await Promise.all([
      this.is.statistic(fileInfo.from_path),
      this.is.statistic(storedFileInfo.to_path)
    ]);

    this.log.info(
      `statistic check: from_path = ${fileInfo.from_path}, to_path = ${
        storedFileInfo.to_path
      } target = ${JSON.stringify(statistic)} stored = ${JSON.stringify(
        storedStatistic
      )}`
    );

    return {
      isStatisticError: false,
      isSmallEntropy: storedStatistic.entropy > statistic.entropy,
      isLowQuality: storedStatistic.quality * 0.66 > statistic.quality,
      isDifferentMean:
        Math.abs(storedStatistic.mean - statistic.mean) >
        this.config.meanExactThreshold
    };
  }

  detectStatisticRejectResult = (
    isMayBe: boolean,
    isSmallEntropy: boolean,
    isDifferentMean: boolean,
    isLowQuality: boolean,
    info: HashRow
  ): JudgeResultSimple | null => {
    if (isDifferentMean) {
      return [
        // may be different image, save it.
        this.al.fixAction(!isMayBe, TYPE_SAVE),
        info,
        TYPE_P_HASH_REJECT_DIFFERENT_MEAN
      ];
    }

    if (isSmallEntropy) {
      return [
        this.al.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_ENTROPY
      ];
    }

    if (isLowQuality) {
      return [
        this.al.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_QUALITY
      ];
    }
    return null;
  };

  detectDeleteReason(fileInfo: FileInfo): ?ReasonType {
    if (fileInfo.damaged) {
      return TYPE_DAMAGED;
    }

    if (this.isLowFileSize(fileInfo)) {
      return TYPE_LOW_FILE_SIZE;
    }

    if (this.isLowResolution(fileInfo)) {
      return TYPE_LOW_RESOLUTION;
    }

    if (this.isLowLongSide(fileInfo)) {
      return TYPE_LOW_LONG_SIDE;
    }
    return null;
  }
}
