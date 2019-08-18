// @flow
import path from "path";
import os from "os";

import EnvironmentHelper from "./helpers/EnvironmentHelper";
import {
  TYPE_ARCHIVE,
  TYPE_AUDIO,
  TYPE_IMAGE,
  TYPE_VIDEO,
  TYPE_TEXT,
  TYPE_SCRAP
} from "./types/ClassifyTypes";
import type { DeepLearningConfig, DefaultConfig } from "./types";
import {
  // MODEL_FACE_RECOGNITION,
  MODEL_AGE_GENDER,
  // eslint-disable-next-line no-unused-vars
  MODEL_FACE_LANDMARK_68,
  // eslint-disable-next-line no-unused-vars
  MODEL_FACE_EXPRESSION,
  MODEL_SSD_MOBILENETV1,
  CLASS_NAME_PORN,
  CLASS_NAME_SEXY,
  CLASS_NAME_HENTAI
} from "./types/DeepLearningTypes";

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

const faceApiDbTableName = "face";
const nsfwJsDbTableName = "nsfw_js";
const faceApiModelBaseUrl =
  "https://github.com/justadudewhohacks/face-api.js-models/raw/master/";
const deepLearningFaceApiConfig = {
  faceApiDbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${faceApiDbTableName} (${[
    "id integer primary key",
    "version text",
    "hash text",
    "score real",
    "gender integer",
    "gender_probability real",
    "age real",
    "box_x integer",
    "box_y integer",
    "box_w integer",
    "box_h integer"
  ].join(",")})`,
  faceApiDbCreateIndexSqls: [
    `CREATE INDEX IF NOT EXISTS hash_idx ON ${faceApiDbTableName} (hash);`,
    `CREATE INDEX IF NOT EXISTS age_idx ON ${faceApiDbTableName} (age);`
  ],
  faceApiUseModels: [
    // MODEL_FACE_RECOGNITION,
    MODEL_FACE_EXPRESSION,
    MODEL_AGE_GENDER,
    MODEL_FACE_LANDMARK_68,
    MODEL_SSD_MOBILENETV1
  ],
  faceApiModelBasePath: path.join(
    EnvironmentHelper.getHomeDir(),
    ".dedupper/model"
  ),
  faceApiModelUrlsByName: {
    face_expression: [
      `${faceApiModelBaseUrl}face_expression/face_expression_model-shard1`,
      `${faceApiModelBaseUrl}face_expression/face_expression_model-weights_manifest.json`
    ],
    age_gender_model: [
      `${faceApiModelBaseUrl}age_gender_model/age_gender_model-shard1`,
      `${faceApiModelBaseUrl}age_gender_model/age_gender_model-weights_manifest.json`
    ],
    face_landmark_68: [
      `${faceApiModelBaseUrl}face_landmark_68/face_landmark_68_model-shard1`,
      `${faceApiModelBaseUrl}face_landmark_68/face_landmark_68_model-weights_manifest.json`
    ],
    face_landmark_68_tiny: [
      `${faceApiModelBaseUrl}face_landmark_68_tiny/face_landmark_68_tiny_model-shard1`,
      `${faceApiModelBaseUrl}face_landmark_68_tiny/face_landmark_68_tiny_model-weights_manifest.json`
    ],
    face_recognition: [
      `${faceApiModelBaseUrl}face_recognition/face_recognition_model-shard1`,
      `${faceApiModelBaseUrl}face_recognition/face_recognition_model-shard2`,
      `${faceApiModelBaseUrl}face_recognition/face_recognition_model-weights_manifest.json`
    ],
    mtcnn: [
      `${faceApiModelBaseUrl}mtcnn/mtcnn_model-shard1`,
      `${faceApiModelBaseUrl}mtcnn/mtcnn_model-weights_manifest.json`
    ],
    ssd_mobilenetv1: [
      `${faceApiModelBaseUrl}ssd_mobilenetv1/ssd_mobilenetv1_model-shard1`,
      `${faceApiModelBaseUrl}ssd_mobilenetv1/ssd_mobilenetv1_model-shard2`,
      `${faceApiModelBaseUrl}ssd_mobilenetv1/ssd_mobilenetv1_model-weights_manifest.json`
    ],
    tiny_face_detector: [
      `${faceApiModelBaseUrl}ssd_mobilenetv1/ssd_mobilenetv1_model-shard1`,
      `${faceApiModelBaseUrl}ssd_mobilenetv1/ssd_mobilenetv1_model-weights_manifest.json`
    ]
  }
};

const deepLearningApiConfig = {
  faceSpinnerApi: [
    "http://localhost:7000/detect",
    "http://localhost:7001/detect",
    "http://localhost:7002/detect",
    "http://localhost:7003/detect"
  ],
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
    "http://localhost:5101/face/detect"
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
  nsfwModeNoneDefault: true,
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
  faceModeNoneDefault: true,
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
  faceModeNoneDefault: true,
  faceMinLongSide: 450
};

const deepLearningConfig: DeepLearningConfig = {
  // nsfwBackEnd: "NSFWJS",
  nsfwJsDbVersion: 1,
  nsfwJsDbTableName: "nsfw_js",
  nsfwJsDbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${nsfwJsDbTableName} (${[
    "hash text primary key",
    "neutral real",
    "drawing real",
    "hentai real",
    "porn real",
    "sexy real",
    "porn_sexy real",
    "hentai_porn_sexy real",
    "hentai_sexy real",
    "hentai_porn real",
    "version integer"
  ].join(",")})`,
  nsfwJsDbCreateIndexSqls: [
    `CREATE INDEX IF NOT EXISTS hash_idx ON ${nsfwJsDbTableName} (hash);`,
    `CREATE INDEX IF NOT EXISTS porn_idx ON ${nsfwJsDbTableName} (porn);`,
    `CREATE INDEX IF NOT EXISTS sexy_idx ON ${nsfwJsDbTableName} (sexy);`,
    `CREATE INDEX IF NOT EXISTS porn_sexy_idx ON ${nsfwJsDbTableName} (porn_sexy);`,
    `CREATE INDEX IF NOT EXISTS hentai_porn_sexy_idx ON ${nsfwJsDbTableName} (hentai_porn_sexy);`,
    `CREATE INDEX IF NOT EXISTS hentai_sexy_idx ON ${nsfwJsDbTableName} (hentai_sexy);`,
    `CREATE INDEX IF NOT EXISTS hentai_porn_idx ON ${nsfwJsDbTableName} (hentai_porn);`
  ],
  nsfwBackEnd: "OpenNSFW",
  nsfwJsJudgeFunction: results => {
    let score = 0;
    results.forEach(({ className, probability }) => {
      if (
        [CLASS_NAME_PORN, CLASS_NAME_SEXY, CLASS_NAME_HENTAI].includes(
          className
        )
      ) {
        score += probability;
      }
    });
    return score < 0.5; // accept sfw image only
  },
  savePredictionResults: true,
  tfjsBackEnd: "cpu",
  ...deepLearningFaceApiConfig,
  ...deepLearningConfigSfwAndNoFace
};

const defaultConfig: DefaultConfig = {
  cacheVersion: 2,
  archiveExtract: false,
  archiveExtractCommand: '"C:\\Program Files (x86)\\LhaForge\\LhaForge.exe" /e',
  instantDelete: false,
  sortMarksFunction: () => [],
  deepLearningConfig,
  useFileName: false,
  fileNameWhiteList: [
    /^[ 0-9_-]+$/,
    "mov",
    "movie",
    "video",
    /^(video|mov|movie|)[ 0-9_-]+$/i
  ],
  useImageMagickHash: true,
  dummyPath: "?",
  log4jsConfig,
  maxCpuLoadPercent: 60,
  maxWorkers: os.cpus().length,
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
  ignoreAudioDamage: false,
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
    [TYPE_VIDEO]: "B:\\Video",
    [TYPE_AUDIO]: "B:\\Audio",
    [TYPE_TEXT]: "B:\\Document"
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
    `aac
ac3
ape
flac
m1a
m2a
m4a
mka
mp3
ogg
wav
wma
tak
tta
alac
wv`
      .split("\n")
      .filter(Boolean)
      .forEach(e => assignFn(e, TYPE_AUDIO));
    `jpg
jpeg
png`
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
mts
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

    /*
    `doc
docx
xls
xlsx
ppt
pptx
rtf
html
htm
vsd
ai
xps`
      .split("\n")
      .filter(Boolean)
      .forEach(e => assignFn(e, TYPE_TEXT));
    */

    return lookup;
  })()
};

export default defaultConfig;
