// @flow
const CT = require("./ClassifyTypes");

const config = {
  hashAlgorithm: "sha1",
  renameRules: [["classify\\", ""]],
  baseLibraryPathByType: {
    [CT.TYPE_IMAGE]: "B:\\Image",
    [CT.TYPE_VIDEO]: "B:\\Video"
  },
  classifyTypeByExtension: (() => {
    const lookup: { [string]: string } = {};
    const assignFn = (ext, type) => {
      lookup[ext] = type;
    };
    `jpg
jpeg
png
gif
tiff
webp`
      .split("\n")
      .forEach(e => assignFn(e, CT.TYPE_IMAGE));

    `3gp
asf
avi
divx
flv
m1v
m2v
m4v
mkv
mov
mp4
mpeg
mpg
ogm
rm
rmvb
ts
vob
webm
wmv`
      .split("\n")
      .forEach(e => assignFn(e, CT.TYPE_VIDEO));

    return lookup;
  })()
};

module.exports = config;
