// @flow
const fs = require("fs");
// $FlowFixMe
/*
const ImageMagickNativeService = require("../dist/services/fs/contents/ImageMagickNativeService")
  .default;
*/
// $FlowFixMe
const ImageMagickService = require("../dist/services/fs/contents/ImageMagickService")
  .default;

const { argv } = process;

// eslint-disable-next-line flowtype/require-return-type
async function c() {
  const is = new ImageMagickService();
  try {
    const i = await is.identify(fs.readFileSync(argv[2]));
    console.log(i);
  } catch (e) {
    console.log(e);
  }
}
c();
