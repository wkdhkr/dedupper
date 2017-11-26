// @flow
import path from "path";
import EnvironmentHelper from "./helpers/EnvironmentHelper";
import { TYPE_IMAGE, TYPE_VIDEO } from "./types/ClassifyTypes";
import type { DefaultConfig } from "./types";

const dbTableName = "hash";

const defaultConfig: DefaultConfig = {
  hashAlgorithm: "sha1",
  defaultLogLevel: "warn",
  dbBasePath: path.join(EnvironmentHelper.getHomeDir(), ".dedupper/db"),
  dbTableName,
  dbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${dbTableName} (${[
    "hash text primary key",
    "timestamp number",
    "name text",
    "path text",
    "size integer"
  ].join(",")})`,
  renameRules: [[/[cC]lassify\\/, ""]],
  baseLibraryPathByType: {
    [TYPE_IMAGE]: "B:\\Image",
    [TYPE_VIDEO]: "B:\\Video"
  },
  classifyTypeByExtension: (() => {
    const lookup = {};
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

export default defaultConfig;
