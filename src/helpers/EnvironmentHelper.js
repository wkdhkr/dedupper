// @flow

export default class EnvironmentHelper {
  static getHomeDir(): string {
    return String(
      process.platform === "win32"
        ? process.env.USERPROFILE
        : process.env.HOME || ""
    );
  }
}
