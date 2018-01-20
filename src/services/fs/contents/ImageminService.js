// @flow

import imagemin from "imagemin";
import imageminJpegoptim from "imagemin-jpegoptim";
import imageminOptipng from "imagemin-optipng";

export default class ImageminService {
  run = (targetPath: string): Promise<{ data: Buffer, path: string }[]> =>
    imagemin([targetPath], {
      plugins: [imageminJpegoptim(), imageminOptipng()]
    });
}
