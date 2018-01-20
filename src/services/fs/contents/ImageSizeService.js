// @flow

import { promisify } from "util";
import sizeOf from "image-size";

export default class ImageSizeService {
  shapeDimensionResponse = ({
    width,
    height
  }: {
    width: number,
    height: number
  }): { width: number, height: number } => ({ width, height });

  async read(targetPath: string): Promise<{ width: number, height: number }> {
    return this.shapeDimensionResponse(
      await promisify((sizeOf: Function))(targetPath).catch(() => ({
        width: 0,
        height: 0
      }))
    );
  }
}
