// @flow

const imagemin = require("imagemin");
const imageminJpegoptim = require("imagemin-jpegoptim");
const imageminOptipng = require("imagemin-optipng");

class ImageminService {
  run = (targetPath: string) =>
    imagemin([targetPath], {
      plugins: [imageminJpegoptim(), imageminOptipng()]
    });
}

module.exports = ImageminService;
