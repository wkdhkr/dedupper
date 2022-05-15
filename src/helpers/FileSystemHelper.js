// @flow
import path from "path";
import fs from "fs-extra";
import tmp from "tmp-promise";

export default class FileSystemHelper {
  static isDirectory: (targetPath: string) => any | boolean = (
    targetPath: string
  ) => {
    try {
      return fs.lstatSync(targetPath).isDirectory();
    } catch (e) {
      return false;
    }
  };

  static clearFixedPath: (
    targetPathFixed: string,
    targetPath: string
  ) => Promise<void> = async (
    targetPathFixed: string,
    targetPath: string
  ): Promise<void> => {
    if (targetPathFixed !== targetPath && (await fs.exists(targetPathFixed))) {
      await fs.unlink(targetPathFixed);
    }
  };

  /**
   * XXX: pHash library cannot process multibyte file path.
   */
  static prepareEscapePath: (targetPath: string) => Promise<string> = async (
    targetPath: string
  ): Promise<string> => {
    const tmpPath = await tmp.tmpName();
    const finalTmpPath = tmpPath + path.parse(targetPath).ext;
    await fs.symlink(path.resolve(targetPath), finalTmpPath);
    return finalTmpPath;
  };

  static clearEscapePath: (escapePath: string) => Promise<void> = async (
    escapePath: string
  ): Promise<void> => {
    if (await fs.pathExists(escapePath)) {
      await fs.unlink(escapePath);
    }
  };
}
