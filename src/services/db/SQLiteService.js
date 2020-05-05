// @flow
import pify from "pify";
import path from "path";

import type { Logger } from "log4js";
import DbHelper from "../../helpers/DbHelper";

import type { Config } from "../../types";

export type DatabaseCallback<T> = (?Error, T) => void;
export type DatabaseAllCallback<T> = (?Error, T[]) => void;
export type DatabaseEachLastCallback = (?Error, number) => void;

export type Database<T> = {
  configure: (string, any) => void,
  run: (string, ?Object | ?DatabaseCallback<T>, ?DatabaseCallback<T>) => void,
  on: (string, (string) => void) => void,
  serialize: (() => Promise<void>) => void,
  all: (string, Object, DatabaseAllCallback<T>) => void,
  each: (
    string,
    Object | DatabaseCallback<T>,
    DatabaseCallback<T> | DatabaseEachLastCallback,
    ?DatabaseEachLastCallback
  ) => void,
  close: () => void
};

export default class SQLiteService {
  log: Logger;

  config: Config;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
  }

  prepareTable = async <T>(
    db: Database<T>,
    createTableSql: string,
    createIndexSqls: string[] = []
  ): Promise<void> => {
    const run: string => Promise<any> = pify((...args) => db.run(...args), {
      multiArgs: true
    });
    await run("PRAGMA journal_mode = TRUNCATE;"); // for disk i/o
    await run(createTableSql);
    await Promise.all(createIndexSqls.map(s => run(s)));
  };

  /** If error, return false. */
  handleEachError = <T>(
    db: Database<T>,
    error: any,
    errorCb: any => void,
    row: ?T = null,
    rows: T[] = []
  ): boolean => {
    if (error) {
      errorCb(error);
      return false;
    }
    if (row) {
      rows.push(row);
    }
    return true;
  };

  detectDbFilePath = (type: string) =>
    this.config.dbBasePath
      ? path.join(this.config.dbBasePath, `${type}.sqlite3`)
      : path.join(`work/${type}.sqlite3`);

  spawn = <T>(dbFilePath: string): Database<T> => {
    if (this.config.server) {
      DbHelper.isReadonly = true;
    }
    return DbHelper.getDb(dbFilePath);
  };
}
