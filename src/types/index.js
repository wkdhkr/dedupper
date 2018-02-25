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

export type DeepLearningConfig = {
  nsfwApi: string,
  faceDetectWithGenderApi: string,
  facePredictAgeApi: string,
  instantDelete: boolean,
  logicalOperation: DeepLearningLogicalOperation,
  nsfwType: NsfwType,
  nsfwMode: DeepLearningMode,
  nsfwThreshold: number,
  faceCategories: [GenderClass, AgeClass][],
  faceMode: DeepLearningMode,
  faceMinLongSide: number
};

export type DefaultConfig = {
  deepLearningConfig: DeepLearningConfig,
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
  renameRules: ([string | RegExp, string] | (string => string))[],
  ngDirPathPatterns: (string | RegExp)[],
  ngFileNamePatterns: (string | RegExp)[],
  baseLibraryPathByType: {
    [ClassifyType]: string
  },
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

export type CommanderConfig = {
  keep?: boolean,
  wait?: boolean,
  quiet?: boolean,
  relocate?: boolean,
  report: boolean,
  verbose?: boolean,
  logLevel?: string,
  logConfig: boolean,
  path?: string,
  pHash: boolean,
  stripImage: boolean,
  cache: boolean,
  dirKeep: boolean,
  dryrun: ?boolean
};

export type ForceConfig = {
  keep?: boolean,
  report?: boolean,
  pHash?: boolean,
  stripImage?: boolean,
  dirKeep?: boolean,
  cache?: boolean,
  dryrun?: boolean
};

export type UserBaseConfig = {
  deepLearningConfig?: DeepLearningConfig,
  forceConfig?: ForceConfig,
  log4jsConfig?: Object,
  maxWorkers?: number,
  hashAlgorithm?: string,
  defaultLogLevel?: string,
  dbBasePath?: string,
  dbTableName?: string,
  dbCreateTableSql?: string,
  dbCreateIndexSqls?: string[],
  dHashExactThreshold?: number,
  pHashIgnoreSameDir?: boolean,
  pHashExactThreshold?: number,
  pHashSearchThreshold?: number,
  pHashSearchRatioRangeOffset?: number,
  meanExactThreshold?: number,
  relativeResolutionRatioThreshold?: number,
  relativeFileSizeRatioThreshold?: number,
  renameRules?: ([string | RegExp, string] | (string => string))[],
  ngDirPathPatterns?: (string | RegExp)[],
  ngFileNamePatterns?: (string | RegExp)[],
  baseLibraryPathByType?: {
    [ClassifyType]: string
  },
  minFileSizeByType?: {
    [ClassifyType]: number
  },
  minResolutionByType?: {
    [ClassifyType]: number
  },
  minLongSideByType?: {
    [ClassifyType]: number
  },
  classifyTypeByExtension?: {
    [string]: ClassifyType
  }
};

export type PathMatchConfig = { [string]: UserBaseConfig };

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
  state: number
};

export type ImageContentsInfo = {
  hash: string,
  width: number,
  height: number,
  ratio: number,
  damaged: boolean
};

export type FileInfo = {
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
  state: FileState
};

export type Config = DefaultConfig &
  CommanderConfig & {
    forceConfig?: ForceConfig,
    pathMatchConfig?: PathMatchConfig,
    getLogger: Object => Logger
  };
