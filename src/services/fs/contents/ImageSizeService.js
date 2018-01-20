// @flow

import { promisify } from "util";
import sizeOf from "image-size";

export default class ImageSizeService {
  read = (targetPath: string): Promise<{ width: number, height: number }> =>
    promisify((sizeOf: Function))(targetPath).then(({ width, height }) => ({
      width,
      height
    }));
}
