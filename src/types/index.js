// @flow
import type { Logger } from "log4js";
import type { ClassifyType } from "./ClassifyTypes";
import type { FileState } from "./FileStates";

import type {
  GenderClass,
  AgeClass,
  DeepLearningMode,
  DeepLearningLogicalOperation,
  NsfwType
} from "./DeepLearningTypes";

/** Deep learning related configuration */
export type DeepLearningConfig = {
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
  /** "allow" or "disallow". */
  nsfwMode: DeepLearningMode,
  /**
   * Threshold used for nsfw judgment.
   * Those that exceeded this threshold are "allow" or "disallow".
   */
  nsfwThreshold: number,
  /** Age and gender to use for judgment. All others are ignored. */
  faceCategories: [GenderClass, AgeClass][],
  /** "allow" or "disallow". */
  faceMode: DeepLearningMode,
  /** Faces of smaller long side pixels are ignored. */
  faceMinLongSide: number
};

export type DefaultConfig = {
  archiveExtract: boolean,
  archiveExtractCommand: string,
  cacheVersion: number,
  deepLearningConfig: DeepLearningConfig,
  instantDelete: boolean,
  useFileName: boolean,
  useImageMagickHash: boolean,
  log4jsConfig: Object,
  dummyPath: string,
  maxWorkers: number,
  hashAlgorithm: string,
  defaultLogLevel: string,
  dbBasePath: string,
  dbTableName: string,
  dbCreateTableSql: string,
  dbCreateIndexSqls: string[],
  dHashExactThreshold: number,
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
  dryrun: ?boolean
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
  /** If true, use ImageMagick's hash value to check for identity. */
  useImageMagickHash?: boolean,
  log4jsConfig?: Object,
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

export type FileInfo = {
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

export type Config = DefaultConfig &
  CommanderConfig & {
    forceConfig?: ForceConfig,
    pathMatchConfig?: PathMatchConfig,
    classifyTypeConfig?: ClassifyTypeConfig,
    getLogger: Object => Logger
  };
