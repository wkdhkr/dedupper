// @flow
import path from "path";
import os from "os";

import EnvironmentHelper from "./helpers/EnvironmentHelper";
import { TYPE_IMAGE, TYPE_VIDEO, TYPE_SCRAP } from "./types/ClassifyTypes";
import type { DefaultConfig } from "./types";

const dbTableName = "hash";

const log4jsConfig = {
  appenders: {
    out: {
      type: "stdout",
      layout: { type: "pattern", pattern: "%[[%p] %c%] - %m" }
    },
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
  maxWorkers: os.cpus().length / 2,
  hashAlgorithm: "sha1",
  defaultLogLevel: "info",
  dbBasePath: path.join(EnvironmentHelper.getHomeDir(), ".dedupper/db"),
  dbTableName,
  dbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${dbTableName} (${[
    "hash text primary key",
    "p_hash text",
    "width integer",
    "height integer",
    "ratio real",
    "timestamp integer not null",
    "name text",
    "to_path text",
    "from_path text",
    "size integer"
  ].join(",")})`,
  dbCreateIndexSqls: [
    `CREATE INDEX IF NOT EXISTS p_hash_idx ON ${dbTableName} (p_hash);`,
    `CREATE INDEX IF NOT EXISTS ratio_idx ON ${dbTableName} (ratio);`
  ],
  pHashThreshold: 5,
  pHashSearchRatioRangeOffset: 0.02,
  renameRules: [[/[cC]lassify\\/g, ""]],
  ngFileNamePatterns: [".DS_store", "thumbs.db"],
  baseLibraryPathByType: {
    [TYPE_IMAGE]: "B:\\Image",
    [TYPE_VIDEO]: "B:\\Video"
  },
  minFileSizeByType: {
    [TYPE_IMAGE]: 1024 * 30,
    [TYPE_VIDEO]: 1024 * 1024 * 2
  },
  minResolutionByType: {
    [TYPE_IMAGE]: 500 * 500,
    [TYPE_VIDEO]: 320 * 240
  },
  minLongSideByType: {
    [TYPE_IMAGE]: 540,
    [TYPE_VIDEO]: 320
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
      .filter(Boolean)
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
      .filter(Boolean)
      .forEach(e => assignFn(e, TYPE_VIDEO));

    `lnk
!ut
url`
      .split("\n")
      .filter(Boolean)
      .forEach(e => assignFn(e, TYPE_SCRAP));

    return lookup;
  })()
};

export default defaultConfig;
