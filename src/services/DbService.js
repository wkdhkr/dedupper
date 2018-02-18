// @flow
import path from "path";
import pify from "pify";
import sqlite3 from "sqlite3";

import type { Logger } from "log4js";

import FileNameMarkHelper from "../helpers/FileNameMarkHelper";
import PHashService from "./fs/contents/PHashService";
import { TYPE_UNKNOWN } from "../types/ClassifyTypes";
import {
  STATE_BLOCKED,
  STATE_DEDUPED,
  STATE_ACCEPTED,
  STATE_GROUPED
} from "../types/FileStates";
import type { Config, FileInfo, HashRow } from "../types";
import type { FileState } from "../types/FileStates";
import type { ClassifyType } from "../types/ClassifyTypes";

type DatabaseCallback = (?Error, HashRow) => void;
type DatabaseAllCallback = (?Error, HashRow[]) => void;
type DatabaseEachLastCallback = (?Error, number) => void;

type Database = {
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

export default class DbService {
  log: Logger;
  config: Config;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
  }

  spawn = (dbFilePath: string): Database => {
    const db: Database = new sqlite3.Database(dbFilePath);
    if (this.config.verbose) {
      db.on("trace", sql => this.log.trace(`db trace: sql = "${sql}"`));
    }
    return db;
  };

  prepareTable(db: Database): Promise<any> {
    const run: string => Promise<any> = pify((...args) => db.run(...args), {
      multiArgs: true
    });
    return Promise.all([
      run(this.config.dbCreateTableSql),
      ...this.config.dbCreateIndexSqls.map(s => run(s))
    ]);
  }

  detectDbFilePath = (type: string) =>
    path.join(this.config.dbBasePath, `${type}.sqlite3`);

  queryByHash({ hash: $hash, type }: FileInfo): Promise<?HashRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.spawn(this.detectDbFilePath(type));
      db.serialize(async () => {
        await this.prepareTable(db);
        db.all(
          `select * from ${this.config.dbTableName} where hash = $hash`,
          { $hash },
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
  }

  deleteByHash({ hash: $hash, type }: FileInfo): Promise<?HashRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.spawn(this.detectDbFilePath(type));
      db.serialize(async () => {
        await this.prepareTable(db);
        db.all(
          `delete from ${this.config.dbTableName} where hash = $hash`,
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
      });
    });
  }

  queryByPHash({
    p_hash: pHash,
    d_hash: dHash,
    type,
    ratio
  }: FileInfo): Promise<HashRow[]> {
    return new Promise((resolve, reject) => {
      const normalizedRatio = parseFloat(ratio);
      if (
        !pHash ||
        Number.isNaN(normalizedRatio) ||
        this.config.pHash === false
      ) {
        resolve([]);
        return;
      }
      const db = this.spawn(this.detectDbFilePath(type));
      const similarRows: HashRow[] = [];
      const [$min, $max] = [
        normalizedRatio - this.config.pHashSearchRatioRangeOffset,
        normalizedRatio + this.config.pHashSearchRatioRangeOffset
      ];
      db.serialize(async () => {
        await this.prepareTable(db);
        // search same ratio images for calculate hamming distance
        db.each(
          `select * from ${this.config.dbTableName} where state >= ${
            DbService.divisionValueLookup[STATE_ACCEPTED]
          } and ratio between $min and $max`,
          { $min, $max },
          (err, row: HashRow) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            const pHashDistance = PHashService.compare(pHash, row.p_hash);
            const dHashDistance = PHashService.compare(dHash, row.d_hash);
            if (pHashDistance !== false) {
              if (pHashDistance < this.config.pHashSearchThreshold) {
                similarRows.push({
                  ...row,
                  p_hash_distance: pHashDistance,
                  d_hash_distance: dHashDistance
                });
              }
            }
          },
          (err, hitCount: number) => {
            db.close();
            if (err) {
              reject(err);
              return;
            }
            this.log.debug(`ratio search: count = ${hitCount}`);
            // sort desc by distance
            similarRows.sort(
              ({ p_hash_distance: a }, { p_hash_distance: b }) => {
                const [na, nb] = [parseInt(a, 10), parseInt(b, 10)];
                if (na < nb) {
                  return -1;
                }
                if (na > nb) {
                  return 1;
                }
                return 0;
              }
            );
            resolve(similarRows);
          }
        );
      });
    });
  }

  static lookupFileStateDivision = (t: FileState): number => {
    if (DbService.divisionValueLookup[t]) {
      return DbService.divisionValueLookup[t];
    }
    throw new Error(`division value lookup fail. query = ${t}`);
  };

  static infoToRow = ({
    hash,
    p_hash: pHash,
    d_hash: dHash,
    width,
    height,
    ratio,
    timestamp,
    name,
    to_path, // eslint-disable-line camelcase
    from_path, // eslint-disable-line camelcase
    size,
    state
  }: FileInfo): HashRow => ({
    hash,
    p_hash: pHash,
    d_hash: dHash,
    width,
    height,
    ratio,
    timestamp,
    name,
    to_path,
    from_path,
    size,
    state: DbService.lookupFileStateDivision(state)
  });

  static rowToInfo = (
    {
      hash,
      p_hash: pHash,
      d_hash: dHash,
      width,
      height,
      ratio,
      timestamp,
      name,
      to_path, // eslint-disable-line camelcase
      from_path, // eslint-disable-line camelcase
      size,
      state
    }: HashRow,
    type: ClassifyType = TYPE_UNKNOWN
  ): FileInfo => ({
    hash,
    p_hash: pHash,
    d_hash: dHash,
    damaged: false,
    type,
    width,
    height,
    ratio,
    timestamp,
    name,
    to_path,
    from_path,
    size,
    state: DbService.reverseLookupFileStateDivision(state)
  });

  static divisionValueLookup: { [FileState]: number } = {
    [STATE_BLOCKED]: 0,
    [STATE_DEDUPED]: 100,
    [STATE_ACCEPTED]: 200,
    [STATE_GROUPED]: 300
  };

  static reverseLookupFileStateDivision = (n: number): FileState => {
    const getKeyByValue = (value: number): ?FileState => {
      const fileStates = ((Object.keys(
        DbService.divisionValueLookup
      ): any[]): FileState[]);
      return (fileStates: FileState[]).find(
        (key: FileState) => DbService.divisionValueLookup[key] === value
      );
    };

    const key = getKeyByValue(n);
    if (key) {
      return key;
    }
    throw new Error(`division value reverse lookup fail. query = ${n}`);
  };

  insert = (fileInfo: FileInfo, isReplace: boolean = true): Promise<void> =>
    new Promise((resolve, reject) => {
      const db = this.spawn(this.detectDbFilePath(fileInfo.type));
      db.serialize(async () => {
        await this.prepareTable(db);
        const {
          hash: $hash,
          p_hash: $pHash,
          d_hash: $dHash,
          width: $width,
          height: $height,
          ratio: $ratio,
          timestamp: $timestamp,
          name: $name,
          to_path: $toPath,
          from_path: fromPath,
          size: $size,
          state: $state
        } = fileInfo;
        const $fromPath = FileNameMarkHelper.strip(fromPath);
        const row = {
          $hash,
          $pHash,
          $dHash,
          $width,
          $height,
          $ratio,
          $timestamp,
          $name,
          $toPath,
          $fromPath,
          $size,
          $state
        };
        this.log.info(`insert: row = ${JSON.stringify(row)}`);
        if (!this.config.dryrun) {
          const columns = [
            "hash",
            "p_hash",
            "d_hash",
            "width",
            "height",
            "ratio",
            "timestamp",
            "name",
            "to_path",
            "from_path",
            "size",
            "state"
          ].join(",");
          const values = [
            "$hash",
            "$pHash",
            "$dHash",
            "$width",
            "$height",
            "$ratio",
            "$timestamp",
            "$name",
            "$toPath",
            "$fromPath",
            "$size",
            "$state"
          ].join(",");

          const replaceStatement = isReplace ? " or replace" : "";
          db.run(
            `insert${replaceStatement} into ${
              this.config.dbTableName
            } (${columns}) values (${values})`,
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
      });
    });
}
