// @flow
import sleep from "await-sleep";
import os from "os-utils";

export default class ProcessHelper {
  static stdin = process.stdin;
  static stdout = process.stdout;
  static currentCpuLoad = 1;

  static setStdInHook = (event: string, cb: () => void) => {
    if (ProcessHelper.stdout.isTTY) {
      (ProcessHelper.stdin: any).setRawMode(true);
    }
    ProcessHelper.stdin.resume();
    ProcessHelper.stdin.on(event, cb);
  };

  static exit = (code: number) => {
    process.exit(code);
  };

  static waitCpuIdle = async (max: number): Promise<void> => {
    // eslint-disable-next-line no-await-in-loop
    while ((await ProcessHelper.getCpuUsage()) > max / 100) {
      const randomSleepMs = (Math.random() * 10 + 1) * 1000;
      // console.log(`sleep for cpu idle.. sleepMs = ${randomSleepMs}`);
      // eslint-disable-next-line no-await-in-loop
      await sleep(randomSleepMs);
    }
  };

  static setCurrentCpuLoad = (n: number) => {
    ProcessHelper.currentCpuLoad = n;
    // console.log(`cpu load: ${n}`);
  };

  static getCpuUsage = (): Promise<number> =>
    new Promise(async resolve => {
      os.cpuUsage(v => {
        ProcessHelper.setCurrentCpuLoad(v);
      });
      resolve(ProcessHelper.currentCpuLoad);
    });
}
