// @flow
import { exec } from "child-process-promise";

import type { ImageContentsInfo } from "./../../../types";

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
  }): ImageContentsInfo => {
    const width = Number((/width=(\d+)/.exec(stdout) || [0]).pop());
    const height = Number((/height=(\d+)/.exec(stdout) || [0]).pop());
    return {
      width,
      height,
      ratio: width / height || 0,
      damaged: Boolean(stderr)
    };
  };

  read(targetPath: string): Promise<ImageContentsInfo> {
    return exec(this.createExecCommand(targetPath))
      .then(this.parseOutput)
      .catch(this.parseOutput)
      .catch({ width: 0, height: 0, ratio: 0, damaged: true });
  }
}
