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

  createExecCommandForAudio = (targetPath: string): string =>
    [
      "ffprobe",
      "-show_data_hash",
      "SHA160",
      "-v",
      "warning",
      "-threads",
      "0",
      "-of",
      "json",
      "-select_streams",
      "a:0",
      "-show_streams",
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
      damaged: this.isDamaged(stderr)
    };
  };

  parseOutputForAudio = ({
    stdout,
    stderr
  }: {
    stdout: string,
    stderr: string
  }): {
    codec_name: string,
    extradata_hash: string,
    damaged: boolean
  } => ({
    codec_name: "",
    extradata_hash: "",
    ...JSON.parse(stdout).streams[0],
    damaged: this.isDamaged(stderr)
  });

  isDamaged = (stderr: string) => {
    let damaged = false;
    if (stderr) {
      damaged = Boolean(
        (stderr || "").split("\n").filter(
          l =>
            // XXX: depends ffprobe message.
            ![
              "Unsupported codec with id ",
              "Estimating duration from bitrate"
            ].some(w => l.includes(w) || !l)
        ).length
      );
    }
    return damaged;
  };

  read = async (
    targetPath: string
  ): Promise<{
    width: number,
    height: number,
    ratio: number,
    damaged: boolean
  }> =>
    exec(this.createExecCommand(targetPath))
      .then(this.parseOutput)
      .catch(this.parseOutput)
      .catch({ width: 0, height: 0, ratio: 0, damaged: true });

  /**
   * XXX: Do not use this method! The same hash is returned between different files.
   */
  readForAudio = async (
    targetPath: string
  ): Promise<{ damaged: boolean, extradata_hash: string }> =>
    exec(this.createExecCommandForAudio(targetPath))
      .then(this.parseOutputForAudio)
      .catch({ damaged: true, extradata_hash: "" });
}
