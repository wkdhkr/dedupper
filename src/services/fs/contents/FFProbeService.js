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
    return {
      width,
      height,
      ratio: width / height || 0,
      damaged: Boolean(stderr)
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
    try {
      await exec(this.createExecCommand(targetPath));
    } catch (e) {
      console.log(e);
    }
    return exec(this.createExecCommand(targetPath))
      .then(this.parseOutput)
      .catch(this.parseOutput)
      .catch({ width: 0, height: 0, ratio: 0, damaged: true });
  }
}
