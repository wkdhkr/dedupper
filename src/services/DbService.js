// @flow
import path from "path";
import type { Logger } from "log4js";

const sqlite3 = require("sqlite3");

class DbService {
  log: Logger;
  config: {
    dbBasePath: string,
    dbTableName: string,
    dbCreateTableSql: string
  };

  constructor(config: Object) {
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
    if (!this.config.dryrun) {
      db.run(this.config.dbCreateTableSql);
    }
  }

  detectDbFilePath = (hash: string) =>
    path.join(this.config.dbBasePath, this.detectDbFileName(hash));

  queryByHash = ($hash: string): Promise<null | Array<Object>> =>
    new Promise((resolve, reject) => {
      const db = this.spawn(this.detectDbFilePath($hash));
      db.serialize(() => {
        this.prepareTable(db);
        db.all(
          `select * from ${this.config.dbTableName} where hash = $hash`,
          {
            $hash
          },
          (err, rows: Array<any>) => {
            db.close();
            if (err) {
              reject(err);
              return;
            }
            resolve(rows.pop() || null);
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
            } (hash, date, name, size) values ($hash, $date, $name, $size)`,
            {
              $hash: row.hash,
              $date: row.date,
              $name: row.name,
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

module.exports = DbService;
