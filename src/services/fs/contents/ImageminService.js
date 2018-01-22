// @flow

import imagemin from "imagemin";
import imageminJpegoptim from "imagemin-jpegoptim";
import imageminOptipng from "imagemin-optipng";
// import imageminPngout from "imagemin-pngout";
// import imageminPngquant from "imagemin-pngquant";

export default class ImageminService {
  run = (targetPath: string): Promise<{ data: Buffer, path: string }[]> =>
    imagemin([targetPath], {
      plugins: [
        imageminJpegoptim(),
        // imageminPngout(),
        // imageminPngquant(),
        imageminOptipng({ optimizationLevel: 0 })
      ]
    });
}
