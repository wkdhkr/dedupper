// @flow
import typeof { Logger } from "log4js";
import type { Database } from "./SQLiteService";
import DeepLearningHelper from "../../helpers/DeepLearningHelper";
import DbHelper from "../../helpers/DbHelper";
import SQLiteService from "./SQLiteService";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import { STATE_OK } from "../../types/ProcessStates";
import { STATE_ACCEPTED, STATE_KEEPING } from "../../types/FileStates";
import type { Config, FileInfo, ProcessStateRow } from "../../types";

export default class ProcessStateDbService {
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

  prepareTable = async (db: Database<ProcessStateRow>) =>
    this.ss.prepareTable(
      db,
      this.config.processStateDbCreateTableSql,
      this.config.processStateDbCreateIndexSqls
    );

  deleteByHash($hash: string): Promise<?ProcessStateRow> {
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
              `delete from ${this.config.processStateDbName} where hash = $hash`,
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

  queryByHash($hash: string): Promise<?ProcessStateRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
      db.serialize(async () => {
        db.all(
          `select * from ${this.config.processStateDbName} where hash = $hash`,
          { $hash },
          (err, rows: ProcessStateRow[]) => {
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

  queryByValue(
    column: string,
    $value: number | string
  ): Promise<ProcessStateRow[]> {
    return new Promise((resolve, reject) => {
      const db = this.ss.spawn<ProcessStateRow>(
        this.ss.detectDbFilePath(TYPE_IMAGE)
      );
      const rows = [];
      db.serialize(async () => {
        try {
          db.each(
            `select * from ${this.config.processStateDbName} where ${column} = $value`,
            { $value },
            (err, row: ProcessStateRow) => {
              db.close();
              this.ss.handleEachError<ProcessStateRow>(
                db,
                err,
                reject,
                row,
                rows
              );
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

  createRowBind = (row: ProcessStateRow) => {
    const newRow = {};

    Object.keys(row).forEach(key => {
      newRow[`$${key}`] = row[key] !== undefined ? row[key] : null;
    });

    return newRow;
  };

  createRow = (hash: string): ProcessStateRow => ({
    hash,
    meta: "",
    missing: -1, // 0: old default, 1: old missing, -1: new default, 2: new missing
    orientation: 0,
    trim: "",
    view_date: 0,
    view_count: 0,
    rating: 0,
    score: 0,
    feature: 0,
    detect: 0,
    nsfwjs: 0,
    facepp: 0,
    facepp_face_count: 0,
    acd_id: "",
    acd_md5: ""
  });

  queryByHashOrNew = async (hash: string) => {
    return (await this.queryByHash(hash)) || this.createRow(hash);
  };

  insertByHash = async ({ hash, state }: FileInfo) => {
    let writeFlag = false;
    // saved file only, file is exists
    if (state !== STATE_ACCEPTED && state !== STATE_KEEPING) {
      return;
    }
    let ps = await this.queryByHash(hash);
    if (!ps) {
      ps = this.createRow(hash);
    }
    const facePPResult = DeepLearningHelper.getFacePPResult(hash);
    const nsfwJsResults = DeepLearningHelper.getNsfwJsResults(hash);

    if (ps.missing > 0) {
      writeFlag = true;
    }

    if (facePPResult) {
      ps.facepp_face_count = facePPResult.face_num;
      ps.facepp = STATE_OK;
      writeFlag = true;
    }
    if (nsfwJsResults) {
      ps.nsfwjs = STATE_OK;
      writeFlag = true;
    }

    if (writeFlag) {
      await this.insert(ps);
    }
  };

  insert = async (row: ProcessStateRow, isReplace: boolean = true) => {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
        db.serialize(async () => {
          try {
            this.log.info(`insert: row = ${JSON.stringify(row)}`);
            if (!this.config.dryrun) {
              await DbHelper.beginSafe(db);
              const columns = [
                "hash",
                "meta",
                "missing",
                "orientation",
                "trim",
                "view_date",
                "view_count",
                "rating",
                "score",
                "feature",
                "detect",
                "nsfwjs",
                "facepp",
                "facepp_face_count",
                "acd_id",
                "acd_md5"
              ].join(",");
              const values = [
                "$hash",
                "$meta",
                "$missing",
                "$orientation",
                "$trim",
                "$view_date",
                "$view_count",
                "$rating",
                "$score",
                "$feature",
                "$detect",
                "$nsfwjs",
                "$facepp",
                "$facepp_face_count",
                "$acd_id",
                "$acd_md5"
              ].join(",");

              const replaceStatement = isReplace ? " or replace" : "";
              db.run(
                `insert${replaceStatement} into ${this.config.processStateDbName} (${columns}) values (${values})`,
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
