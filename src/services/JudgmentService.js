// @flow
import type { Logger } from "log4js";

import AttributeService from "./fs/AttributeService";
import { TYPE_UNKNOWN, TYPE_SCRAP } from "../types/ClassifyTypes";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE,
  TYPE_RELOCATE
} from "../types/ActionTypes";
import {
  TYPE_UNKNOWN_FILE_TYPE,
  TYPE_SCRAP_FILE_TYPE,
  TYPE_DAMAGED,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_LOW_LONG_SIDE,
  TYPE_NG_FILE_NAME,
  TYPE_NG_DIR_PATH,
  TYPE_HASH_MATCH,
  TYPE_HASH_MATCH_RELOCATE,
  TYPE_HASH_MISMATCH_RELOCATE,
  TYPE_P_HASH_MATCH,
  TYPE_P_HASH_REJECT,
  TYPE_NO_PROBLEM
} from "../types/ReasonTypes";

import type { ActionType } from "../types/ActionTypes";
import type { ReasonType } from "../types/ReasonTypes";
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

  isForgetType = (type: string): boolean =>
    [TYPE_UNKNOWN, TYPE_SCRAP].includes(type);

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
        async info => ((await this.as.isAccessible(info.to_path)) ? info : null)
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

  logResult(
    { from_path: fromPath, size, width, height, p_hash: pHash }: FileInfo,
    result: [ActionType, ?HashRow, ReasonType]
  ): [ActionType, ?HashRow, ReasonType] {
    let message = null;
    let isWarn = false;
    const reasonType: ReasonType = result[2];
    switch (reasonType) {
      case TYPE_LOW_FILE_SIZE:
        message = `size = ${size}`;
        break;
      case TYPE_DAMAGED:
        isWarn = true;
        break;
      case TYPE_LOW_RESOLUTION:
      case TYPE_LOW_LONG_SIDE:
        message = `res = ${width}x${height}`;
        break;
      case TYPE_P_HASH_MATCH:
        message = `p_hash = ${String(pHash)}-${String(
          (result[1]: any).p_hash
        )}`;
        break;
      default:
    }
    const finalMessage = message
      ? `judge: case = ${result[2]}, path = ${fromPath}, ${message}`
      : `judge: case = ${result[2]}, path = ${fromPath}`;
    if (isWarn) {
      this.log.warn(finalMessage);
    } else {
      this.log.info(finalMessage);
    }
    return result;
  }

  isNgFileName(name: string): boolean {
    return this.config.ngFileNamePatterns.some(p => {
      if (p instanceof RegExp) {
        return name.match(p);
      }
      return name.toLowerCase() === p.toLowerCase();
    });
  }

  isNgDirPath(targetPath: string): boolean {
    return this.config.ngDirPathPatterns.some(p => {
      if (p instanceof RegExp) {
        return Boolean(targetPath.match(p));
      }
      return targetPath.toLowerCase().includes(p.toLowerCase());
    });
  }

  detectNgPathReason(fileInfo: FileInfo): ?ReasonType {
    if (this.isNgFileName(fileInfo.name)) {
      return TYPE_NG_FILE_NAME;
    }
    if (this.isNgDirPath(fileInfo.from_path)) {
      console.log("fire");
      return TYPE_NG_DIR_PATH;
    }
    return null;
  }

  detectDeleteReason(fileInfo: FileInfo): ?ReasonType {
    if (fileInfo.type === TYPE_SCRAP) {
      return TYPE_SCRAP_FILE_TYPE;
    }

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

  handleRelocate(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow
  ): [ActionType, ?HashRow, ReasonType] {
    if (storedFileInfoByHash) {
      return this.logResult(fileInfo, [
        TYPE_RELOCATE,
        storedFileInfoByHash,
        TYPE_HASH_MATCH_RELOCATE
      ]);
    }
    return this.logResult(fileInfo, [
      TYPE_HOLD,
      null,
      TYPE_HASH_MISMATCH_RELOCATE
    ]);
  }

  async detect(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow,
    storedFileInfoByPHashs: HashRow[]
  ): Promise<[ActionType, ?HashRow, ReasonType]> {
    if (this.config.relocate) {
      return this.handleRelocate(fileInfo, storedFileInfoByHash);
    }
    const ngPathReason = this.detectNgPathReason(fileInfo);
    if (ngPathReason) {
      return this.logResult(fileInfo, [TYPE_DELETE, null, ngPathReason]);
    }

    if (fileInfo.type === TYPE_UNKNOWN) {
      return this.logResult(fileInfo, [
        TYPE_HOLD,
        null,
        TYPE_UNKNOWN_FILE_TYPE
      ]);
    }

    const deleteReason = this.detectDeleteReason(fileInfo);
    if (deleteReason) {
      return this.logResult(fileInfo, [TYPE_DELETE, null, deleteReason]);
    }

    if (storedFileInfoByHash) {
      return this.logResult(fileInfo, [TYPE_DELETE, null, TYPE_HASH_MATCH]);
    }

    if (storedFileInfoByPHashs.length) {
      const replacementFile = await this.findReplacementFile(
        fileInfo,
        storedFileInfoByPHashs
      );

      if (replacementFile) {
        return this.logResult(fileInfo, [
          TYPE_REPLACE,
          replacementFile,
          TYPE_P_HASH_MATCH
        ]);
      }
      return this.logResult(fileInfo, [TYPE_DELETE, null, TYPE_P_HASH_REJECT]);
    }
    return this.logResult(fileInfo, [TYPE_SAVE, null, TYPE_NO_PROBLEM]);
  }
}
