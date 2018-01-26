// @flow
import type { Logger } from "log4js";
import type { ClassifyType } from "./ClassifyTypes";

export type UserConfig = {
  log4jsConfig?: Object,
  hashAlgorithm?: string,
  defaultLogLevel?: string,
  dbBasePath?: string,
  dbTableName?: string,
  dbCreateTableSql?: string,
  dbCreateIndexSqls?: string[],
  pHashThreshold?: number,
  pHashSearchRatioRangeOffset?: number,
  renameRules?: [string | RegExp, string][],
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
} | void;

export type DefaultConfig = {
  log4jsConfig: Object,
  hashAlgorithm: string,
  defaultLogLevel: string,
  dbBasePath: string,
  dbTableName: string,
  dbCreateTableSql: string,
  dbCreateIndexSqls: string[],
  pHashThreshold: number,
  pHashSearchRatioRangeOffset: number,
  renameRules: [string | RegExp, string][],
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
  wait: ?boolean,
  quiet: ?boolean,
  relocate: ?boolean,
  verbose: ?boolean,
  logLevel: ?string,
  logConfig: boolean,
  path: ?string,
  pHash: boolean,
  dryrun: ?boolean
};

export type Config = DefaultConfig &
  CommanderConfig & {
    getLogger: Object => Logger
  };

export type HashRow = {
  hash: string,
  p_hash: ?string,
  p_hash_distance?: number,
  width: number,
  height: number,
  ratio: number,
  timestamp: number,
  name: string,
  to_path: string,
  from_path: string,
  size: number
};

export type ImageContentsInfo = {
  width: number,
  height: number,
  ratio: number,
  damaged: boolean
};

export type FileInfo = {
  hash: string,
  p_hash: ?string,
  damaged: boolean,
  width: number,
  height: number,
  ratio: number,
  size: number,
  timestamp: number,
  name: string,
  type: ClassifyType,
  to_path: string,
  from_path: string
};

export type Exact<T> = T & $Shape<T>;
