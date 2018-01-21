// @flow
import path from "path";
import os from "os";

import EnvironmentHelper from "./helpers/EnvironmentHelper";
import { TYPE_IMAGE, TYPE_VIDEO, TYPE_SCRAP } from "./types/ClassifyTypes";
import type { DefaultConfig } from "./types";

const dbTableName = "hash";

const log4jsConfig = {
  appenders: {
    out: { type: "stdout" },
    file: {
      type: "dateFile",
      filename: path.join(os.tmpdir(), "dedupper", "log", "process"),
      pattern: ".yyyy-MM-dd.log",
      alwaysIncludePattern: true,
      // daysToKeep: 365,
      layout: {
        type: "pattern",
        pattern: "[%d][%z][%p] %c - %m"
      }
    }
  },
  categories: {
    default: { appenders: ["out", "file"], level: "info" }
  }
};

const defaultConfig: DefaultConfig = {
  log4jsConfig,
  hashAlgorithm: "sha1",
  defaultLogLevel: "warn",
  dbBasePath: path.join(EnvironmentHelper.getHomeDir(), ".dedupper/db"),
  dbTableName,
  dbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${dbTableName} (${[
    "hash text primary key",
    "p_hash text",
    "width integer",
    "height integer",
    "ratio real",
    "timestamp integer",
    "name text",
    "path text",
    "size integer"
  ].join(",")})`,
  dbCreateIndexSqls: [
    `CREATE INDEX IF NOT EXISTS p_hash_idx ON ${dbTableName} (p_hash);`,
    `CREATE INDEX IF NOT EXISTS ratio_idx ON ${dbTableName} (ratio);`
  ],
  pHashThreshold: 5,
  pHashSearchRatioRangeOffset: 0.02,
  renameRules: [[/[cC]lassify\\/, ""]],
  baseLibraryPathByType: {
    [TYPE_IMAGE]: "B:\\Image",
    [TYPE_VIDEO]: "B:\\Video"
  },
  minFileSizeByType: {
    [TYPE_IMAGE]: 1024 * 50,
    [TYPE_VIDEO]: 1024 * 1024 * 2
  },
  minResolutionByType: {
    [TYPE_IMAGE]: 640 * 480,
    [TYPE_VIDEO]: 320 * 240
  },
  classifyTypeByExtension: (() => {
    const lookup = {};
    const assignFn = (ext, type) => {
      lookup[ext] = type;
    };
    `bmp
jpg
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

    `lnk
!ut
db
url
txt
`
      .split("\n")
      .forEach(e => assignFn(e, TYPE_SCRAP));

    return lookup;
  })()
};

export default defaultConfig;
