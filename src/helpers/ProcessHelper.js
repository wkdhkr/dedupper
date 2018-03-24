// @flow
export default class ProcessHelper {
  static stdin = process.stdin;
  static stdout = process.stdout;

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
}
