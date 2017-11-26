// @flow
import type { Logger } from "log4js";
import type { ClassifyType } from "./ClassifyTypes";

export type UserConfig = {
  hashAlgorithm?: string,
  defaultLogLevel?: string,
  dbBasePath?: string,
  dbTableName?: string,
  dbCreateTableSql?: string,
  renameRules?: [string | RegExp, string][],
  baseLibraryPathByType?: {
    [ClassifyType]: string
  },
  classifyTypeByExtension?: {
    [string]: string
  }
} | void;

export type DefaultConfig = {
  hashAlgorithm: string,
  defaultLogLevel: string,
  dbBasePath: string,
  dbTableName: string,
  dbCreateTableSql: string,
  renameRules: [string | RegExp, string][],
  baseLibraryPathByType: {
    [ClassifyType]: string
  },
  classifyTypeByExtension: {
    [string]: string
  }
};

export type CommanderConfig = {
  verbose: ?Boolean,
  logLevel: ?string,
  path: ?string,
  dryrun: ?Boolean
};

export type Config = DefaultConfig &
  CommanderConfig & {
    getLogger: string => Logger
  };

export type HashRow = {
  hash: string,
  timestamp: string,
  path: string,
  name: string
};

export type FileInfo = {
  hash: string,
  size: number,
  timestamp: number,
  name: string,
  to_path: string,
  from_path: string
};

export type Exact<T> = T & $Shape<T>;
