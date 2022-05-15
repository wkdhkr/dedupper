// @flow
import pLimit from "p-limit";
import typeof { Logger } from "log4js";
import { pathExists } from "fs-extra";
import { STATE_ACCEPTED } from "../../types/FileStates";
import LockHelper from "../../helpers/LockHelper";
import SQLiteService from "./SQLiteService";
import DbService from "./DbService";
import FileService from "../fs/FileService";
import NsfwJsDbService from "./NsfwJsDbService";
import FacePPDbService from "./FacePPDbService";
import ProcessStateDbService from "./ProcessStateDbService";
import FacePPService from "../deepLearning/facePP/FacePPService";
import NsfwJsService from "../deepLearning/NsfwJsService";
import type { Config, HashRow, FacePPRow } from "../../types";
import type { ClassifyType } from "../../types/ClassifyTypes";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import { STATE_NG, STATE_OK, STATE_SKIP } from "../../types/ProcessStates";
import type { ProcessState } from "../../types/ProcessStates";

export default class DbFillService {
  log: Logger;

  config: Config;

  nsfwJsDbService: NsfwJsDbService;

  nsfwJsService: NsfwJsService;

  facePPDbService: FacePPDbService;

  facePPService: FacePPService;

  psds: ProcessStateDbService;

  ss: SQLiteService;

  ds: DbService;

  fs: FileService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.nsfwJsDbService = new NsfwJsDbService(config);
    this.nsfwJsService = new NsfwJsService(config);
    this.facePPDbService = new FacePPDbService(config);
    this.facePPService = new FacePPService(config);
    this.ss = new SQLiteService(config);
    this.ds = new DbService(config);
    this.fs = new FileService(config);
    this.psds = new ProcessStateDbService(config);
  }

  lock: () => any = () => LockHelper.lockProcess();

  unlock: () => Promise<void> = () => LockHelper.unlockProcess();

  run: (processLimit: number, dbUnit?: number) => Promise<void> = async (
    processLimit: number,
    dbUnit: number = 1
  ) => {
    await this.lock();
    await this.psds.init();
    await this.unlock();
    let totalProcessCount = 0;
    while (totalProcessCount <= processLimit) {
      const fixedDbUnit = Math.min(processLimit, dbUnit);
      // eslint-disable-next-line no-await-in-loop
      const processCount = await this.searchAndGo(TYPE_IMAGE, fixedDbUnit);
      if (processCount === 0) {
        break;
      }
      totalProcessCount += processCount;
      this.log.info(`processing... count = ${totalProcessCount}`);
    }
    this.log.info(`done.`);
  };

  processOne: (row: HashRow) => Promise<void> = async (
    row: HashRow
  ): Promise<void> => {
    const ps = await this.psds.queryByHashOrNew(row.hash);
    const skipFlag = this.config.processStateSkipFunction(row);
    if (await pathExists(row.to_path)) {
      ps.missing = -1;
      const pathFixedRow = {
        ...row,
        from_path: row.to_path
      };

      if (!skipFlag) {
        this.log.info(`file found. path = ${row.to_path}, hash = ${row.hash}`);
        const [facepp, count] = await this.processFacePP(pathFixedRow);
        ps.facepp = facepp;
        ps.facepp_face_count = count;
        ps.nsfwjs = await this.processNsfwJs(pathFixedRow);
      } else {
        this.log.info(`skip file. path = ${row.to_path}, hash = ${row.hash}`);
        ps.facepp = STATE_SKIP;
        ps.nsfwjs = STATE_SKIP;
      }
    } else {
      this.log.warn(
        `file not found. path = ${row.to_path}, hash = ${row.hash}`
      );
      ps.missing = 2;
    }
    await this.lock();
    try {
      return this.psds.insert(ps);
    } catch (e) {
      this.log.warn(e);
    } finally {
      await this.unlock();
    }
    return Promise.resolve();
  };

  processNsfwJs: (row: HashRow) => Promise<ProcessState> = async (
    row: HashRow
  ): Promise<ProcessState> => {
    let isLocked = false;
    try {
      const fileInfo = DbService.rowToInfo(row, TYPE_IMAGE);
      const dbResult = await this.nsfwJsDbService.queryByHash(fileInfo);
      if (dbResult) {
        return STATE_OK;
      }
      const results = await this.nsfwJsService.predict(fileInfo.from_path);
      fileInfo.nsfwJs = {
        results,
        version: this.config.deepLearningConfig.nsfwJsDbVersion
      };
      await this.lock();
      isLocked = true;
      await this.nsfwJsDbService.insert(fileInfo, true, true);
      return STATE_OK;
    } catch (e) {
      this.log.warn(e);
      return STATE_NG;
    } finally {
      if (isLocked) {
        await this.unlock();
      }
    }
  };

  isValidFacePPResults: (rows: Array<FacePPRow>) => boolean = (
    rows: FacePPRow[]
  ) => {
    if (rows.length === 0) {
      return false;
    }
    if (
      rows.some(
        ({ version }) =>
          version < this.config.deepLearningConfig.facePPDbVersion
      )
    ) {
      return false;
    }
    return true;
  };

  processFacePP: (row: HashRow) => Promise<[ProcessState, number]> = async (
    row: HashRow
  ): Promise<[ProcessState, number]> => {
    let isLocked = false;
    try {
      const fileInfo = DbService.rowToInfo(row, TYPE_IMAGE);
      const dbResults = await this.facePPDbService.queryByHash(fileInfo);
      if (this.isValidFacePPResults(dbResults)) {
        return [STATE_OK, dbResults.length];
      }
      const result = await this.facePPService.detectFaces(fileInfo);
      fileInfo.facePP = {
        result,
        version: this.config.deepLearningConfig.facePPDbVersion
      };
      await this.lock();
      isLocked = true;
      await this.facePPDbService.insert(fileInfo, true, true);
      return [STATE_OK, result.faces.length];
    } catch (e) {
      this.log.warn(e);
      return [STATE_NG, 0];
    } finally {
      if (isLocked) {
        await this.unlock();
      }
    }
  };

  searchAndGo(
    type: ClassifyType = TYPE_IMAGE,
    processLimit: number = 1
  ): Promise<number> {
    const limit = pLimit(this.config.maxWorkers);
    return new Promise((resolve, reject) => {
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      db.serialize(async () => {
        try {
          // await this.prepareTable(db);
          db.all(
            `select * from ${this.config.dbTableName} h ` +
              `where state >= ${DbService.divisionValueLookup[STATE_ACCEPTED]} and ` +
              // `process_state is null and ` +
              `not exists(` +
              `select null from ${this.config.processStateDbName} p ` +
              `where h.hash = p.hash and ((p.facepp > 0 and p.nsfwjs > 0) or ` +
              `(p.missing = 2 or p.missing = -1))` +
              `) limit ${processLimit}`,
            // `) order by to_path desc limit ${processLimit}`,
            // `select * from ${this.config.dbTableName} limit ${processLimit}`,
            {},
            (async (err, rows: HashRow[]) => {
              if (err) {
                reject(err);
              } else {
                await Promise.all(
                  rows.map(row => limit(() => this.processOne(row)))
                );
                resolve(rows.length);
              }
            }: any)
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
