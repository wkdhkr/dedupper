// @flow
import fs from "fs-extra";

export default class FileSystemHelper {
  static isDirectory = (targetPath: string) => {
    try {
      return fs.lstatSync(targetPath).isDirectory();
    } catch (e) {
      return false;
    }
  };
}
