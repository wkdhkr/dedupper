// @flow
import path from "path";
import os from "os";

import EnvironmentHelper from "./helpers/EnvironmentHelper";
import { DELETE_MODE_TRASH } from "./types/DeleteModeTypes";
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
const facePPDbTableName = "facepp";

const facePPConfig = {
  facePPJudgeFunction: result => {
    return result.faces.some(face => {
      if (face.attributes.gender.value === "Male") {
        return false;
      }
      return true;
    });
  },
  /*
  facePPJudgeFunction: result => {
    // eslint-disable-next-line complexity
    return result.faces.some(face => {
      const { attributes: a } = face;
      if (a.gender.value === "Male") {
        return false;
      }
      if (face.face_rectangle.width < 300 && face.face_rectangle.height < 300) {
        return false;
      }
      if (a.age.value > 40) {
        return false;
      }
      if (a.blur.blurness.value > a.blur.blurness.threshold) {
        return false;
      }
      if (a.blur.motionblur.value > a.blur.motionblur.threshold) {
        return false;
      }
      if (a.blur.gaussianblur.value > a.blur.gaussianblur.threshold) {
        return false;
      }
      if (a.beauty.male_score < 70) {
        return false;
      }
      return true;
    });
  },
  */
  facePPResizedImageSize: 640,
  facePPDomain: "api-us.faceplusplus.com",
  facePPDetectApiPath: "facepp/v3/detect",
  facePPApiKey: "dummyapikeypleaseset",
  facePPApiSecret: "",
  facePPFaceAttributes: [
    "gender",
    "age",
    "smiling",
    "headpose",
    "facequality",
    "blur",
    "eyestatus",
    "emotion",
    "ethnicity",
    "beauty",
    "mouthstatus",
    "eyegaze",
    "skinstatus"
  ],
  facePPDbVersion: 2,
  facePPDbTableName: "facepp",
  facePPDbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${facePPDbTableName} (${[
    "hash text",
    "image_id text",
    "face_token text",
    "face_num integer",
    "version text",
    "landmark text",
    "emotion_sadness real",
    "emotion_neutral real",
    "emotion_disgust real",
    "emotion_anger real",
    "emotion_surprise real",
    "emotion_fear real",
    "emotion_happiness real",
    "beauty_female_score real",
    "beauty_male_score real",
    "gender text",
    "age integer",
    "mouth_close real",
    "mouth_surgical_mask_or_respirator real",
    "mouth_open real",
    "mouth_other_occlusion real",
    "glass text",
    "skin_dark_circle real",
    "skin_stain real",
    "skin_acne real",
    "skin_health real",
    "headpose_yaw_angle real",
    "headpose_pitch_angle real",
    "headpose_roll_angle real",
    "gaussianblur real",
    "motionblur real",
    "blurness real",
    "smile real",
    "eye_status_left_normal_glass_eye_open real",
    "eye_status_left_normal_glass_eye_close real",
    "eye_status_left_no_glass_eye_close real",
    "eye_status_left_no_glass_eye_open real",
    "eye_status_left_occlusion real",
    "eye_status_left_dark_glasses real",
    "eye_status_right_normal_glass_eye_open real",
    "eye_status_right_normal_glass_eye_close real",
    "eye_status_right_no_glass_eye_close real",
    "eye_status_right_no_glass_eye_open real",
    "eye_status_right_occlusion real",
    "eye_status_right_dark_glasses real",
    "eyegaze_right_position_x_coordinate real",
    "eyegaze_right_position_y_coordinate real",
    "eyegaze_right_vector_z real",
    "eyegaze_right_vector_x real",
    "eyegaze_right_vector_y real",
    "eyegaze_left_position_x_coordinate real",
    "eyegaze_left_position_y_coordinate real",
    "eyegaze_left_vector_z real",
    "eyegaze_left_vector_x real",
    "eyegaze_left_vector_y real",
    "facequality integer",
    "ethnicity text",
    "top integer",
    "left integer",
    "width integer",
    "height integer",
    "PRIMARY KEY (face_token, hash)"
  ].join(",")})`,
  facePPDbCreateIndexSqls: [
    `CREATE INDEX IF NOT EXISTS facepp_hash_idx ON ${facePPDbTableName} (hash);`,
    `CREATE INDEX IF NOT EXISTS age_idx ON ${facePPDbTableName} (age);`,
    `CREATE INDEX IF NOT EXISTS facequality_idx ON ${facePPDbTableName} (facequality);`,
    `CREATE INDEX IF NOT EXISTS smile_idx ON ${facePPDbTableName} (smile);`,
    `CREATE INDEX IF NOT EXISTS glass_idx ON ${facePPDbTableName} (glass);`,
    `CREATE INDEX IF NOT EXISTS gender_idx ON ${facePPDbTableName} (gender);`,
    `CREATE INDEX IF NOT EXISTS beauty_female_idx ON ${facePPDbTableName} (beauty_female_score);`,
    `CREATE INDEX IF NOT EXISTS beauty_male_idx ON ${facePPDbTableName} (beauty_male_score);`,
    `CREATE INDEX IF NOT EXISTS height_idx ON ${facePPDbTableName} (height);`,
    `CREATE INDEX IF NOT EXISTS width_idx ON ${facePPDbTableName} (width);`,
    `CREATE INDEX IF NOT EXISTS ethnicity_idx ON ${facePPDbTableName} (ethnicity);`
  ]
};

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
    "hash text",
    "version text",
    "gender integer",
    "gender_probability real",
    "age real",
    "box_x integer",
    "box_y integer",
    "box_w integer",
    "box_h integer"
  ].join(",")})`,
  faceApiDbCreateIndexSqls: [
    `CREATE INDEX IF NOT EXISTS face_api_hash_idx ON ${faceApiDbTableName} (hash);`,
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
  nsfwPostJudgeFunction: fileInfo => {
    if (fileInfo.nsfwJs) {
      let score = 0;
      fileInfo.nsfwJs.results.forEach(({ className, probability }) => {
        if (
          [CLASS_NAME_PORN, CLASS_NAME_SEXY, CLASS_NAME_HENTAI].includes(
            className
          )
        ) {
          score += probability;
        }
      });
      const isLowScore = score < 0.003;
      if (isLowScore) {
        return true;
      }
    }
    return false;
  },
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
  nsfwJsDbTableName,
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
    // `CREATE INDEX IF NOT EXISTS hash_idx ON ${nsfwJsDbTableName} (hash);`,
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
  faceBackEnd: "face-api.js",
  tfjsBackEnd: "cpu",
  ...deepLearningFaceApiConfig,
  ...deepLearningConfigSfwAndNoFace,
  ...facePPConfig
};

const tagDbName = "tag";
const processStateDbName = "process_state";
const tagDbLength = 128;
const tagDbColumns = [
  "hash text primary key",
  ...Array.from({ length: tagDbLength }).map((n, i) => `t${i + 1} integer`)
];
const tagDbCreateIndexSqls = Array.from({ length: tagDbLength }).map(
  (n, i) =>
    `CREATE INDEX IF NOT EXISTS tag_t${i + 1}_idx ON ${tagDbName} (t${i + 1});`
);
const defaultConfig: DefaultConfig = {
  recovery: true,
  amazonDriveApiUrl: "https://www.amazon.com/drive/v1/",
  amazonLoginUrl: "https://www.amazon.com/clouddrive?mgh=1",
  amazonDriveBaseDir: "/Backup",
  amazonUser: "",
  amazonPassword: "",
  amazonBaseDir: path.join(EnvironmentHelper.getHomeDir(), ".dedupper/amazon"),
  serverHttpsPort: 8443,
  serverPort: 8080,
  channelDbName: "channel",
  channelDbCreateTableSql: `CREATE TABLE IF NOT EXISTS channel (${[
    "id text primary key",
    "name text",
    "sql text"
  ].join(",")})`,
  tagDbLength,
  tagDbName,
  tagDbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${tagDbName} (${tagDbColumns.join(
    ","
  )})`,
  tagDbCreateIndexSqls,
  processStateDbName,
  processStateDbCreateTableSql: `CREATE TABLE IF NOT EXISTS ${processStateDbName} (${[
    "hash text primary key",
    "meta text",
    "missing integer",
    "orientation integer",
    "trim text",
    "view_date integer",
    "view_count integer",
    "rating integer",
    "score integer",
    "feature integer",
    "detect integer",
    "nsfwjs integer",
    "facepp integer",
    "facepp_face_count integer",
    "acd_id text",
    "acd_md5 text"
  ].join(",")})`,
  processStateSkipFunction: () => false,
  processStateDbCreateIndexSqls: [
    `CREATE INDEX IF NOT EXISTS process_state_missing_idx ON ${processStateDbName} (missing);`,
    `CREATE INDEX IF NOT EXISTS process_state_view_date_idx ON ${processStateDbName} (view_date);`,
    `CREATE INDEX IF NOT EXISTS process_state_rating_idx ON ${processStateDbName} (rating);`,
    `CREATE INDEX IF NOT EXISTS process_state_score_idx ON ${processStateDbName} (score);`,
    `CREATE INDEX IF NOT EXISTS process_state_feature_idx ON ${processStateDbName} (feature);`,
    `CREATE INDEX IF NOT EXISTS process_state_detect_idx ON ${processStateDbName} (detect);`,
    `CREATE INDEX IF NOT EXISTS process_state_nsfwjs_idx ON ${processStateDbName} (nsfwjs);`,
    `CREATE INDEX IF NOT EXISTS process_state_facepp_idx ON ${processStateDbName} (facepp);`,
    `CREATE INDEX IF NOT EXISTS process_state_facepp_face_count_idx ON ${processStateDbName} (facepp_face_count);`
  ],
  cacheVersion: 2,
  noTransfer: true,
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
  deleteMode: DELETE_MODE_TRASH,
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
    `CREATE INDEX IF NOT EXISTS p_hash_idx ON ${dbTableName} (p_hash);`,
    `CREATE INDEX IF NOT EXISTS ratio_state_idx ON ${dbTableName} (ratio, state);`,
    `CREATE INDEX IF NOT EXISTS name_idx ON ${dbTableName} (name);`,
    `CREATE INDEX IF NOT EXISTS hash_width_idx ON ${dbTableName} (width);`,
    `CREATE INDEX IF NOT EXISTS hash_height_idx ON ${dbTableName} (height);`,
    `CREATE INDEX IF NOT EXISTS timestamp_idx ON ${dbTableName} (timestamp);`,
    `CREATE INDEX IF NOT EXISTS size_idx ON ${dbTableName} (size);`,
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
