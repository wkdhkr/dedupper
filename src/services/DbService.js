// @flow
import path from "path";
import type { Logger } from "log4js";
import type { Exact, Config, HashRow } from "../types";

const sqlite3 = require("sqlite3");

export default class DbService {
  log: Logger;
  config: Exact<Config>;

  constructor(config: Exact<Config>) {
    this.log = config.getLogger("DbService");
    this.config = config;
  }

  spawn = (dbFilePath: string) => {
    const db = new sqlite3.Database(dbFilePath);
    if (this.config.verbose) {
      db.on("trace", sql => this.log.debug(`db trace: sql = ${sql}`));
    }
    return db;
  };

  detectDbFileName = (hash: string) => `${hash.substring(0, 2)}.sqlite3`;

  prepareTable(db) {
    db.run(this.config.dbCreateTableSql);
  }

  detectDbFilePath = (hash: string) =>
    path.join(this.config.dbBasePath, this.detectDbFileName(hash));

  queryByHash = ($hash: string): Promise<void | HashRow> =>
    new Promise((resolve, reject) => {
      const db = this.spawn(this.detectDbFilePath($hash));
      db.serialize(() => {
        this.prepareTable(db);
        db.all(
          `select * from ${this.config.dbTableName} where hash = $hash`,
          {
            $hash
          },
          (err, rows: HashRow[]) => {
            db.close();
            if (err) {
              reject(err);
              return;
            }
            resolve(rows.pop());
          }
        );
      });
    });

  insert = (row: Object): Promise<void> =>
    new Promise((resolve, reject) => {
      const db = this.spawn(this.detectDbFilePath(row.hash));
      db.serialize(() => {
        this.prepareTable(db);
        this.log.info(`insert: row = ${JSON.stringify(row)}`);
        if (!this.config.dryrun) {
          db.all(
            `insert into ${
              this.config.dbTableName
            } (hash, timestamp, name, path, size) values ($hash, $timestamp, $name, $path, $size)`,
            {
              $hash: row.hash,
              $timestamp: row.timestamp,
              $name: row.name,
              $path: row.to_path,
              $size: row.size
            },
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
          db.close();
          resolve();
        }
      });
    });
}
