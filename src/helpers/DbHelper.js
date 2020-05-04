// @flow
/* eslint no-bitwise: 0 */
import sqlite3 from "sqlite3";
import sleep from "await-sleep";

import type { ProcessStates } from "../types";

export default class DbHelper {
  static isReadonly = false;

  static dbLookup = {};

  // eslint-disable-next-line no-unused-vars
  static commitSafe = (db: { run: string => void }, cb: Function) => {
    // db.run("COMMIT");
    cb();
  };

  static beginSafe = async (
    db: { run: string => void },
    retryCount: number = 0
  ) => {
    try {
      // TODO: support multi process
      // db.run("BEGIN");
    } catch (e) {
      if (
        e.message &&
        e.message.includes("cannot start a transaction within a transaction")
      ) {
        if (retryCount === 10) {
          db.run("COMMIT"); // FIXME: danger
        }
        if (retryCount === 12) {
          throw e;
        }
        await sleep(1000 * 10);
        DbHelper.beginSafe(db, retryCount + 1);
      } else {
        throw e;
      }
    }
  };

  static encodeProcessStates = (states: ProcessStates): number => {
    return [
      states.missing ? 0b1 : 0,
      states.facePP ? 0b10 : 0,
      states.nsfwJs ? 0b100 : 0
    ].reduce((a, b) => a + b, 0);
  };

  static decodeProcessStates = (bits: number): ProcessStates => ({
    missing: Boolean(0b1 & bits),
    facePP: Boolean(0b10 & bits),
    nsfwJs: Boolean(0b100 & bits)
  });

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
    const db = DbHelper.isReadonly
      ? new sqlite3.Database(dbFilePath, {
          mode: sqlite3.OPEN_READONLY
        })
      : new sqlite3.Database(dbFilePath);
    db.configure("busyTimeout", 1000 * 60 * 100);
    /*
    if (this.config.verbose) {
      db.on("trace", sql => this.log.trace(`db trace: sql = "${sql}"`));
    }
    */
    // db.on("trace", sql => console.log(`db trace: sql = "${sql}"`));
    return db;
  };
}
