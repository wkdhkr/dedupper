// @flow
import type { Logger } from "log4js";

import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import PathLogic from "./PathLogic";
import TypeLogic from "./TypeLogic";
import ResultLogic from "./ResultLogic";
import ContentsLogic from "./ContentsLogic";
import HashLogic from "./HashLogic";
import PHashLogic from "./PHashLogic";
import ActionLogic from "./ActionLogic";
import DeepLearningLogic from "./DeepLearningLogic";
import StateLogic from "./StateLogic";
import { TYPE_HOLD, TYPE_DELETE, TYPE_SAVE } from "../../types/ActionTypes";
import { TYPE_NO_PROBLEM } from "../../types/ReasonTypes";

import type { StateDeduped, StateBlocked } from "../../types/FileStates";
import type { ReasonType } from "../../types/ReasonTypes";
import type { ClassifyType } from "../../types/ClassifyTypes";
import type { JudgeResult } from "../../types/JudgeResult";
import type { Config, FileInfo, HashRow } from "../../types";

export default class JudgmentService {
  log: Logger;
  config: Config;
  pl: PathLogic;
  tl: TypeLogic;
  rl: ResultLogic;
  cl: ContentsLogic;
  hl: HashLogic;
  phl: PHashLogic;
  al: ActionLogic;
  dl: DeepLearningLogic;
  sl: StateLogic;

  detectDeleteState: ReasonType => StateDeduped | StateBlocked | null;
  isForgetType: ClassifyType => boolean;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.pl = new PathLogic(config);
    this.tl = new TypeLogic(config);
    this.rl = new ResultLogic(config);
    this.cl = new ContentsLogic(config);
    this.hl = new HashLogic(config);
    this.phl = new PHashLogic(config);
    this.al = new ActionLogic();
    this.dl = new DeepLearningLogic(config);
    this.sl = new StateLogic(config);
    this.detectDeleteState = this.sl.detectDeleteState;
    this.isForgetType = this.tl.isForgetType;
  }

  isWhiteListName = (name: string): boolean =>
    this.config.fileNameWhiteList.some(pattern => {
      if (pattern instanceof RegExp) {
        return Boolean(name.match(pattern));
      }
      return pattern === name;
    });

  // eslint-disable-next-line complexity
  async detect(
    fileInfo: FileInfo,
    storedFileInfoByHash: ?HashRow,
    storedFileInfoByPHashs: HashRow[],
    storedFileInfoByNames: HashRow[] = []
  ): Promise<JudgeResult> {
    if (this.config.relocate) {
      return this.hl.handleRelocate(fileInfo, storedFileInfoByHash);
    }
    const ngPathReason = this.pl.detectNgPathReason(fileInfo);
    if (ngPathReason) {
      return this.rl.logResult(fileInfo, [TYPE_DELETE, null, ngPathReason]);
    }

    const reasonAndAction = await this.tl.detectFileTypeReasonAndAction(
      fileInfo
    );
    if (reasonAndAction) {
      return this.rl.logResult(fileInfo, [
        reasonAndAction[1],
        null,
        reasonAndAction[0]
      ]);
    }

    const marks = FileNameMarkHelper.extract(fileInfo.from_path);
    if (marks.size) {
      return this.pl.handleFileNameMark(
        fileInfo,
        storedFileInfoByHash,
        storedFileInfoByPHashs,
        marks
      );
    }

    const deleteReason = this.cl.detectDeleteReason(fileInfo);
    if (deleteReason) {
      return this.rl.logResult(fileInfo, [
        this.al.fixAction(!this.config.instantDelete, TYPE_DELETE),
        null,
        deleteReason
      ]);
    }

    if (storedFileInfoByHash) {
      const judgeResult = await this.hl.handleHashHit(
        fileInfo,
        storedFileInfoByHash
      );
      if (judgeResult) {
        return judgeResult;
      }
    }

    const deepLearningReason = await this.dl.detectDeepLearningReason(fileInfo);
    if (deepLearningReason) {
      return this.rl.logResult(fileInfo, [
        this.config.deepLearningConfig.instantDelete ? TYPE_DELETE : TYPE_HOLD,
        null,
        deepLearningReason
      ]);
    }

    if (storedFileInfoByPHashs.length) {
      return this.phl.handlePHashHit(fileInfo, storedFileInfoByPHashs);
    }

    if (storedFileInfoByNames.length) {
      return this.pl.handleNameHit(fileInfo, storedFileInfoByNames);
    }

    return this.rl.logResult(fileInfo, [TYPE_SAVE, null, TYPE_NO_PROBLEM]);
  }
}
