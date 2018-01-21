// @flow
import path from "path";
import pify from "pify";
import sqlite3 from "sqlite3";

import type { Logger } from "log4js";

import PHashService from "./fs/contents/PHashService";
import type { Exact, Config, FileInfo, HashRow } from "../types";

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
  config: Exact<Config>;
  pHashService: PHashService;

  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
    this.pHashService = new PHashService(config);
  }

  spawn = (dbFilePath: string): Database => {
    const db: Database = new sqlite3.Database(dbFilePath);
    if (this.config.verbose) {
      db.on("trace", sql => this.log.debug(`db trace: sql = "${sql}"`));
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

  queryByPHash({ p_hash: pHash, type, ratio }: FileInfo): Promise<HashRow[]> {
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
          `select * from ${
            this.config.dbTableName
          } where ratio between $min AND $max`,
          { $min, $max },
          (err, row: HashRow) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            const distance = this.pHashService.compare(pHash, row.p_hash);
            if (distance !== false) {
              if (distance < this.config.pHashThreshold) {
                similarRows.push({ ...row, p_hash_distance: distance });
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

  infoToRow = ({
    hash,
    p_hash: pHash,
    width,
    height,
    ratio,
    timestamp,
    name,
    to_path: toPath,
    size
  }: FileInfo): HashRow => ({
    hash,
    p_hash: pHash,
    width,
    height,
    ratio,
    timestamp,
    name,
    path: toPath,
    size
  });

  insert = (fileInfo: FileInfo): Promise<void> =>
    new Promise((resolve, reject) => {
      const db = this.spawn(this.detectDbFilePath(fileInfo.type));
      db.serialize(async () => {
        await this.prepareTable(db);
        const {
          hash: $hash,
          p_hash: $pHash,
          width: $width,
          height: $height,
          ratio: $ratio,
          timestamp: $timestamp,
          name: $name,
          to_path: $path,
          size: $size
        } = fileInfo;
        const row = {
          $hash,
          $pHash,
          $width,
          $height,
          $ratio,
          $timestamp,
          $name,
          $path,
          $size
        };
        this.log.info(`insert: row = ${JSON.stringify(row)}`);
        if (!this.config.dryrun) {
          const columns =
            "hash, p_hash, width, height, ratio, timestamp, name, path, size";
          const values =
            "$hash, $pHash, $width, $height, $ratio, $timestamp, $name, $path, $size";

          db.run(
            `insert into ${
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
