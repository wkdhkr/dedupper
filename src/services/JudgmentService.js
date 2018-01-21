// @flow
import type { Logger } from "log4js";

import AttributeService from "./fs/AttributeService";
import { TYPE_UNKNOWN, TYPE_SCRAP } from "../types/ClassifyTypes";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE
} from "../types/ActionTypes";

import type { ActionType } from "../types/ActionTypes";
import type { Exact, Config, FileInfo, HashRow } from "../types";

export default class JudgmentService {
  log: Logger;
  config: Exact<Config>;
  as: AttributeService;
  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
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

  findReplacementFile = async (
    fileInfo: FileInfo,
    storedFileInfos: HashRow[]
  ): Promise<?HashRow> => {
    /**
     * A -> X,Y,Z
     * 無かった -> 消したから要らない画像だったという事 消す
     * 優先すべき対象画像が複数あった -> 一番近い画像を上書き
     */
    const infos = await Promise.all(
      storedFileInfos.map(
        async info => ((await this.as.isAccessible(info.path)) ? info : null)
      )
    );

    return infos.filter(Boolean).find(info => {
      const [
        { size, width = 0, height = 0, timestamp = 0 },
        {
          size: storedSize,
          width: storedWidth = 0,
          height: storedHeight = 0,
          timestamp: storedTimestamp = 0
        }
      ] = [fileInfo, info];
      const [pixel, storedPixel] = [width * height, storedWidth * storedHeight];
      const isSmallPixel = pixel < storedPixel;
      const isNewer = timestamp > storedTimestamp;

      if (storedSize * 0.66 > size) {
        this.log.info("promotion: case = small_file_size");
        return false;
      }

      // resolution is king
      if (isSmallPixel) {
        this.log.info("promotion: case = small_file_size");
        return false;
      }
      // new same pixel image. may be useless.
      if (isNewer && pixel === storedPixel) {
        return false;
      }
      return true;
    });
  };

  async detect(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow,
    storedFileInfoByPHashs: HashRow[]
  ): Promise<[ActionType, ?HashRow]> {
    const { from_path: fromPath } = fileInfo;
    if (fileInfo.type === TYPE_UNKNOWN) {
      this.log.info(`judge: case = unknown_file_type, path = ${fromPath}`);
      return [TYPE_HOLD, null];
    }

    if (fileInfo.type === TYPE_SCRAP) {
      this.log.info(`judge: case = scrap_file_type, path = ${fromPath}`);
      return [TYPE_DELETE, null];
    }

    if (this.isLowFileSize(fileInfo)) {
      this.log.info(`judge: case = low_file_size, path = ${fromPath}`);
      return [TYPE_DELETE, null];
    }

    if (this.isLowResolution(fileInfo)) {
      this.log.info(`judge: case = low_resolution, path = ${fromPath}`);
      return [TYPE_DELETE, null];
    }

    if (fileInfo.damaged) {
      this.log.warn(`judge: case = damaged, path = ${fromPath}`);
      return [TYPE_DELETE, null];
    }

    if (storedFileInfoByHash) {
      this.log.info(`judge: case = already_had, path = ${fromPath}`);
      return [TYPE_DELETE, null];
    }

    if (storedFileInfoByPHashs.length) {
      const replacementFile = await this.findReplacementFile(
        fileInfo,
        storedFileInfoByPHashs
      );

      if (replacementFile) {
        this.log.info(`judge: case = replace, path = ${fromPath}`);
        return [TYPE_REPLACE, replacementFile];
      }
      return [TYPE_DELETE, null];
    }

    this.log.info(`judge: case = save, path = ${fromPath}`);
    return [TYPE_SAVE, null];
  }
}
