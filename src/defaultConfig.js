// @flow
import path from "path";
import EnvironmentHelper from "./helpers/EnvironmentHelper";
import { TYPE_IMAGE, TYPE_VIDEO } from "./ClassifyTypes";

const dbTableName = "hash";

const config = {
  hashAlgorithm: "sha1",
  defaultLogLevel: "warn",
  dbBasePath: path.join(EnvironmentHelper.getHomeDir(), ".dedupper/db"),
  dbTableName,
  dbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${dbTableName} (${[
    "hash text primary key",
    "date text",
    "name text",
    "size integer"
  ].join(",")})`,
  renameRules: [["classify\\", ""]],
  baseLibraryPathByType: {
    [TYPE_IMAGE]: "B:\\Image",
    [TYPE_VIDEO]: "B:\\Video"
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
      .forEach(e => assignFn(e, TYPE_IMAGE));

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
      .forEach(e => assignFn(e, TYPE_VIDEO));

    return lookup;
  })()
};

module.exports = config;
