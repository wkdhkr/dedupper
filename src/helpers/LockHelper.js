// @flow
import sleep from "await-sleep";
import os from "os";
import path from "path";
import lockFile from "lockfile";
import util from "util";

const lockFileAsync = util.promisify(lockFile.lock).bind(lockFile);

export default class LockHelper {
  static keyLockMap: { [string]: true } = {};

  static getLockFilePath(name: string): string {
    return path.join(os.tmpdir(), `dedupper.${name}.lock`);
  }

  static async lockKey(key: string, force: boolean = false) {
    if (key === "") {
      return;
    }
    let count = 1;
    while (LockHelper.keyLockMap[key]) {
      if (count === 60 * 10) {
        if (force) {
          return;
        }
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

  static lockProcessSync = (name: string = "process") => {
    try {
      (lockFile: any).lockSync(this.getLockFilePath(name));
      return true;
    } catch (e) {
      return false;
    }
  };

  static lockProcess = async (name: string = "process"): Promise<void> => {
    /*
    (lockFile: any).check(
      this.getLockFilePath(name),
      (checkError, isLocked: boolean) => {
        if (checkError || isLocked === false) {
          lockFile.lock(
            this.getLockFilePath(name),
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
        } else {
          resolve();
        }
      }
    );
    */
    try {
      await lockFileAsync(this.getLockFilePath(name), {
        wait: Infinity,
        stale: 1000 * 60 * 10, // 10 min
        pollPeriod: 1000
      });
    } catch (e) {
      await this.lockProcess(name);
    }
  };

  static unlockProcess(name: string = "process"): Promise<void> {
    return new Promise(resolve => {
      lockFile.unlock(this.getLockFilePath(name), () => resolve());
    });
  }
}
