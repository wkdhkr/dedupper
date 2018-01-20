// @flow
import { exec } from "child-process-promise";

export default class ImageMagickService {
  createExecCommand = (targetPath: string): string =>
    ["magick", "identify", "-verbose", JSON.stringify(targetPath)].join(" ");

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
}
