// @flow
import type { Logger } from "log4js";

import {
  MARK_BLOCK,
  MARK_DEDUPE,
  MARK_HOLD,
  MARK_ERASE,
  MARK_SAVE,
  MARK_REPLACE,
  MARK_TRANSFER
} from "../types/FileNameMarks";
import FileNameMarkHelper from "../helpers/FileNameMarkHelper";
import AttributeService from "./fs/AttributeService";
import FileCacheService from "./fs/FileCacheService";
import DbService from "./db/DbService";
import ImageMagickService from "./fs/contents/ImageMagickService";
import DeepLearningService from "./deepLearning/DeepLearningService";
import {
  STATE_ACCEPTED,
  STATE_KEEPING,
  STATE_BLOCKED,
  STATE_DEDUPED
} from "../types/FileStates";
import {
  TYPE_DEDUPPER_CACHE,
  TYPE_DEDUPPER_LOCK,
  TYPE_UNKNOWN,
  TYPE_SCRAP
} from "../types/ClassifyTypes";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE,
  TYPE_RELOCATE,
  TYPE_TRANSFER
} from "../types/ActionTypes";
import {
  TYPE_FILE_NAME_MATCH,
  TYPE_KEEP_DEDUPPER_FILE,
  TYPE_SWEEP_DEDUPPER_FILE,
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
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_REJECT_LOW_QUALITY,
  TYPE_P_HASH_REJECT_DIFFERENT_MEAN,
  TYPE_P_HASH_REJECT_LOW_ENTROPY,
  TYPE_P_HASH_MAY_BE,
  TYPE_P_HASH_MATCH_LOST_FILE,
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_NO_PROBLEM,
  TYPE_PROCESS_ERROR,
  TYPE_FILE_MARK_BLOCK,
  TYPE_FILE_MARK_ERASE,
  TYPE_FILE_MARK_DEDUPE,
  TYPE_FILE_MARK_HOLD,
  TYPE_FILE_MARK_SAVE,
  TYPE_FILE_MARK_REPLACE,
  TYPE_FILE_MARK_TRANSFER,
  TYPE_DEEP_LEARNING,
  TYPE_P_HASH_MATCH_KEEPING,
  TYPE_P_HASH_MATCH_WILL_KEEP,
  TYPE_P_HASH_MATCH_TRANSFER,
  TYPE_HASH_MATCH_TRANSFER
} from "../types/ReasonTypes";

import type { ActionType } from "../types/ActionTypes";
import type { ReasonType } from "../types/ReasonTypes";
import type { ClassifyType } from "../types/ClassifyTypes";
import type {
  StateDeduped,
  StateBlocked,
  FileState
} from "../types/FileStates";
import type { FileNameMark } from "../types/FileNameMarks";
import type { JudgeResult, JudgeResultSimple } from "../types/JudgeResult";
import type { Config, FileInfo, HashRow } from "../types";

export default class JudgmentService {
  log: Logger;
  config: Config;
  as: AttributeService;
  is: ImageMagickService;
  ds: DeepLearningService;
  fcs: FileCacheService;
  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = new AttributeService(config);
    this.is = new ImageMagickService();
    this.ds = new DeepLearningService(config);
    this.fcs = new FileCacheService(config, this.as);
  }

  isBlockReasonType = (type: ReasonType): boolean =>
    [TYPE_FILE_MARK_BLOCK, TYPE_DEEP_LEARNING].includes(type);

  isDedupeReasonType = (type: ReasonType): boolean =>
    [
      TYPE_FILE_MARK_DEDUPE,
      TYPE_P_HASH_REJECT_NEWER,
      TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
      TYPE_P_HASH_REJECT_LOW_RESOLUTION
    ].includes(type);

  detectDeleteState = (
    type: ReasonType
  ): StateDeduped | StateBlocked | null => {
    if (this.isDedupeReasonType(type)) {
      return STATE_DEDUPED;
    }
    if (this.isBlockReasonType(type)) {
      return STATE_BLOCKED;
    }
    return null;
  };

  isForgetType = (type: ClassifyType): boolean =>
    [
      TYPE_UNKNOWN,
      TYPE_DEDUPPER_CACHE,
      TYPE_DEDUPPER_LOCK,
      TYPE_SCRAP
    ].includes(type);

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

  isExactImage = (
    distance: number | false | void,
    threshold: number
  ): boolean => {
    if (typeof distance === "number") {
      return distance < threshold;
    }
    return false;
  };

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

  isKeep = (state: FileState) => state === STATE_KEEPING;

  handlePHashHit = async (
    fileInfo: FileInfo,
    storedFileInfos: HashRow[]
  ): Promise<JudgeResult> => {
    const extractState = (i: ?HashRow): FileState => {
      if (i) {
        return DbService.reverseLookupFileStateDivision(i.state);
      }
      return STATE_ACCEPTED;
    };
    const factors = await Promise.all(
      storedFileInfos.map(async info => {
        let isSameDir = false;
        let isAccessible = false;
        if (this.as.isSameDir(info.from_path)) {
          isSameDir = true;
        }
        if (await this.as.isAccessible(info.to_path)) {
          isAccessible = true;
        }
        const {
          isSmallEntropy,
          isLowQuality,
          isDifferentMean,
          isStatisticError
        } = await this.collectStatisticFactor(fileInfo, info).catch(() => ({
          isSmallEntropy: false,
          isLowQuality: false,
          isDifferentMean: false,
          isStatisticError: true
        }));
        const [
          { size, width = 0, height = 0, timestamp = 0 },
          {
            size: storedSize,
            width: storedWidth = 0,
            height: storedHeight = 0,
            timestamp: storedTimestamp = 0
          }
        ] = [fileInfo, info];
        const [pixel, storedPixel] = [
          width * height,
          storedWidth * storedHeight
        ];
        const isSmallPixel =
          pixel < storedPixel * this.config.relativeResolutionRatioThreshold;
        const isSamePixel = pixel === storedPixel;
        const isSmallSize =
          storedSize * this.config.relativeFileSizeRatioThreshold > size;
        const isNewer = timestamp > storedTimestamp;
        const isValidDistance =
          Number.isInteger(info.p_hash_distance) &&
          Number.isInteger(info.d_hash_distance);
        const isPHashExact = this.isExactImage(
          info.p_hash_distance,
          this.config.pHashExactThreshold
        );
        const isDHashExact = this.isExactImage(
          info.d_hash_distance,
          this.config.dHashExactThreshold
        );
        const isWillKeep = this.isKeep(fileInfo.state);
        const isKeeping = this.isKeep(extractState(info));
        let isMayBe = true;
        if (isPHashExact && isDHashExact) {
          isMayBe = false;
        }
        return {
          info,
          isSameDir,
          isAccessible,
          isSmallSize,
          isSmallPixel,
          isSamePixel,
          isNewer,
          isValidDistance,
          isPHashExact,
          isDHashExact,
          isSmallEntropy,
          isLowQuality,
          isDifferentMean,
          isStatisticError,
          isWillKeep,
          isKeeping,
          isMayBe
        };
      })
    );

    // 1. must be delete
    // 2. may be delete
    // 3. may be replace
    // 4. must be replace

    // delete, keep, replace
    const results = factors.map((factor): JudgeResultSimple => {
      this.log.trace(JSON.stringify(factor, null, 2));
      if (factor.isValidDistance === false) {
        return [TYPE_HOLD, factor.info, TYPE_PROCESS_ERROR];
      }
      const rejectResult = this.detectPHashRejectResult(
        factor.isMayBe,
        factor.isSmallPixel,
        factor.isSmallSize,
        factor.isNewer,
        factor.isSamePixel,
        factor.info
      );
      if (rejectResult) {
        return this.fixPHashHitResult(
          rejectResult,
          factor.isMayBe,
          factor.isWillKeep,
          factor.isKeeping
        );
      }
      if (factor.isAccessible === false) {
        return [TYPE_HOLD, factor.info, TYPE_P_HASH_MATCH_LOST_FILE];
      }

      if (factor.isStatisticError === false) {
        const statisticRejectResult = this.detectStatisticRejectResult(
          factor.isMayBe,
          factor.isSmallEntropy,
          factor.isDifferentMean,
          factor.isLowQuality,
          factor.info
        );

        if (statisticRejectResult) {
          return this.fixPHashHitResult(
            statisticRejectResult,
            factor.isMayBe,
            factor.isWillKeep,
            factor.isKeeping
          );
        }
      }

      return this.fixPHashHitResult(
        [TYPE_REPLACE, factor.info, TYPE_P_HASH_MATCH],
        factor.isMayBe,
        factor.isWillKeep,
        factor.isKeeping
      );
    });

    let result;
    const deleteResult = results.find(([action]) => action === TYPE_DELETE);
    const replaceResult = results.find(([action]) => action === TYPE_REPLACE);
    if (deleteResult) {
      result = deleteResult;
    } else if (replaceResult) {
      result = replaceResult;
    }
    return this.logResult(
      fileInfo,
      result || [TYPE_HOLD, null, TYPE_P_HASH_MAY_BE, results]
    );
  };

  // eslint-disable-next-line complexity
  fixPHashHitResult = (
    result: JudgeResultSimple,
    isMayBe: boolean,
    isWillKeep: boolean,
    isKeeping: boolean
  ): [ActionType, ?HashRow, ReasonType] => {
    const [action, hitRow, reason] = result;
    if (isWillKeep === false && action === TYPE_REPLACE && isKeeping) {
      return [
        this.fixAction(isMayBe, TYPE_SAVE),
        hitRow,
        TYPE_P_HASH_MATCH_KEEPING
      ];
    }
    if (isWillKeep) {
      if (action === TYPE_DELETE && isKeeping === false) {
        return [
          this.fixAction(isMayBe, TYPE_SAVE),
          hitRow,
          TYPE_P_HASH_MATCH_WILL_KEEP
        ];
      }
      if (action === TYPE_REPLACE && isKeeping) {
        return [
          this.fixAction(isMayBe, TYPE_SAVE),
          hitRow,
          TYPE_P_HASH_MATCH_KEEPING
        ];
      }
      if (action === TYPE_REPLACE && isKeeping === false) {
        return [
          this.fixAction(isMayBe, TYPE_TRANSFER),
          hitRow,
          TYPE_P_HASH_MATCH_TRANSFER
        ];
      }
    }
    return [this.fixAction(isMayBe, action), hitRow, reason];
  };

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
        this.fixAction(!isMayBe, TYPE_SAVE),
        info,
        TYPE_P_HASH_REJECT_DIFFERENT_MEAN
      ];
    }

    if (isSmallEntropy) {
      return [
        this.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_ENTROPY
      ];
    }

    if (isLowQuality) {
      return [
        this.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_QUALITY
      ];
    }
    return null;
  };

  fixAction = (isMayBe: boolean, action: ActionType): ActionType =>
    isMayBe ? TYPE_HOLD : action;

  detectPHashRejectResult(
    isMayBe: boolean,
    isSmallPixel: boolean,
    isSmallSize: boolean,
    isNewer: boolean,
    isSamePixel: boolean,
    info: HashRow
  ): JudgeResultSimple | null {
    if (isSmallPixel) {
      return [
        this.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_RESOLUTION
      ];
    }
    if (isSmallSize) {
      return [
        this.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_FILE_SIZE
      ];
    }
    if (isNewer && isSamePixel) {
      return [
        this.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_NEWER
      ];
    }
    return null;
  }

  /* eslint-disable complexity */
  logResult(
    { from_path: fromPath, size, width, height, p_hash: pHash }: FileInfo,
    result: JudgeResultSimple | JudgeResult
  ): JudgeResult {
    let message = null;
    let isWarn = false;
    const reasonType: ReasonType = result[2];
    switch (reasonType) {
      case TYPE_SWEEP_DEDUPPER_FILE:
        return this.convertToFullResult(result);
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
        {
          const info = result[1];
          if (info) {
            message = `p_hash = ${String(pHash)}-${String(info.p_hash)}`;
          }
        }
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

    const pHashMatchResults = ((result: any): JudgeResult)[3];

    if (pHashMatchResults) {
      pHashMatchResults.forEach(([action, hitFile, reason]) => {
        if (hitFile) {
          this.log.info(
            `pHash match judge: from_path = ${fromPath} to_path = ${
              hitFile.to_path
            } action = ${action} reason = ${reason}`
          );
        } else {
          this.log.info(
            `pHash match judge: from_path = ${fromPath} action = ${action} reason = ${reason}`
          );
        }
      });
    }
    return this.convertToFullResult(result);
  }
  /* eslint-enable complexity */

  convertToFullResult = (
    result: JudgeResultSimple | JudgeResult
  ): JudgeResult => {
    if (result.length === 3) {
      return [result[0], result[1], result[2], []];
    }
    return ((result: any): JudgeResult);
  };

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
    if (this.isNgFileName(this.as.getFileName(fileInfo.from_path))) {
      return TYPE_NG_FILE_NAME;
    }
    if (this.isNgDirPath(fileInfo.from_path)) {
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

  async detectDeepLearningReason(fileInfo: FileInfo): Promise<?ReasonType> {
    if (await this.ds.isAcceptable(fileInfo)) {
      return null;
    }
    return TYPE_DEEP_LEARNING;
  }

  // eslint-disable-next-line complexity
  async handleFileNameMark(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow,
    storedFileInfoByPHashs: HashRow[],
    marks: Set<FileNameMark>
  ): Promise<JudgeResult> {
    if (marks.has(MARK_HOLD)) {
      return this.logResult(fileInfo, [TYPE_HOLD, null, TYPE_FILE_MARK_HOLD]);
    }
    if (marks.has(MARK_BLOCK)) {
      return this.logResult(fileInfo, [
        TYPE_DELETE,
        null,
        TYPE_FILE_MARK_BLOCK
      ]);
    }
    if (marks.has(MARK_DEDUPE)) {
      return this.logResult(fileInfo, [
        TYPE_DELETE,
        null,
        TYPE_FILE_MARK_DEDUPE
      ]);
    }
    if (marks.has(MARK_ERASE)) {
      return this.logResult(fileInfo, [
        TYPE_DELETE,
        null,
        TYPE_FILE_MARK_ERASE
      ]);
    }
    if (marks.has(MARK_REPLACE)) {
      if (storedFileInfoByPHashs.length) {
        return this.logResult(fileInfo, [
          TYPE_REPLACE,
          (await this.detectReplaceFile(fileInfo, storedFileInfoByPHashs)) ||
            storedFileInfoByPHashs[0],
          TYPE_FILE_MARK_REPLACE
        ]);
      }
      this.log.warn(
        `replace mark, but no duplication. path = ${fileInfo.from_path}`
      );
      return this.logResult(fileInfo, [TYPE_SAVE, null, TYPE_FILE_MARK_SAVE]);
    }
    if (marks.has(MARK_TRANSFER)) {
      if (storedFileInfoByPHashs.length) {
        return this.logResult(fileInfo, [
          TYPE_TRANSFER,
          (await this.detectReplaceFile(fileInfo, storedFileInfoByPHashs)) ||
            storedFileInfoByPHashs[0],
          TYPE_FILE_MARK_TRANSFER
        ]);
      }
      this.log.warn(
        `replace mark, but no duplication. path = ${fileInfo.from_path}`
      );
      return this.logResult(fileInfo, [TYPE_SAVE, null, TYPE_FILE_MARK_SAVE]);
    }
    if (marks.has(MARK_SAVE)) {
      return this.logResult(fileInfo, [TYPE_SAVE, null, TYPE_FILE_MARK_SAVE]);
    }
    throw new Error(
      `unknown file mark: marks = ${Array.from(marks).join(",")}`
    );
  }

  detectReplaceFile = async (
    fileInfo: FileInfo,
    storedFileInfoByPHashs: HashRow[]
  ): Promise<?HashRow> => {
    const replacePath = await FileNameMarkHelper.findReplaceFile(
      fileInfo.from_path
    );
    if (!replacePath) {
      return null;
    }
    return storedFileInfoByPHashs.find(h => h.to_path === replacePath);
  };

  handleRelocate(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow
  ): JudgeResult {
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

  handleHashHit = (
    fileInfo: FileInfo,
    storedFileInfoByHash: HashRow
  ): JudgeResult => {
    const prevState = DbService.reverseLookupFileStateDivision(
      storedFileInfoByHash.state
    );

    if (fileInfo.state === STATE_KEEPING && prevState === STATE_ACCEPTED) {
      return this.logResult(fileInfo, [
        TYPE_TRANSFER,
        storedFileInfoByHash,
        TYPE_HASH_MATCH_TRANSFER
      ]);
    }

    return this.logResult(fileInfo, [TYPE_DELETE, null, TYPE_HASH_MATCH]);
  };

  handleNameHit = (
    fileInfo: FileInfo,
    storedFileInfoByNames: HashRow[]
  ): JudgeResult =>
    this.logResult(fileInfo, [
      TYPE_HOLD,
      null,
      TYPE_FILE_NAME_MATCH,
      storedFileInfoByNames.map(f => [TYPE_HOLD, f, TYPE_FILE_NAME_MATCH])
    ]);

  async detectFileTypeReasonAndAction(
    fileInfo: FileInfo
  ): Promise<?[ReasonType, ActionType]> {
    if (fileInfo.type === TYPE_UNKNOWN) {
      return [TYPE_UNKNOWN_FILE_TYPE, TYPE_HOLD];
    }
    if (fileInfo.type === TYPE_DEDUPPER_CACHE) {
      if (await this.fcs.isCacheFileActive(fileInfo.from_path)) {
        return [TYPE_KEEP_DEDUPPER_FILE, TYPE_HOLD];
      }
      return [TYPE_SWEEP_DEDUPPER_FILE, TYPE_DELETE];
    }
    if (fileInfo.type === TYPE_DEDUPPER_LOCK) {
      return [TYPE_SWEEP_DEDUPPER_FILE, TYPE_DELETE];
    }
    return null;
  }

  // eslint-disable-next-line complexity
  async detect(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow,
    storedFileInfoByPHashs: HashRow[],
    storedFileInfoByNames: HashRow[] = []
  ): Promise<JudgeResult> {
    if (this.config.relocate) {
      return this.handleRelocate(fileInfo, storedFileInfoByHash);
    }
    const ngPathReason = this.detectNgPathReason(fileInfo);
    if (ngPathReason) {
      return this.logResult(fileInfo, [TYPE_DELETE, null, ngPathReason]);
    }

    const reasonAndAction = await this.detectFileTypeReasonAndAction(fileInfo);
    if (reasonAndAction) {
      return this.logResult(fileInfo, [
        reasonAndAction[1],
        null,
        reasonAndAction[0]
      ]);
    }

    const marks = FileNameMarkHelper.extract(fileInfo.from_path);
    if (marks.size) {
      return this.handleFileNameMark(
        fileInfo,
        storedFileInfoByHash,
        storedFileInfoByPHashs,
        marks
      );
    }

    const deleteReason = this.detectDeleteReason(fileInfo);
    if (deleteReason) {
      return this.logResult(fileInfo, [
        this.fixAction(!this.config.instantDelete, TYPE_DELETE),
        null,
        deleteReason
      ]);
    }

    if (storedFileInfoByHash) {
      return this.handleHashHit(fileInfo, storedFileInfoByHash);
    }

    const deepLearningReason = await this.detectDeepLearningReason(fileInfo);
    if (deepLearningReason) {
      return this.logResult(fileInfo, [
        this.config.deepLearningConfig.instantDelete ? TYPE_DELETE : TYPE_HOLD,
        null,
        deepLearningReason
      ]);
    }

    if (storedFileInfoByPHashs.length) {
      return this.handlePHashHit(fileInfo, storedFileInfoByPHashs);
    }

    if (storedFileInfoByNames.length) {
      return this.handleNameHit(fileInfo, storedFileInfoByNames);
    }

    return this.logResult(fileInfo, [TYPE_SAVE, null, TYPE_NO_PROBLEM]);
  }
}
