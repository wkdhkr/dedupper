// @flow
const sqlite3 = require("sqlite3");
const path = require("path");

class DbService {
  config: {
    dbBasePath: string,
    dbTableName: string,
    createTableSql: string
  };

  constructor(config: Object) {
    this.config = config;
  }

  spawn = (dbFilePath: string) => new sqlite3.Database(dbFilePath);

  detectDbFileName = (hash: string) => `${hash.substring(0, 2)}.sqlite3`;

  detectDbFilePath = (hash: string) =>
    path.join(this.config.dbBasePath, this.detectDbFileName(hash));

  queryByHash = ($hash: string): Promise<null | Array<Object>> =>
    new Promise((resolve, reject) => {
      const db = this.spawn(this.detectDbFilePath($hash));
      db.serialize(() => {
        db.run(this.config.createTableSql);
        db.all(
          "select * from $table where hash = $hash",
          {
            $hash,
            $table: this.config.dbTableName
          },
          (err, rows: Array<any>) => {
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
        db.run(this.config.createTableSql);
        db.all(
          "insert into from $table (hash, date, name, size) values ($hash, $date, $name, $size)",
          {
            $hash: row.hash,
            $date: row.date,
            $name: row.name,
            $size: row.size
          },
          err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }
        );
      });
    });
}

module.exports = DbService;
