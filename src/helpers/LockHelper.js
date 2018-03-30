// @flow
import sleep from "await-sleep";
import os from "os";
import path from "path";
import lockFile from "lockfile";

export default class LockHelper {
  static keyLockMap: { [string]: true } = {};

  static getLockFilePath(name: string): string {
    return path.join(os.tmpdir(), `dedupper.${name}.lock`);
  }

  static async lockKey(key: string): Promise<void> {
    if (key === "") {
      return;
    }
    let count = 1;
    while (LockHelper.keyLockMap[key]) {
      if (count === 60 * 10) {
        throw new Error(`key lock fail. key = ${key}`);
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
      count += 1;
    }
    LockHelper.keyLockMap[key] = true;
  }

  static unlockKey(key: string) {
    if (key === "") {
      return;
    }
    delete LockHelper.keyLockMap[key];
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
