// @flow
import sqlite3 from "sqlite3";

export default class DbHelper {
  static dbLookup = {};

  static getDb = (dbPath: string) => {
    if (DbHelper.dbLookup[dbPath]) {
      return DbHelper.dbLookup[dbPath];
    }
    const db = DbHelper.spawnDb(dbPath);
    db.close = () => {
      // console.log("prevent db close");
    };
    DbHelper.dbLookup[dbPath] = db;
    return db;
  };

  static spawnDb = (dbFilePath: string) => {
    const db = new sqlite3.Database(dbFilePath);
    db.configure("busyTimeout", 1000 * 60 * 10);
    /*
    if (this.config.verbose) {
      db.on("trace", sql => this.log.trace(`db trace: sql = "${sql}"`));
    }
    */
    return db;
  };
}
