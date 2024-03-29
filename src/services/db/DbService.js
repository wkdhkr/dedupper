// @flow
import fs from "fs-extra";
import path from "path";

import typeof { Logger } from "log4js";

import DbHelper from "../../helpers/DbHelper";
import ProcessStateDbService from "./ProcessStateDbService";
import NsfwJsDbService from "./NsfwJsDbService";
import FacePPDbService from "./FacePPDbService";
import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import PHashService from "../fs/contents/PHashService";
import { TYPE_IMAGE, TYPE_UNKNOWN } from "../../types/ClassifyTypes";
import {
  STATE_ERASED,
  STATE_BLOCKED,
  STATE_DEDUPED,
  STATE_ACCEPTED,
  STATE_KEEPING
} from "../../types/FileStates";
import SQLiteService from "./SQLiteService";
import type { Config, FileInfo, HashRow } from "../../types";
import type { FileState } from "../../types/FileStates";
import type { ClassifyType } from "../../types/ClassifyTypes";

type DatabaseCallback = (?Error, HashRow) => void;
type DatabaseAllCallback = (?Error, HashRow[]) => void;
type DatabaseEachLastCallback = (?Error, number) => void;

export type Database = {
  configure: (string, any) => void,
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

  ss: SQLiteService;

  nsfwJsDbService: NsfwJsDbService;

  facePPDbService: FacePPDbService;

  psds: ProcessStateDbService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ss = new SQLiteService(config);
    this.psds = new ProcessStateDbService(config);
    this.nsfwJsDbService = new NsfwJsDbService(config);
    this.facePPDbService = new FacePPDbService(config);
  }

  async prepareTable(db: Database): Promise<any> {
    return this.ss.prepareTable(
      db,
      this.config.dbCreateTableSql,
      this.config.dbCreateIndexSqls
    );
  }

  query: (sql: string, type: ClassifyType) => Promise<Array<any>> = (
    sql: string,
    type: ClassifyType
  ): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.all(sql, {}, (err, rows: any[]) => {
            db.close();
            if (err) {
              reject(err);
              return;
            }
            resolve(rows);
          });
        } catch (e) {
          reject(e);
        }
      });
    });

  queryByHash({ hash: $hash, type }: FileInfo): Promise<?HashRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.all(
            `select * from ${this.config.dbTableName} where hash = $hash`,
            { $hash },
            (err, rows: HashRow[]) => {
              db.close();
              if (!this.ss.handleEachError<HashRow>(db, err, reject)) {
                return;
              }
              resolve(rows.pop());
            }
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  deleteByHash({ hash: $hash, type }: FileInfo): Promise<?HashRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          if (!this.config.dryrun) {
            await DbHelper.beginSafe(db);
            db.run(
              `delete from ${this.config.dbTableName} where hash = $hash`,
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

  all: (type: ClassifyType) => Promise<Array<HashRow>> = (
    type: ClassifyType
  ): Promise<HashRow[]> =>
    new Promise((resolve, reject) => {
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.all(
            `select * from ${this.config.dbTableName}`,
            {},
            (err, rows: HashRow[]) => {
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
    $value: number | string,
    type: ClassifyType
  ): Promise<HashRow[]> {
    return new Promise((resolve, reject) => {
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      const rows = [];
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.each(
            `select * from ${this.config.dbTableName} where ${column} = $value`,
            { $value },
            (err, row: HashRow) => {
              this.ss.handleEachError(db, err, reject, row, rows);
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

  async queryByName({ name, type }: FileInfo): Promise<HashRow[]> {
    const hashRows = await this.queryByValue("name", name, type);
    this.log.debug(`name search: count = ${hashRows.length}`);
    return hashRows;
  }

  queryByToPath({
    to_path: value,
    type
  }: {
    to_path: string,
    type: ClassifyType
  }): Promise<HashRow[]> {
    return this.queryByValue("to_path", value, type);
  }

  queryByPHash({
    p_hash: pHash,
    d_hash: dHash,
    from_path: fromPath,
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
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      const similarRows: HashRow[] = [];
      const [$min, $max] = [
        normalizedRatio - this.config.pHashSearchRatioRangeOffset,
        normalizedRatio + this.config.pHashSearchRatioRangeOffset
      ];
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          // search same ratio images for calculate hamming distance
          db.each(
            `select * from ${this.config.dbTableName} where state >= ${DbService.divisionValueLookup[STATE_ACCEPTED]} and ratio between $min and $max`,
            {
              $min,
              $max
            },
            (err, row: HashRow) => {
              if (!this.ss.handleEachError(db, err, reject)) {
                return;
              }
              if (this.config.pHashIgnoreSameDir) {
                if (
                  path.parse(row.from_path).dir === path.parse(fromPath).dir
                ) {
                  return;
                }
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
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  static isAcceptedState: (state: number) => boolean = (
    state: number
  ): boolean => state >= DbService.lookupFileStateDivision(STATE_ACCEPTED);

  static lookupFileStateDivision: (t: FileState) => number = (
    t: FileState
  ): number => {
    if (t in DbService.divisionValueLookup) {
      return DbService.divisionValueLookup[t];
    }
    throw new Error(`division value lookup fail. query = ${t}`);
  };

  static infoToRow: FileInfo => HashRow = ({
    hash,
    p_hash, // eslint-disable-line camelcase
    d_hash, // eslint-disable-line camelcase
    width,
    height,
    ratio,
    timestamp,
    name,
    to_path, // eslint-disable-line camelcase
    from_path, // eslint-disable-line camelcase
    size,
    state,
    process_state // eslint-disable-line camelcase
  }: FileInfo): HashRow => ({
    hash,
    p_hash,
    d_hash,
    width,
    height,
    ratio,
    timestamp,
    name,
    to_path,
    from_path,
    size,
    state: DbService.lookupFileStateDivision(state),
    process_state
  });

  static rowToInfo: (HashRow, type?: ClassifyType) => FileInfo = (
    {
      hash,
      p_hash, // eslint-disable-line camelcase
      d_hash, // eslint-disable-line camelcase
      width,
      height,
      ratio,
      timestamp,
      name,
      to_path, // eslint-disable-line camelcase
      from_path, // eslint-disable-line camelcase
      size,
      state,
      process_state // eslint-disable-line camelcase
    }: HashRow,
    type: ClassifyType = TYPE_UNKNOWN
  ): FileInfo => ({
    hash,
    p_hash,
    d_hash,
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
    state: DbService.reverseLookupFileStateDivision(state),
    process_state
  });

  static divisionValueLookup: { [FileState]: number } = {
    [STATE_ERASED]: -1,
    [STATE_BLOCKED]: 0,
    [STATE_DEDUPED]: 100,
    [STATE_ACCEPTED]: 200,
    [STATE_KEEPING]: 300
  };

  static reverseLookupFileStateDivision: (n: number) => FileState = (
    n: number
  ): FileState => {
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

  isValidFileInfo: FileInfo => boolean = ({
    type,
    p_hash: pHash,
    d_hash: dHash
  }: FileInfo): boolean => {
    if (type === TYPE_IMAGE) {
      if (!(pHash || "").match(/[0-9]+/) || !(dHash || "").match(/[0-9]+/)) {
        return false;
      }
    }
    return true;
  };

  isInsertNeedless: (fileInfo: FileInfo) => Promise<boolean> = async (
    fileInfo: FileInfo
  ): Promise<boolean> => {
    if (fileInfo.state === STATE_ERASED) {
      if (fileInfo.damaged) {
        return true;
      }
      const hitRow = await this.queryByHash(fileInfo);
      if (hitRow) {
        if (await fs.pathExists(hitRow.to_path)) {
          return true;
        }
        // only insert if already exists + file not found
        return false;
      }
      return true;
    }
    return false;
  };

  insertProcessState: (fileInfo: FileInfo) => Promise<void> = (
    fileInfo: FileInfo
  ) => this.psds.insertByHash(fileInfo);

  insert: (fileInfo: FileInfo, isReplace?: boolean) => Promise<void> = async (
    fileInfo: FileInfo,
    isReplace: boolean = true
  ): Promise<void> => {
    const isInsertNeedless = await this.isInsertNeedless(fileInfo);
    await new Promise((resolve, reject) => {
      if (isInsertNeedless) {
        resolve();
        return;
      }
      if (!this.isValidFileInfo(fileInfo)) {
        reject(new Error(`invalid fileInfo. path = ${fileInfo.from_path}`));
        return;
      }
      const db = this.ss.spawn<HashRow>(
        this.ss.detectDbFilePath(fileInfo.type)
      );
      db.serialize(async () => {
        try {
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
            process_state: $processState,
            size: $size,
            state
          } = fileInfo;
          const $state = DbService.lookupFileStateDivision(state);
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
            $processState,
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
              "process_state",
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
              "$processState",
              "$state"
            ].join(",");

            const replaceStatement = isReplace ? " or replace" : "";
            await DbHelper.beginSafe(db);
            db.run(
              `insert${replaceStatement} into ${this.config.dbTableName} (${columns}) values (${values})`,
              row,
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
    });
    if (
      DbService.isAcceptedState(
        DbService.lookupFileStateDivision(fileInfo.state)
      )
    ) {
      await this.psds.insertByHash(fileInfo);
    }
    await this.nsfwJsDbService.insert(fileInfo);
    await this.facePPDbService.insert(fileInfo);
  };
}
