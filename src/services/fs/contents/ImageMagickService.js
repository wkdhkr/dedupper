// @flow
import { exec } from "child-process-promise";

export default class ImageMagickService {
  createIdentifyCommand = (targetPath: string, format: string): string =>
    ["magick", "identify", "-format", format, JSON.stringify(targetPath)].join(
      " "
    );

  statistic(
    targetPath: string
  ): Promise<{
    entropy: number,
    quality: number,
    mean: number
  }> {
    return exec(
      this.createIdentifyCommand(targetPath, "%[entropy],%Q,%[mean]")
    ).then(({ stderr, stdout }: { stderr: ?string, stdout: ?string }) => {
      if (stderr) {
        throw new Error(
          `imageMagick statistic error: path = ${targetPath} error = ${stderr}`
        );
      }
      const [rawEntropy, rawQuality, rawMean] = (stdout || "").split(",");
      const entropy = Number(rawEntropy);
      const quality = Number(rawQuality);
      const mean = Number(rawMean);

      return {
        entropy,
        quality,
        mean
      };
    });
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
