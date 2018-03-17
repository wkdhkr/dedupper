// @flow
import { exec } from "child-process-promise";

export default class FFProbeService {
  createExecCommand = (targetPath: string): string =>
    [
      "ffprobe",
      "-v",
      "warning",
      "-threads",
      "0",
      "-of",
      "flat=s=_",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=height,width",
      JSON.stringify(targetPath)
    ].join(" ");

  parseOutput = ({
    stdout,
    stderr
  }: {
    stdout: string,
    stderr: string
  }): { width: number, height: number, ratio: number, damaged: boolean } => {
    const width = Number((/width=(\d+)/.exec(stdout) || [0]).pop());
    const height = Number((/height=(\d+)/.exec(stdout) || [0]).pop());
    let damaged = false;
    if (stderr) {
      damaged = Boolean(
        (stderr || "")
          .split("\n")
          .filter(
            l => !["Unsupported codec with id "].some(w => l.includes(w) || !l)
          ).length
      );
    }
    return {
      width,
      height,
      ratio: width / height || 0,
      damaged
    };
  };

  async read(
    targetPath: string
  ): Promise<{
    width: number,
    height: number,
    ratio: number,
    damaged: boolean
  }> {
    return exec(this.createExecCommand(targetPath))
      .then(this.parseOutput)
      .catch(this.parseOutput)
      .catch({ width: 0, height: 0, ratio: 0, damaged: true });
  }
}
