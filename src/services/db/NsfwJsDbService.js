// @flow
import type { Logger } from "log4js";
import { STATE_ACCEPTED, STATE_KEEPING } from "../../types/FileStates";
import SQLiteService from "./SQLiteService";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import DeepLearningHelper from "../../helpers/DeepLearningHelper";
import type { Database } from "./SQLiteService";
import type { Config, FileInfo, NsfwJsHashRow } from "../../types";

export default class NsfwJsDbService {
  log: Logger;

  config: Config;

  ss: SQLiteService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ss = new SQLiteService(config);
  }

  isInsertNeedless = async (fileInfo: FileInfo): Promise<boolean> => {
    if ([STATE_ACCEPTED, STATE_KEEPING].includes(fileInfo.state)) {
      const hitRow = await this.queryByHash(fileInfo);
      if (hitRow) {
        return true;
      }
      if (DeepLearningHelper.getNsfwJsResults(fileInfo.hash)) {
        return false;
      }
    }
    return true;
  };

  prepareTable = async (db: Database<NsfwJsHashRow>) =>
    this.ss.prepareTable(
      db,
      this.config.deepLearningConfig.nsfwJsDbCreateTableSql,
      this.config.deepLearningConfig.nsfwJsDbCreateIndexSqls
    );

  createRowFromFileInfo = (fileInfo: FileInfo) => {
    const $hash = fileInfo.hash;
    const $version = this.config.deepLearningConfig.nsfwJsDbVersion;
    const nsfwJsResults = DeepLearningHelper.pullNsfwJsResults(fileInfo.hash);
    if (!nsfwJsResults) {
      throw new Error("no NSFWJS result");
    }
    const row = {
      $hash,
      $neutral: -1,
      $drawing: -1,
      $hentai: -1,
      $porn: -1,
      $sexy: -1,
      $pornSexy: -1,
      $hentaiPornSexy: -1,
      $hentaiSexy: -1,
      $hentaiPorn: -1,
      $version
    };
    nsfwJsResults.forEach(({ className, probability }) => {
      row[`$${className.charAt(0).toLowerCase() + className.slice(1)}`] =
        Math.round(probability * 1000) / 1000;
    });
    row.$pornSexy = row.$porn + row.$sexy;
    row.$hentaiPornSexy = row.$hentai + row.$porn + row.$sexy;
    row.$hentaiSexy = row.$hentai + row.$sexy;
    row.$hentaiPorn = row.$hentai + row.$porn;
    return row;
  };

  deleteByHash({ hash: $hash }: FileInfo): Promise<?NsfwJsHashRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          if (!this.config.dryrun) {
            db.run(
              `delete from ${this.config.deepLearningConfig.nsfwJsDbTableName} where hash = $hash`,
              { $hash },
              err => {
                db.close();
                if (err) {
                  reject(err);
                  return;
                }
                resolve();
              }
            );
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  queryByHash({ hash: $hash }: FileInfo): Promise<?NsfwJsHashRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
      db.serialize(async () => {
        await this.prepareTable(db);
        db.all(
          `select * from ${this.config.deepLearningConfig.nsfwJsDbTableName} where hash = $hash`,
          { $hash },
          (err, rows: NsfwJsHashRow[]) => {
            if (!this.ss.handleEachError(db, err, reject)) {
              return;
            }
            resolve(rows.pop());
          }
        );
      });
    });
  }

  all = (): Promise<NsfwJsHashRow[]> =>
    new Promise((resolve, reject) => {
      const db = this.ss.spawn<NsfwJsHashRow>(
        this.ss.detectDbFilePath(TYPE_IMAGE)
      );
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.all(
            `select * from ${this.config.deepLearningConfig.nsfwJsDbTableName}`,
            {},
            (err, rows: NsfwJsHashRow[]) => {
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

  queryByValue(
    column: string,
    $value: number | string
  ): Promise<NsfwJsHashRow[]> {
    return new Promise((resolve, reject) => {
      const db = this.ss.spawn<NsfwJsHashRow>(
        this.ss.detectDbFilePath(TYPE_IMAGE)
      );
      const rows = [];
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.each(
            `select * from ${this.config.deepLearningConfig.nsfwJsDbTableName} where ${column} = $value`,
            { $value },
            (err, row: NsfwJsHashRow) => {
              this.ss.handleEachError<NsfwJsHashRow>(
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

  insert = async (fileInfo: FileInfo, isReplace: boolean = true) => {
    const isInsertNeedless = await this.isInsertNeedless(fileInfo);
    return new Promise((resolve, reject) => {
      if (isInsertNeedless) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(fileInfo.type));
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          const row = this.createRowFromFileInfo(fileInfo);
          this.log.info(`insert: row = ${JSON.stringify(row)}`);
          if (!this.config.dryrun) {
            const columns = [
              "hash",
              "neutral",
              "drawing",
              "hentai",
              "porn",
              "sexy",
              "porn_sexy",
              "hentai_porn_sexy",
              "hentai_sexy",
              "hentai_porn",
              "version"
            ].join(",");
            const values = [
              "$hash",
              "$neutral",
              "$drawing",
              "$hentai",
              "$porn",
              "$sexy",
              "$pornSexy",
              "$hentaiPornSexy",
              "$hentaiSexy",
              "$hentaiPorn",
              "$version"
            ].join(",");

            const replaceStatement = isReplace ? " or replace" : "";
            db.run(
              `insert${replaceStatement} into ${this.config.deepLearningConfig.nsfwJsDbTableName} (${columns}) values (${values})`,
              row,
              err => {
                db.close();
                if (err) {
                  reject(err);
                  return;
                }
                resolve();
              }
            );
          } else {
            resolve();
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  };
}
