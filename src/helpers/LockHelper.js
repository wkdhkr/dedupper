// @flow
import os from "os";
import path from "path";
import lockFile from "lockfile";

export default class LockHelper {
  static getLockFilePath(name: string): string {
    return path.join(os.tmpdir(), `dedupper.${name}.lock`);
  }

  static async lockProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      lockFile.lock(
        this.getLockFilePath("process"),
        {
          wait: Infinity,
          pollPeriod: 1000
        },
        err => {
          if (err) {
            reject(err);
          }
          resolve();
        }
      );
    });
  }

  static unlockProcess(): Promise<void> {
    return new Promise(resolve => {
      lockFile.unlock(this.getLockFilePath("process"), () => resolve());
    });
  }
}
