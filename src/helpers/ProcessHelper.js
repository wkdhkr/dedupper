// @flow
import sleep from "await-sleep";
import os from "os-utils";

export default class ProcessHelper {
  static stdin: stream$Readable | tty$ReadStream = process.stdin;

  static stdout: stream$Writable | tty$WriteStream = process.stdout;

  static currentCpuLoad: number = 1;

  static setStdInHook: (event: string, cb: () => void) => void = (
    event: string,
    cb: () => void
  ) => {
    if (ProcessHelper.stdout.isTTY) {
      (ProcessHelper.stdin: any).setRawMode(true);
    }
    ProcessHelper.stdin.resume();
    ProcessHelper.stdin.on(event, cb);
  };

  static exit: (code: number) => void = (code: number) => {
    process.exit(code);
  };

  static waitCpuIdle: (max: number) => Promise<void> = async (
    max: number
  ): Promise<void> => {
    // eslint-disable-next-line no-await-in-loop
    while ((await ProcessHelper.getCpuUsage()) > max / 100) {
      const randomSleepMs = (Math.random() * 10 + 1) * 1000;
      // console.log(`sleep for cpu idle.. sleepMs = ${randomSleepMs}`);
      // eslint-disable-next-line no-await-in-loop
      await sleep(randomSleepMs);
    }
  };

  static setCurrentCpuLoad: (n: number) => void = (n: number) => {
    ProcessHelper.currentCpuLoad = n;
    // console.log(`cpu load: ${n}`);
  };

  static getCpuUsage: () => Promise<number> = (): Promise<number> =>
    new Promise(resolve => {
      os.cpuUsage(v => {
        ProcessHelper.setCurrentCpuLoad(v);
      });
      resolve(ProcessHelper.currentCpuLoad);
    });
}
