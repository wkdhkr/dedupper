// @flow
import { exec } from "child-process-promise";

export default class ImageMagickService {
  createExecCommand = (targetPath: string): string =>
    ["magick", "identify", "-verbose", JSON.stringify(targetPath)].join(" ");

  createIdentifyCommand = (targetPath: string, format: string): string =>
    ["magick", "identify", "-format", format, JSON.stringify(targetPath)].join(
      " "
    );

  isDamaged(targetPath: string): Promise<boolean> {
    return exec(this.createExecCommand(targetPath))
      .then(({ stderr }: { stderr: ?string }) => {
        if (stderr) {
          return true;
        }
        return false;
      })
      .catch(() => true);
  }

  identify(
    targetPath: string
  ): Promise<{
    ratio: number,
    width: number,
    height: number,
    hash: string,
    damaged: boolean
  }> {
    return exec(this.createIdentifyCommand(targetPath, "%w,%h,%#"))
      .then(({ stderr, stdout }: { stderr: ?string, stdout: ?string }) => {
        const [rawWidth, rawHeight, hash] = (stdout || "").split(",");
        const width = Number(rawWidth);
        const height = Number(rawHeight);
        const ratio = width / height || 0;

        return {
          width,
          height,
          hash,
          ratio,
          damaged: !!stderr
        };
      })
      .catch(() => ({
        width: 0,
        height: 0,
        hash: "",
        ratio: 0,
        damaged: true
      }));
  }
}
