// @flow
import typeof { Logger } from "log4js";
import type { Database } from "./SQLiteService";
import DbHelper from "../../helpers/DbHelper";
import SQLiteService from "./SQLiteService";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import type { Config } from "../../types";

export default class TagDbService {
  log: Logger;

  config: Config;

  ss: SQLiteService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ss = new SQLiteService(config);
  }

  async init() {
    const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
    await this.prepareTable(db);
  }

  prepareTable = async (db: Database<any>) =>
    this.ss.prepareTable(
      db,
      this.config.tagDbCreateTableSql,
      this.config.tagDbCreateIndexSqls
    );

  deleteByHash($hash: string): Promise<?any> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
      db.serialize(async () => {
        try {
          if (!this.config.dryrun) {
            await DbHelper.beginSafe(db);
            db.run(
              `delete from ${this.config.tagDbName} where hash = $hash`,
              { $hash },
              err => {
                if (err) {
                  db.close();
                  reject(err);
                  return;
                }
                DbHelper.commitSafe(db, () => {
                  db.close();
                  resolve();
                });
              }
            );
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  queryByHash($hash: string): Promise<?any> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
      db.serialize(async () => {
        db.all(
          `select * from ${this.config.tagDbName} where hash = $hash`,
          { $hash },
          (err, rows: any[]) => {
            db.close();
            if (!this.ss.handleEachError(db, err, reject)) {
              return;
            }
            resolve(rows.pop());
          }
        );
      });
    });
  }

  isNeedless = async (hash: string) => {
    const row = await this.queryByHash(hash);
    if (row) {
      if (row.t1 > 0) {
        return true;
      }
    }
    return false;
  };

  queryByValue(column: string, $value: number | string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = this.ss.spawn<any>(this.ss.detectDbFilePath(TYPE_IMAGE));
      const rows = [];
      db.serialize(async () => {
        try {
          db.each(
            `select * from ${this.config.tagDbName} where ${column} = $value`,
            { $value },
            (err: any, row: any) => {
              db.close();
              this.ss.handleEachError<any>(db, err, reject, row, rows);
            },
            err => {
              db.close();
              if (err) {
                reject(err);
                return;
              }
              resolve(rows);
            }
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  createRowBind = (row: Object) => {
    const newRow = {};

    Object.keys(row).forEach(key => {
      newRow[`$${key}`] = row[key] !== undefined ? row[key] : null;
    });

    return newRow;
  };

  createRow = (hash: string): Object => {
    const row = {
      hash
    };
    Array.from({ length: this.config.tagDbLength }).forEach((n, i) => {
      row[`t${i + 1}`] = null;
    });
    return row;
  };

  queryByHashOrNew = async (hash: string) => {
    return (await this.queryByHash(hash)) || this.createRow(hash);
  };

  cleaningRow = (row: Object) => {
    const newRow = {};

    Object.keys(row).forEach(k => {
      if (row[k] || row[k] === 0) {
        newRow[k] = row[k];
      }
    });

    return newRow;
  };

  insert = async (row: Object, isReplace: boolean = true) => {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
        db.serialize(async () => {
          try {
            this.log.info(
              `insert: row = ${JSON.stringify(this.cleaningRow(row))}`
            );
            if (!this.config.dryrun) {
              await DbHelper.beginSafe(db);
              const columns = [
                "hash",
                ...Array.from({ length: this.config.tagDbLength }).map(
                  (n, i) => `t${i + 1}`
                )
              ].join(",");
              const values = [
                "$hash",
                ...Array.from({ length: this.config.tagDbLength }).map(
                  (n, i) => `$t${i + 1}`
                )
              ].join(",");

              const replaceStatement = isReplace ? " or replace" : "";
              db.run(
                `insert${replaceStatement} into ${this.config.tagDbName} (${columns}) values (${values})`,
                this.createRowBind(row),
                err => {
                  if (err) {
                    db.close();
                    reject(err);
                    return;
                  }
                  DbHelper.commitSafe(db, () => {
                    db.close();
                    resolve();
                  });
                }
              );
            } else {
              resolve();
            }
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  };
}
