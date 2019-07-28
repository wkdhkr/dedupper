// @flow
import type { Logger } from "log4js";

import AttributeService from "../fs/AttributeService";
import DbService from "../db/DbService";
import ActionLogic from "./ActionLogic";
import ResultLogic from "./ResultLogic";
import ContentsLogic from "./ContentsLogic";
import StateLogic from "./StateLogic";
import { STATE_ACCEPTED } from "../../types/FileStates";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE,
  TYPE_TRANSFER
} from "../../types/ActionTypes";
import {
  TYPE_P_HASH_MATCH,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_MAY_BE,
  TYPE_P_HASH_MATCH_LOST_FILE,
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_PROCESS_ERROR,
  TYPE_P_HASH_MATCH_KEEPING,
  TYPE_P_HASH_MATCH_WILL_KEEP,
  TYPE_P_HASH_MATCH_TRANSFER
} from "../../types/ReasonTypes";

import type { ActionType } from "../../types/ActionTypes";
import type { ReasonType } from "../../types/ReasonTypes";
import type { FileState } from "../../types/FileStates";
import type { JudgeResult, JudgeResultSimple } from "../../types/JudgeResult";
import type { Config, FileInfo, HashRow } from "../../types";

export default class PHashLogic {
  log: Logger;

  config: Config;

  al: ActionLogic;

  rl: ResultLogic;

  cl: ContentsLogic;

  sl: StateLogic;

  as: AttributeService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.al = new ActionLogic();
    this.rl = new ResultLogic(config);
    this.cl = new ContentsLogic(config);
    this.sl = new StateLogic(config);
    this.as = new AttributeService(config);
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
        } = await this.cl.collectStatisticFactor(fileInfo, info).catch(() => ({
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
        const isWillKeep = this.sl.isKeep(fileInfo.state);
        const isKeeping = this.sl.isKeep(extractState(info));
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
        const statisticRejectResult = this.cl.detectStatisticRejectResult(
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
    const replaceResult = results.find(
      ([action]) => action === TYPE_REPLACE || action === TYPE_TRANSFER
    );
    if (deleteResult) {
      result = deleteResult;
    } else if (replaceResult) {
      result = replaceResult;
    }
    return this.rl.logResult(
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
        this.al.fixAction(isMayBe, TYPE_SAVE),
        hitRow,
        TYPE_P_HASH_MATCH_KEEPING
      ];
    }
    if (isWillKeep) {
      if (action === TYPE_DELETE && isKeeping === false) {
        return [
          this.al.fixAction(isMayBe, TYPE_SAVE),
          hitRow,
          TYPE_P_HASH_MATCH_WILL_KEEP
        ];
      }
      if (action === TYPE_REPLACE && isKeeping) {
        return [
          this.al.fixAction(isMayBe, TYPE_SAVE),
          hitRow,
          TYPE_P_HASH_MATCH_KEEPING
        ];
      }
      if (action === TYPE_REPLACE && isKeeping === false) {
        return [
          this.al.fixAction(isMayBe, TYPE_TRANSFER),
          hitRow,
          TYPE_P_HASH_MATCH_TRANSFER
        ];
      }
    }
    return [this.al.fixAction(isMayBe, action), hitRow, reason];
  };

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
        this.al.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_RESOLUTION
      ];
    }
    if (isSmallSize) {
      return [
        this.al.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_LOW_FILE_SIZE
      ];
    }
    if (isNewer && isSamePixel) {
      return [
        this.al.fixAction(isMayBe, TYPE_DELETE),
        info,
        TYPE_P_HASH_REJECT_NEWER
      ];
    }
    return null;
  }
}
