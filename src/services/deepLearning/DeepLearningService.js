// @flow
import type { Exact, Config } from "../../types";
import OpenNsfwService from "./OpenNsfwService";
import RudeCarnieService from "./RudeCarnieService";

export default class DeepLearningService {
  config: Exact<Config>;
  openNsfwService: OpenNsfwService;
  rudeCarnieService: RudeCarnieService;

  constructor(config: Exact<Config>) {
    this.config = config;
    this.openNsfwService = new OpenNsfwService(config);
    this.rudeCarnieService = new RudeCarnieService(config);
  }

  isAcceptable = async (targetPath: string): Promise<boolean> => {
    const isNsfwAcceptable = await this.openNsfwService.isAcceptable(
      targetPath
    );
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
    return this.rudeCarnieService.isAcceptable(targetPath);
  };
}
