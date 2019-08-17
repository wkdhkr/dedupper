// @flow
import pify from "pify";
import path from "path";
import sqlite3 from "sqlite3";

import type { Logger } from "log4js";

import type { Config, HashRow } from "../../types";

export type DatabaseCallback = (?Error, HashRow) => void;
export type DatabaseAllCallback = (?Error, HashRow[]) => void;
export type DatabaseEachLastCallback = (?Error, number) => void;

export type Database = {
  configure: (string, any) => void,
  run: (string, ?Object | ?DatabaseCallback, ?DatabaseCallback) => void,
  on: (string, (string) => void) => void,
  serialize: (() => Promise<void>) => void,
  all: (string, Object, DatabaseAllCallback) => void,
  each: (
    string,
    Object | DatabaseCallback,
    DatabaseCallback | DatabaseEachLastCallback,
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

  prepareTable = async (
    db: Database,
    createTableSql: string,
    createIndexSqls: string[] = []
  ): Promise<any> => {
    const run: string => Promise<any> = pify((...args) => db.run(...args), {
      multiArgs: true
    });
    await run(createTableSql);
    await await Promise.all(createIndexSqls.map(s => run(s)));
    await run("PRAGMA journal_mode = TRUNCATE;"); // for disk i/o
  };

  /** If error, return false. */
  handleEachError = (
    db: Database,
    error: any,
    errorCb: any => void,
    row: ?HashRow = null,
    rows: HashRow[] = []
  ): boolean => {
    if (error) {
      db.close();
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

  spawn = (dbFilePath: string): Database => {
    const db: Database = new sqlite3.Database(dbFilePath);
    db.configure("busyTimeout", 1000 * 6 * 5);
    if (this.config.verbose) {
      db.on("trace", sql => this.log.trace(`db trace: sql = "${sql}"`));
    }
    return db;
  };
}
