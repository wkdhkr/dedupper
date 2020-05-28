// @flow
import { v4 } from "uuid";
import type { Logger } from "log4js";
import type { Database } from "./SQLiteService";
import DbHelper from "../../helpers/DbHelper";
import SQLiteService from "./SQLiteService";
import type { Config } from "../../types";

const TYPE_CHANNEL = "TYPE_CHANNEL";

type ChannelRow = {
  id: string,
  name: string,
  sql: string
};

export default class ChannelDbService {
  log: Logger;

  config: Config;

  ss: SQLiteService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ss = new SQLiteService(config);
  }

  async init() {
    const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_CHANNEL));
    await this.prepareTable(db);
  }

  prepareTable = async (db: Database<any>) =>
    this.ss.prepareTable(db, this.config.channelDbCreateTableSql, []);

  deleteById($id: string): Promise<?any> {
    return new Promise((resolve, reject) => {
      if (!$id) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_CHANNEL));
      db.serialize(async () => {
        try {
          if (!this.config.dryrun) {
            await DbHelper.beginSafe(db);
            db.run(
              `delete from ${this.config.channelDbName} where id = $id`,
              { $id },
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

  all = (): Promise<ChannelRow[]> =>
    new Promise((resolve, reject) => {
      const db = this.ss.spawn<ChannelRow>(
        this.ss.detectDbFilePath(TYPE_CHANNEL)
      );
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.all(
            `select * from ${this.config.channelDbName}`,
            {},
            (err, rows: ChannelRow[]) => {
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

  queryById($id: string): Promise<?any> {
    return new Promise((resolve, reject) => {
      if (!$id) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_CHANNEL));
      db.serialize(async () => {
        db.all(
          `select * from ${this.config.channelDbName} where id = $id`,
          { $id },
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

  createRow = (
    id: string,
    name: string = "",
    sql: string = ""
  ): { id: string, name: string } => {
    const row = {
      id,
      name,
      sql
    };
    return row;
  };

  queryByHashOrNew = async (id: string) => {
    return (await this.queryById(id)) || this.createRow(id);
  };

  insert = async (row: ChannelRow, isReplace: boolean = true) => {
    return new Promise((resolve, reject) => {
      try {
        const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_CHANNEL));
        const $id = row.id || v4();
        db.serialize(async () => {
          try {
            this.log.info(`insert: row = ${JSON.stringify(row)}`);
            if (!this.config.dryrun) {
              await DbHelper.beginSafe(db);
              const columns = ["id", "name", "sql"].join(",");
              const values = ["$id", "$name", "$sql"].join(",");

              const replaceStatement = isReplace ? " or replace" : "";
              db.run(
                `insert${replaceStatement} into ${this.config.channelDbName} (${columns}) values (${values})`,
                {
                  $id,
                  $name: row.name,
                  $sql: row.sql
                },
                err => {
                  if (err) {
                    db.close();
                    reject(err);
                    return;
                  }
                  DbHelper.commitSafe(db, () => {
                    db.close();
                    resolve($id);
                  });
                }
              );
            } else {
              resolve($id);
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
