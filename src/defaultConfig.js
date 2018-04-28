// @flow
import path from "path";
import os from "os";

import EnvironmentHelper from "./helpers/EnvironmentHelper";
import {
  TYPE_ARCHIVE,
  TYPE_IMAGE,
  TYPE_VIDEO,
  TYPE_SCRAP
} from "./types/ClassifyTypes";
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
      filename: path.join(
        EnvironmentHelper.getHomeDir(),
        ".dedupper",
        "log",
        "process"
      ),
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

const deepLearningApiConfig = {
  nsfwApi: [
    "http://localhost:6000/image",
    "http://localhost:6001/image",
    "http://localhost:6002/image",
    "http://localhost:6003/image",
    "http://localhost:6004/image",
    "http://localhost:6005/image"
  ],
  faceDetectWithGenderApi: [
    "http://localhost:5100/face/detect",
    "http://localhost:5101/face/detect",
    "http://localhost:5102/face/detect",
    "http://localhost:5103/face/detect",
    "http://localhost:5104/face/detect",
    "http://localhost:5105/face/detect"
  ],
  facePredictAgeApi: [
    "http://localhost:5000/face/predict",
    "http://localhost:5001/face/predict",
    "http://localhost:5002/face/predict",
    "http://localhost:5003/face/predict",
    "http://localhost:5004/face/predict",
    "http://localhost:5005/face/predict"
  ]
};

// eslint-disable-next-line no-unused-vars
const deepLearningConfigSfwAndNoFace = {
  ...deepLearningApiConfig,
  instantDelete: false,
  logicalOperation: "and",
  nsfwType: "nsfw",
  nsfwMode: "disallow",
  nsfwThreshold: 0.1,
  faceCategories: [
    ["M", "(4, 6)"],
    ["M", "(8, 12)"],
    ["M", "(15, 20)"],
    ["M", "(25, 32)"],
    ["M", "(38, 43)"],
    ["M", "(48, 53)"],
    ["M", "(60, 100)"],
    ["F", "(4, 6)"],
    ["F", "(8, 12)"],
    ["F", "(15, 20)"],
    ["F", "(25, 32)"],
    ["F", "(38, 43)"],
    ["F", "(48, 53)"],
    ["F", "(60, 100)"]
  ],
  faceMode: "disallow",
  faceMinLongSide: 450
};

// eslint-disable-next-line no-unused-vars
const deepLearningConfigNsfwOrFemaleFace = {
  ...deepLearningApiConfig,
  instantDelete: false,
  logicalOperation: "or",
  nsfwType: "nsfw",
  nsfwMode: "allow",
  nsfwThreshold: 0.1,
  faceCategories: [
    ["F", "(4, 6)"],
    ["F", "(8, 12)"],
    ["F", "(15, 20)"],
    ["F", "(25, 32)"],
    ["F", "(38, 43)"],
    ["F", "(48, 53)"]
  ],
  faceMode: "allow",
  faceMinLongSide: 450
};

const deepLearningConfig = deepLearningConfigSfwAndNoFace;

const defaultConfig: DefaultConfig = {
  cacheVersion: 2,
  archiveExtract: false,
  archiveExtractCommand: '"C:\\Program Files (x86)\\LhaForge\\LhaForge.exe" /e',
  instantDelete: false,
  deepLearningConfig,
  useFileName: false,
  fileNameWhiteList: [/^[ 0-9_-]+$/, "video", /^(video|movie|)[ 0-9_-]+$/i],
  useImageMagickHash: true,
  dummyPath: "?",
  log4jsConfig,
  maxWorkers: os.cpus().length / 2,
  hashAlgorithm: "sha1",
  defaultLogLevel: "debug",
  dbBasePath: path.join(EnvironmentHelper.getHomeDir(), ".dedupper/db"),
  dbTableName,
  dbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${dbTableName} (${[
    "hash text primary key",
    "p_hash text",
    "d_hash text",
    "width integer",
    "height integer",
    "ratio real",
    "timestamp integer not null",
    "name text not null",
    "to_path text not null",
    "from_path text not null",
    "size integer not null",
    "state integer not null",
    "process_state text"
  ].join(",")})`,
  dbCreateIndexSqls: [
    // `CREATE INDEX IF NOT EXISTS p_hash_idx ON ${dbTableName} (p_hash);`,
    `CREATE INDEX IF NOT EXISTS ratio_state_idx ON ${dbTableName} (ratio, state);`,
    `CREATE INDEX IF NOT EXISTS name_idx ON ${dbTableName} (name);`,
    `CREATE INDEX IF NOT EXISTS state_idx ON ${dbTableName} (state);`,
    `CREATE INDEX IF NOT EXISTS process_state_idx ON ${dbTableName} (process_state);`,
    `CREATE INDEX IF NOT EXISTS to_path_idx ON ${dbTableName} (to_path);`
  ],
  ignoreVideoDamage: false,
  pHashIgnoreSameDir: true,
  dHashExactThreshold: 8,
  pHashExactThreshold: 3,
  pHashSearchThreshold: 11,
  pHashSearchRatioRangeOffset: 0.2,
  meanExactThreshold: 3500,
  relativeResolutionRatioThreshold: 0.95,
  relativeFileSizeRatioThreshold: 0.66,
  forceTransfer: false,
  renameRules: [
    [/(src|sandbox|projects)\\dedupper\\/, "\\"],
    [/\\new folder\\/gi, ""],
    [
      new RegExp(
        `${["\\\\Users", process.env.USERNAME].join("\\\\")}\\\\`,
        "i"
      ),
      "\\"
    ]
  ],
  ngDirPathPatterns: [/\.bak\\/],
  ngFileNamePatterns: [".DS_store", "Thumbs.db", ".BridgeSort"],
  baseLibraryPathByType: {
    [TYPE_IMAGE]: "B:\\Image",
    [TYPE_VIDEO]: "B:\\Video"
  },
  libraryPathHourOffset: 0,
  minFileSizeByType: {
    [TYPE_IMAGE]: 1024 * 25,
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
mod
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
1
url
log
xmp`
      .split("\n")
      .filter(Boolean)
      .forEach(e => assignFn(e, TYPE_SCRAP));

    `zip
rar
tgz
gz
lzh
lha
bz2
7z`
      .split("\n")
      .filter(Boolean)
      .forEach(e => assignFn(e, TYPE_ARCHIVE));
    return lookup;
  })()
};

export default defaultConfig;
