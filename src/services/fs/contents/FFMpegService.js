// @flow
import { exec } from "child-process-promise";

export default class FFMpegService {
  createExecCommand: (targetPath: string) => string = (
    targetPath: string
  ): string =>
    [
      "ffmpeg",
      "-i",
      JSON.stringify(targetPath),
      "-loglevel",
      "error",
      "-f",
      "md5",
      "-"
    ].join(" ");

  parseOutput: ({ stderr: string, stdout: string, ... }) => {
    damaged: boolean,
    hash: string,
    ...
  } = ({
    stdout,
    stderr
  }: {
    stdout: string,
    stderr: string
  }): { hash: string, damaged: boolean } => {
    const hash = (/MD5=([a-z0-9]+)/.exec(stdout) || [""]).pop();
    return {
      hash,
      damaged: hash ? this.isDamaged(stderr) : true
    };
  };

  isDamaged: (stderr: string) => boolean = (stderr: string) => {
    let damaged = false;
    if (stderr) {
      damaged = Boolean(
        (stderr || "").split("\n").filter(
          l =>
            // XXX: depends ffprobe message.
            !["Header missing", "Error while decoding stream"].some(
              w => l.includes(w) || !l
            )
        ).length
      );
    }
    return damaged;
  };

  read: (
    targetPath: string
  ) => Promise<{ damaged: boolean, hash: string, ... }> = async (
    targetPath: string
  ): Promise<{
    hash: string,
    damaged: boolean
  }> =>
    exec(this.createExecCommand(targetPath))
      .then(this.parseOutput)
      .catch(this.parseOutput)
      .catch({ hash: "", damaged: true });
}
