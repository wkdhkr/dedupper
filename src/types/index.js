// @flow
import type { Logger } from "log4js";
import type { DeleteModeType } from "./DeleteModeTypes";
import type { ClassifyType } from "./ClassifyTypes";
import type { FileState } from "./FileStates";
import type { ReasonType } from "./ReasonTypes";
import type {
  FacePPGender,
  FacePPGlass,
  FacePPResult,
  NsfwJsResult,
  GenderClass,
  AgeClass,
  DeepLearningMode,
  DeepLearningLogicalOperation,
  NsfwType,
  FaceApiModelName
} from "./DeepLearningTypes";

export type FileInfo = {
  facePP?: {
    result: FacePPResult,
    version: number
  },
  nsfwJs?: {
    results: NsfwJsResult[],
    version: number
  },
  version?: number,
  hash: string,
  p_hash: ?string,
  d_hash: ?string,
  damaged: boolean,
  width: number,
  height: number,
  ratio: number,
  size: number,
  timestamp: number,
  name: string,
  type: ClassifyType,
  to_path: string,
  from_path: string,
  state: FileState,
  process_state: ?string
};

export type IsAcceptableFunction = FileInfo => boolean;

/** Deep learning related configuration */
export type DeepLearningConfig = {
  facePPDbTableName: string,
  /** face++ judge function. Return true if accepted. */
  facePPJudgeFunction: FacePPResult => boolean,
  /** face++ api domain */
  facePPDomain: string,
  facePPDetectApiPath: string,
  facePPApiKey: string,
  facePPApiSecret: string,
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
  /** face++ table version */
  facePPDbVersion: number,
  /** create face++ table sql. */
  facePPDbCreateTableSql: string,
  /** create face++ index sqls. */
  facePPDbCreateIndexSqls: string[],
  /** face check backend */
  faceBackEnd: "RudeCarnie" | "face-api.js" | "facepp",
  /** nsfw check backend */
  nsfwBackEnd: "NSFWJS" | "OpenNSFW",
  /** NsfwJs judge function. Return true if accepted. */
  nsfwJsJudgeFunction: (NsfwJsResult[]) => boolean,
  /** NsfwJs table name */
  nsfwJsDbTableName: string,
  /** NsfwJs table version */
  nsfwJsDbVersion: number,
  /**
   * Store prediction results in database.
   * Currently supported: NSFWJS
   */
  savePredictionResults: boolean,
  /** tfjs backend */
  tfjsBackEnd: "gpu" | "cpu",
  /** entry point of face spinner api */
  faceSpinnerApi: string[],
  /** use face-api model */
  faceApiUseModels: FaceApiModelName[],
  /** face-api model directory base path */
  faceApiModelBasePath: string,
  /** face-api model urls */
  faceApiModelUrlsByName: {
    [FaceApiModelName]: string[]
  },
  /** create NSFWJS table sql. */
  nsfwJsDbCreateTableSql: string,
  /** create NSFWJS index sqls. */
  nsfwJsDbCreateIndexSqls: string[],
  /** entry point of nsfw api */
  nsfwApi: string[],
  /** entry point of face gender detect api */
  faceDetectWithGenderApi: string[],
  /** entry point of face age detect api */
  facePredictAgeApi: string[],
  /** If set to true, files rejected by deep learning judgment are immediately deleted. */
  instantDelete: boolean,
  /**
   * Judge by "and", "or" or "in" multiple deep learning judgments.
   * If "and" it is necessary to clear all judgments, "or" should clear any judgment.
   */
  logicalOperation: DeepLearningLogicalOperation,
  /** "nsfw" or "sfw". */
  nsfwType: NsfwType,
  /** "allow" or "disallow" or "none". */
  nsfwMode: DeepLearningMode,
  /** isAcceptable for nsfwMode = "none" */
  nsfwModeNoneDefault: true,
  /**
   * Threshold used for OpenNSFW judgment.
   * Those that exceeded this threshold are "allow" or "disallow".
   */
  nsfwThreshold: number,
  /** Age and gender to use for judgment. All others are ignored. */
  faceCategories: [GenderClass, AgeClass][],
  /** "allow" or "disallow". */
  faceMode: DeepLearningMode,
  /** isAcceptable for faceMode = "none" */
  faceModeNoneDefault: true,
  /** Faces of smaller long side pixels are ignored. */
  faceMinLongSide: number
};

export type DefaultConfig = {
  deleteMode: DeleteModeType,
  archiveExtract: boolean,
  archiveExtractCommand: string,
  cacheVersion: number,
  sortMarksFunction: (ReasonType, FileInfo) => string[],
  deepLearningConfig: DeepLearningConfig,
  instantDelete: boolean,
  useFileName: boolean,
  fileNameWhiteList: (string | RegExp)[],
  useImageMagickHash: boolean,
  log4jsConfig: Object,
  dummyPath: string,
  maxWorkers: number,
  maxCpuLoadPercent: number,
  hashAlgorithm: string,
  defaultLogLevel: string,
  dbBasePath: string,
  dbTableName: string,
  dbCreateTableSql: string,
  dbCreateIndexSqls: string[],
  dHashExactThreshold: number,
  ignoreVideoDamage: boolean,
  ignoreAudioDamage: boolean,
  pHashIgnoreSameDir: boolean,
  pHashExactThreshold: number,
  pHashSearchThreshold: number,
  pHashSearchRatioRangeOffset: number,
  meanExactThreshold: number,
  relativeResolutionRatioThreshold: number,
  relativeFileSizeRatioThreshold: number,
  forceTransfer: boolean,
  renameRules: ([string | RegExp, string] | (string => string))[],
  ngDirPathPatterns: (string | RegExp)[],
  ngFileNamePatterns: (string | RegExp)[],
  baseLibraryPathByType: {
    [ClassifyType]: string
  },
  libraryPathDate?: Date,
  libraryPathHourOffset: number,
  minFileSizeByType: {
    [ClassifyType]: number
  },
  minResolutionByType: {
    [ClassifyType]: number
  },
  minLongSideByType: {
    [ClassifyType]: number
  },
  classifyTypeByExtension: {
    [string]: ClassifyType
  }
};

/** CLI options */
export type CommanderConfig = {
  /** reset face-api model */
  resetFaceApiModel?: boolean,
  /** db repair mode. */
  dbRepair?: boolean,
  /**
   * manual mode.
   * The file is not moved and the current path is registered in the destination.
   */
  manual?: boolean,
  keep?: boolean,
  /**
   * keep mode.
   * The file to be processed is treated as "keeping".
   * These are preferential treatment at the time of duplication determination.
   */
  keep?: boolean,
  /** Wait at the end of processing. */
  wait?: boolean,
  /** prevent log output */
  quiet?: boolean,
  /** relocate mode. Relocate already imported files. */
  relocate?: boolean,
  /** Output processing result report to stdout. */
  report: boolean,
  /** debug log */
  verbose?: boolean,
  /** log level for log4js */
  logLevel?: string,
  /** use log config */
  logConfig: boolean,
  /** target file or folder path. */
  path?: string,
  /** Use pHash duplication judgment? */
  pHash: boolean,
  /** Cache information gathered from files. */
  cache: boolean,
  /** Use the directory path where the current file exists for the destination directory path? */
  dirKeep: boolean,
  /**
   * Do not process files.
   * Read operations, processes that do not affect the file itself are performed.
   */
  dryrun: ?boolean,
  /**
   * sweep mode
   */
  sweep: ?boolean
};

export type ForceConfig = {
  manual?: boolean,
  keep?: boolean,
  report?: boolean,
  pHash?: boolean,
  dirKeep?: boolean,
  cache?: boolean,
  dryrun?: boolean
};

export type UserBaseConfig = {
  /** delete mode */
  deleteMode?: DeleteModeType,
  /** append additional file name prefix for examination. */
  sortMarksFunction?: (ReasonType, FileInfo) => string[],
  /** deep learning config */
  deepLearningConfig?: DeepLearningConfig,
  forceConfig?: ForceConfig,
  /** If set to true, The archive file will be extracted. */
  archiveExtract?: boolean,
  /** archive extract command line */
  archiveExtractCommand?: string,
  /** If set to true, files rejected by judgment are immediately deleted. */
  instantDelete?: boolean,
  /** If true, use file name to check for identity. */
  useFileName?: boolean,
  /** white list for "useFileName" */
  fileNameWiteList?: (string | RegExp)[],
  /** If true, use ImageMagick's hash value to check for identity. */
  useImageMagickHash?: boolean,
  log4jsConfig?: Object,
  /** When cpu load exceeds this value, dedupper will wait to process the next file. */
  maxCpuLoadPercent?: number,
  /** Number of concurrent executions. Used when processing a folder. */
  maxWorkers?: number,
  /**
   * hash algorithm.
   * The files having the same calculated value are handled as the same file.
   */
  hashAlgorithm?: "md5" | "sha1" | "sha224" | "sha256" | "sha384" | "sha512",
  /** log level for log4js */
  defaultLogLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal",
  /** sqlite file folder path */
  dbBasePath?: string,
  /** table name */
  dbTableName?: string,
  /** create table sql. */
  dbCreateTableSql?: string,
  /** create index sqls. */
  dbCreateIndexSqls?: string[],
  /**
   * If the Hamming distance of dHash is less than the threshold value,
   * it is considered as the same image.
   * Image file below the values of pHashExactThreshold and dHashExactThreshold,
   * the file operation is immediately executed based on the judgment result.
   */
  dHashExactThreshold?: number,
  /**
   * Ignore video file error.
   */
  ignoreVideoDamage?: boolean,
  /**
   * Ignore audio file error.
   */
  ignoreAudioDamage?: boolean,
  /**
   * Do not compare pHash between images in the same folder.
   * Includes image files that once existed in the same folder.
   */
  pHashIgnoreSameDir?: boolean,
  /**
   * If the Hamming distance of pHash is less than the threshold value,
   * it is considered as the same image.
   * Image file below the values of pHashExactThreshold and dHashExactThreshold,
   * the file operation is immediately executed based on the judgment result.
   */
  pHashExactThreshold?: number,
  /**
   * An image with Hamming distance below this threshold will be the same image candidate.
   */
  pHashSearchThreshold?: number,
  /**
   * Permissible difference of image aspect ratio of files to be searched for pHash.
   */
  pHashSearchRatioRangeOffset?: number,
  /**
   * Threshold value of average color value.
   * Images that differ beyond this are not regarded as identical images.
   */
  meanExactThreshold?: number,
  /** Images whose resolution is lower than the ratio threshold are considered to be inferior. */
  relativeResolutionRatioThreshold?: number,
  /** Images whose file size is smaller than the ratio threshold are regarded as inferior. */
  relativeFileSizeRatioThreshold?: number,
  /** "replace" action will process as "transfer" action. */
  forceTransfer?: boolean,
  /** Rule of rename. Includes directory path. */
  renameRules?: ([string | RegExp, string] | (string => string))[],
  /** Delete the files in the directory matching this pattern. */
  ngDirPathPatterns?: (string | RegExp)[],
  /** Delete the file whose name matches this pattern. */
  ngFileNamePatterns?: (string | RegExp)[],
  /** The base destination for each type. */
  baseLibraryPathByType?: {
    [ClassifyType]: string
  },
  /** hour offset for library path date */
  libraryPathHourOffset?: number,
  /** manual library path date */
  libraryPathDate?: Date,
  /** Min file size for each type. */
  minFileSizeByType?: {
    [ClassifyType]: number
  },
  /** Min resolution each type. (pixel amount) */
  minResolutionByType?: {
    [ClassifyType]: number
  },
  /** Min long side each type. (pixel) */
  minLongSideByType?: {
    [ClassifyType]: number
  },
  /** What extension is what type? */
  classifyTypeByExtension?: {
    [string]: ClassifyType
  }
};

/** Configure to apply to directories matching a specific pattern. */
export type PathMatchConfig = { [string]: UserBaseConfig };
/** Configure to apply to specific classify type file. */
export type ClassifyTypeConfig = { [ClassifyType]: UserBaseConfig };

/** user config */
export type UserConfig = UserBaseConfig & {
  pathMatchConfig?: PathMatchConfig
};

export type NsfwJsHashRow = {
  hash: string,
  neutral: number,
  drawing: number,
  hentai: number,
  porn: number,
  sexy: number,
  porn_sexy: number,
  hentai_porn_sexy: number,
  hentai_sexy: number,
  hentai_porn: number,
  version: number
};

export type FacePPRow = {
  image_id: string,
  hash: string,
  face_token: string,
  face_num: number,
  version: number,
  emotion_sadness: number,
  emotion_neutral: number,
  emotion_disgust: number,
  emotion_anger: number,
  emotion_surprise: number,
  emotion_fear: number,
  emotion_happiness: number,
  beauty_female_score: number,
  beauty_male_score: number,
  gender: FacePPGender,
  age: number,
  mouth_close: number,
  mouth_surgical_mask_or_respirator: number,
  mouth_open: number,
  mouth_other_occlusion: number,
  glass: FacePPGlass,
  skin_dark_circle: number,
  skin_stain: number,
  skin_acne: number,
  skin_health: number,
  headpose_status: number,
  headpose_yaw_angle: number,
  headpose_pitch_angle: number,
  headpose_roll_angle: number,
  gaussianblur: number,
  motionblur: number,
  blurness: number,
  smile: number,
  eye_status_left_normal_glass_eye_open: number,
  eye_status_left_normal_glass_eye_close: number,
  eye_status_left_no_glass_eye_close: number,
  eye_status_left_no_glass_eye_open: number,
  eye_status_left_occlusion: number,
  eye_status_left_dark_glasses: number,
  eye_status_right_normal_glass_eye_open: number,
  eye_status_right_normal_glass_eye_close: number,
  eye_status_right_no_glass_eye_close: number,
  eye_status_right_no_glass_eye_open: number,
  eye_status_right_occlusion: number,
  eye_status_right_dark_glasses: number,
  eyegaze_right_position_x_coordinate: number,
  eyegaze_right_position_y_coordinate: number,
  eyegaze_right_vector_z: number,
  eyegaze_right_vector_x: number,
  eyegaze_right_vector_y: number,
  eyegaze_left_position_x_coordinate: number,
  eyegaze_left_position_y_coordinate: number,
  eyegaze_left_vector_z: number,
  eyegaze_left_vector_x: number,
  eyegaze_left_vector_y: number,
  facequality_status: number,
  ethnicity: string,
  eye_gaze_status: number,
  top: number,
  left: number,
  width: number,
  height: number
};

export type HashRow = {
  hash: string,
  p_hash: ?string,
  d_hash: ?string,
  p_hash_distance?: number | false,
  d_hash_distance?: number | false,
  width: number,
  height: number,
  ratio: number,
  timestamp: number,
  name: string,
  to_path: string,
  from_path: string,
  size: number,
  state: number,
  process_state: ?string
};

export type ImageContentsInfo = {
  hash: string,
  width: number,
  height: number,
  ratio: number,
  damaged: boolean
};

export type Config = DefaultConfig &
  CommanderConfig & {
    forceConfig?: ForceConfig,
    pathMatchConfig?: PathMatchConfig,
    classifyTypeConfig?: ClassifyTypeConfig,
    getLogger: Object => Logger
  };
