// @flow
import typeof { Logger } from "log4js";

import AttributeService from "../fs/AttributeService";
import DbService from "../db/DbService";
import PathLogic from "./PathLogic";
import TypeLogic from "./TypeLogic";
import ResultLogic from "./ResultLogic";
import { STATE_ACCEPTED, STATE_KEEPING } from "../../types/FileStates";
import {
  TYPE_SAVE,
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_RELOCATE,
  TYPE_TRANSFER
} from "../../types/ActionTypes";
import {
  TYPE_HASH_MATCH_RECOVERY,
  TYPE_HASH_MATCH,
  TYPE_HASH_MATCH_RELOCATE,
  TYPE_HASH_MISMATCH_RELOCATE,
  TYPE_HASH_MATCH_TRANSFER
} from "../../types/ReasonTypes";
import type { JudgeResult } from "../../types/JudgeResult";
import type { Config, FileInfo, HashRow } from "../../types";

export default class HashLogic {
  log: Logger;

  config: Config;

  pl: PathLogic;

  tl: TypeLogic;

  rl: ResultLogic;

  as: AttributeService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.pl = new PathLogic(config);
    this.tl = new TypeLogic(config);
    this.rl = new ResultLogic(config);
    this.as = new AttributeService(config);
  }

  handleRelocate(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow
  ): JudgeResult {
    if (storedFileInfoByHash) {
      return this.rl.logResult(fileInfo, [
        TYPE_RELOCATE,
        storedFileInfoByHash,
        TYPE_HASH_MATCH_RELOCATE
      ]);
    }
    return this.rl.logResult(fileInfo, [
      TYPE_HOLD,
      null,
      TYPE_HASH_MISMATCH_RELOCATE
    ]);
  }

  handleHashHit = async (
    fileInfo: FileInfo,
    storedFileInfoByHash: HashRow
  ): Promise<?JudgeResult> => {
    const prevState = DbService.reverseLookupFileStateDivision(
      storedFileInfoByHash.state
    );

    if (!this.config.noTransfer) {
      if (fileInfo.state === STATE_KEEPING && prevState === STATE_ACCEPTED) {
        return this.rl.logResult(fileInfo, [
          TYPE_TRANSFER,
          storedFileInfoByHash,
          TYPE_HASH_MATCH_TRANSFER
        ]);
      }
    }

    if (
      // this.as.isLibraryPlace(fileInfo.from_path) &&
      DbService.isAcceptedState(storedFileInfoByHash.state)
    ) {
      if (
        this.config.recovery &&
        (await this.as.isAccessible(storedFileInfoByHash.to_path)) === false
      ) {
        return this.rl.logResult(fileInfo, [
          TYPE_SAVE,
          storedFileInfoByHash,
          TYPE_HASH_MATCH_RECOVERY
        ]);
      }
      this.log.info(
        `Detected exiled files in the library. from_path = ${fileInfo.from_path}, to_path = ${storedFileInfoByHash.to_path}`
      );
    }

    return this.rl.logResult(fileInfo, [TYPE_DELETE, null, TYPE_HASH_MATCH]);
  };
}
