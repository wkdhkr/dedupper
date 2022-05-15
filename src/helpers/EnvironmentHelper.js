// @flow
import path from "path";
import fs from "fs-extra";
import requireUncached from "require-uncached";
import type {
  Config,
  UserConfig,
  UserBaseConfig,
  ClassifyTypeConfig,
  PathMatchConfig
} from "../types";
import type { ClassifyType } from "../types/ClassifyTypes";

export default class EnvironmentHelper {
  static getHomeDir(): string {
    return process.env.USERPROFILE || ".";
  }

  static isTest(): boolean {
    return process.env.NODE_ENV === "test";
  }

  static createConfig(
    config: Config,
    pathMatchConfig: UserBaseConfig,
    classifyTypeConfig: UserBaseConfig,
    dryrun?: boolean | null,
    pathString?: string
  ): Config {
    return {
      ...config,
      ...pathMatchConfig,
      ...classifyTypeConfig,
      ...pathMatchConfig.forceConfig,
      ...(classifyTypeConfig.forceConfig: any),
      dryrun,
      path: pathString
    };
  }

  static loadUserConfig(force: boolean = false): UserConfig {
    let userConfig: UserConfig = {};
    if (this.isTest() && force === false) {
      return userConfig;
    }
    const userConfigPath = path.join(
      EnvironmentHelper.getHomeDir(),
      ".dedupper.config.js"
    );
    if (fs.pathExistsSync(userConfigPath)) {
      userConfig = requireUncached(userConfigPath);
    }
    return userConfig;
  }

  static loadPathMatchConfig(
    pathMatchConfig?: PathMatchConfig,
    targetPath: string
  ): UserBaseConfig {
    let resultConfig = {};

    if (!pathMatchConfig) {
      return resultConfig;
    }

    Object.entries(pathMatchConfig).forEach(([pattern, userBaseConfig]) => {
      if (targetPath.includes(pattern)) {
        resultConfig = {
          ...resultConfig,
          ...userBaseConfig
        };
      }
    });

    return resultConfig;
  }

  static loadClassifyTypeConfig(
    classifyTypeConfig?: ClassifyTypeConfig,
    classifyType: ClassifyType
  ): UserBaseConfig {
    if (!classifyTypeConfig) {
      return {};
    }

    return classifyTypeConfig[classifyType] || {};
  }
}
