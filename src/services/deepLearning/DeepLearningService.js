// @flow
import axios from "axios";
import OpenNsfwService from "./OpenNsfwService";
import NsfwJsService from "./NsfwJsService";
import PoseNetService from "./poseNet/PoseNetService";
import CocoSsdService from "./CocoSsdService";
import RudeCarnieService from "./RudeCarnieService";
import FaceSpinnerService from "./FaceSpinnerService";
import FaceApiService from "./faceApi/FaceApiService";
import FacePPService from "./facePP/FacePPService";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import type { FileInfo, Config } from "../../types";

export default class DeepLearningService {
  config: Config;

  facePPService: FacePPService;

  openNsfwService: OpenNsfwService;

  rudeCarnieService: RudeCarnieService;

  nsfwJsService: NsfwJsService;

  faceApiService: FaceApiService;

  faceSpinnerService: FaceSpinnerService;

  poseNetService: PoseNetService;

  cocoSsdService: CocoSsdService;

  constructor(config: Config) {
    // prevent body size limit
    (axios.defaults: any).maxBodyLength = 1024 * 1024 * 1000;
    this.config = config;
    this.openNsfwService = new OpenNsfwService(config);
    this.rudeCarnieService = new RudeCarnieService(config);
    this.nsfwJsService = new NsfwJsService(config);
    this.faceApiService = new FaceApiService(config);
    this.faceSpinnerService = new FaceSpinnerService(config);
    this.cocoSsdService = new CocoSsdService(config);
    this.poseNetService = new PoseNetService(config);
    this.facePPService = new FacePPService(config);
  }

  isNsfwAcceptable: (fileInfo: FileInfo) => Promise<boolean> = async (
    fileInfo: FileInfo
  ): Promise<boolean> => {
    const targetPath = fileInfo.from_path;
    if (this.config.deepLearningConfig.nsfwMode === "none") {
      return this.config.deepLearningConfig.nsfwModeNoneDefault;
    }
    if (this.config.deepLearningConfig.nsfwBackEnd === "OpenNSFW") {
      return this.openNsfwService.isAcceptable(targetPath);
    }
    if (this.config.deepLearningConfig.nsfwBackEnd === "NSFWJS") {
      return this.nsfwJsService.isAcceptable(fileInfo);
    }
    throw new Error("unknown nsfw BackEnd");
  };

  isFaceAcceptable: (fileInfo: FileInfo) => Promise<boolean> = async (
    fileInfo: FileInfo
  ): Promise<boolean> => {
    if (this.config.deepLearningConfig.faceMode === "none") {
      return this.config.deepLearningConfig.faceModeNoneDefault;
    }
    if (this.config.deepLearningConfig.faceBackEnd === "RudeCarnie") {
      return this.rudeCarnieService.isAcceptable(fileInfo.from_path);
    }
    if (this.config.deepLearningConfig.faceBackEnd === "face-api.js") {
      throw new Error("face-api.js is not work yet.");
    }
    if (this.config.deepLearningConfig.faceBackEnd === "facepp") {
      return this.facePPService.isAcceptable(fileInfo);
    }
    throw new Error("unknown face BackEnd");
  };

  isAcceptable: (fileInfo: FileInfo) => Promise<boolean> = async (
    fileInfo: FileInfo
  ): Promise<boolean> => {
    const { type } = fileInfo;
    const isNsfwAcceptable =
      type !== TYPE_IMAGE || (await this.isNsfwAcceptable(fileInfo));
    if (
      this.config.deepLearningConfig.logicalOperation === "and" &&
      isNsfwAcceptable === false
    ) {
      return isNsfwAcceptable;
    }
    if (
      this.config.deepLearningConfig.logicalOperation === "or" &&
      (isNsfwAcceptable === true ||
        this.config.deepLearningConfig.nsfwPostJudgeFunction(fileInfo))
    ) {
      return isNsfwAcceptable;
    }
    return type !== TYPE_IMAGE || this.isFaceAcceptable(fileInfo);
  };
}
