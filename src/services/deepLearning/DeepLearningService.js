// @flow
import axios from "axios";
import type { FileInfo, Config } from "../../types";
import OpenNsfwService from "./OpenNsfwService";
import NsfwJsService from "./NsfwJsService";
import RudeCarnieService from "./RudeCarnieService";
import FaceApiService from "./faceApi/FaceApiService";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";

export default class DeepLearningService {
  config: Config;

  openNsfwService: OpenNsfwService;

  rudeCarnieService: RudeCarnieService;

  nsfwJsService: NsfwJsService;

  faceApiService: FaceApiService;

  constructor(config: Config) {
    // prevent body size limit
    (axios.defaults: any).maxBodyLength = 1024 * 1024 * 1000;
    this.config = config;
    this.openNsfwService = new OpenNsfwService(config);
    this.rudeCarnieService = new RudeCarnieService(config);
    this.nsfwJsService = new NsfwJsService(config);
    this.faceApiService = new FaceApiService(config);
  }

  isNsfwAcceptable = async (targetPath: string): Promise<boolean> => {
    if (this.config.deepLearningConfig.nsfwMode === "none") {
      return this.config.deepLearningConfig.nsfwModeNoneDefault;
    }
    return this.openNsfwService.isAcceptable(targetPath);
  };

  isFaceAcceptable = async (targetPath: string): Promise<boolean> => {
    if (this.config.deepLearningConfig.faceMode === "none") {
      return this.config.deepLearningConfig.faceModeNoneDefault;
    }
    return this.rudeCarnieService.isAcceptable(targetPath);
  };

  isAcceptable = async (fileInfo: FileInfo): Promise<boolean> => {
    const { from_path: targetPath, type } = fileInfo;
    const isNsfwAcceptable =
      type !== TYPE_IMAGE || (await this.isNsfwAcceptable(targetPath));
    if (
      this.config.deepLearningConfig.logicalOperation === "and" &&
      isNsfwAcceptable === false
    ) {
      return isNsfwAcceptable;
    }
    if (
      this.config.deepLearningConfig.logicalOperation === "or" &&
      isNsfwAcceptable === true
    ) {
      return isNsfwAcceptable;
    }
    return type !== TYPE_IMAGE || this.isFaceAcceptable(targetPath);
  };
}
