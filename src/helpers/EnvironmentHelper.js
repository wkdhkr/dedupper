// @flow
import path from "path";
import fs from "fs-extra";
import requireUncached from "require-uncached";
import type { UserConfig, UserBaseConfig, PathMatchConfig } from "./../types";

export default class EnvironmentHelper {
  static getHomeDir(): string {
    return String(
      process.platform === "win32"
        ? process.env.USERPROFILE
        : process.env.HOME || ""
    );
  }

  static isTest(): boolean {
    return process.env.NODE_ENV === "test";
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
}
