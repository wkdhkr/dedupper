// @flow
import path from "path";
import fs from "fs-extra";
import requireUncached from "require-uncached";
import type { UserConfig } from "./../types";

export default class EnvironmentHelper {
  static getHomeDir(): string {
    return String(
      process.platform === "win32"
        ? process.env.USERPROFILE
        : process.env.HOME || ""
    );
  }

  static loadUserConfig(): UserConfig {
    let userConfig: UserConfig = {};
    const userConfigPath = path.join(
      EnvironmentHelper.getHomeDir(),
      ".dedupper.config.js"
    );
    if (fs.existsSync(userConfigPath)) {
      userConfig = requireUncached(userConfigPath);
    }
    return userConfig;
  }
}
