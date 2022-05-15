// @flow
import glob from "glob-promise";
import pLimit from "p-limit";
import fs from "fs-extra";
import typeof { Logger } from "log4js";

import PHashService from "../fs/contents/PHashService";
import DHashService from "../fs/contents/DHashService";
import FileService from "../fs/FileService";
import DbService from "./DbService";
import ExaminationService from "../ExaminationService";
import NsfwJsDbService from "./NsfwJsDbService";
import NsfwJsService from "../deepLearning/NsfwJsService";
import DeepLearningHelper from "../../helpers/DeepLearningHelper";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import { TYPE_DEEP_LEARNING } from "../../types/ReasonTypes";

import type { HashRow, Config } from "../../types";

type InsertLogMap = { [string]: HashRow[] };

export default class DbRepairService {
  log: Logger;

  config: Config;

  ds: DbService;

  pHashService: PHashService;

  dHashService: DHashService;

  njds: NsfwJsDbService;

  njs: NsfwJsService;

  es: ExaminationService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ds = new DbService(config);
    this.njds = new NsfwJsDbService(config);
    this.dHashService = new DHashService(config);
    this.pHashService = new PHashService(config);
    this.njs = new NsfwJsService(config);
    this.es = new ExaminationService(config, new FileService(config));
  }

  run: () => Promise<void> = async () => {
    const [insertLogMap, imageRows] = await Promise.all([
      this.createInsertLogMap(),
      this.ds.all(TYPE_IMAGE)
    ]);
    await this.repairImageRows(insertLogMap, imageRows);
  };

  fillDeepLearningTable(hitRows: HashRow[]): Promise<any> {
    return Promise.all(
      hitRows.map(async row => {
        const fileInfo = DbService.rowToInfo(row, TYPE_IMAGE);
        // TODO: version check?
        if (await this.njds.queryByHash(fileInfo)) {
          return;
        }
        if (
          this.config.deepLearningConfig.nsfwMode !== "none" &&
          this.config.deepLearningConfig.nsfwBackEnd === "NSFWJS"
        ) {
          const results = await this.njs.predict(row.to_path);
          if (!this.config.deepLearningConfig.nsfwJsJudgeFunction(results)) {
            // not acceptable
            fileInfo.nsfwJs = {
              results,
              version: this.config.deepLearningConfig.nsfwJsDbVersion
            };
            try {
              await this.es.rename(TYPE_DEEP_LEARNING, fileInfo);
            } catch (e) {
              console.log(e);
              this.log.warn(
                `fill deep learning table: rename fail. from = ${row.from_path}`
              );
            }
          }
          DeepLearningHelper.addNsfwJsResults(row.hash, results);
          await this.njds.insert(fileInfo);
        }
      })
    );
  }

  repairImageRows: (
    insertLogMap: InsertLogMap,
    rows: Array<HashRow>
  ) => Promise<void> = async (
    insertLogMap: InsertLogMap,
    rows: HashRow[]
  ): Promise<void> => {
    let correctCount = 0;
    let notCorrectCount = 0;
    const limit = pLimit(this.config.maxWorkers);
    await Promise.all(
      rows.map(row =>
        limit(async () => {
          const info = DbService.rowToInfo(row, TYPE_IMAGE);
          await Promise.all(
            ["d_hash", "p_hash"].map(async property => {
              if (!(row[property] || "").match(/^[0-9]+$/)) {
                const correctValue = await this.findCorrectProperty(
                  row,
                  property,
                  insertLogMap
                );
                if (correctValue) {
                  this.log.info(
                    `correct value. property = ${property}, value = ${correctValue}, row = ${JSON.stringify(
                      row
                    )}`
                  );
                  info[property] = correctValue;
                  if (!this.config.dryrun) {
                    await this.ds.insert(info);
                  }
                  correctCount += 1;
                } else {
                  this.log.warn(
                    `cannot correct value. property = ${property}, row = ${JSON.stringify(
                      row
                    )}`
                  );
                  notCorrectCount += 1;
                }
              }
            })
          );
        })
      )
    );
    this.log.info(
      `The repair process of TYPE_IMAGE db is completed. ok = ${correctCount} ng = ${notCorrectCount}`
    );
  };

  findCorrectPropertyFromLogMap: (
    hash: string,
    property: "d_hash" | "p_hash",
    insertLogMap: InsertLogMap
  ) => ?string = (
    hash: string,
    property: "d_hash" | "p_hash",
    insertLogMap: InsertLogMap
  ): ?string => {
    let value;
    const rows = insertLogMap[hash] || [];
    if (rows.length === 0) {
      value = null;
    } else {
      const mayValue = (rows.filter(r => r[property])[0] || {})[property] || "";
      if (mayValue.match(/^[0-9]+$/)) {
        value = mayValue;
      }
    }
    return value;
  };

  findCorrectPropertyFromFile: (
    row: HashRow,
    property: "d_hash" | "p_hash"
  ) => Promise<?string> = async (
    row: HashRow,
    property: "d_hash" | "p_hash"
  ): Promise<?string> => {
    let value;
    const targetPath = (await fs.pathExists(row.to_path))
      ? row.to_path
      : row.from_path;
    if (property === "d_hash") {
      value = await this.dHashService.calculate(targetPath);
    }
    if (property === "p_hash") {
      value = (await this.pHashService.calculate(targetPath)) || null;
    }
    return value;
  };

  findCorrectProperty: (
    row: HashRow,
    property: "d_hash" | "p_hash",
    insertLogMap: InsertLogMap
  ) => Promise<?string> = async (
    row: HashRow,
    property: "d_hash" | "p_hash",
    insertLogMap: InsertLogMap
  ): Promise<?string> => {
    const value = this.findCorrectPropertyFromLogMap(
      row.hash,
      property,
      insertLogMap
    );
    if ((value || "").match(/^[0-9]+$/)) {
      return value;
    }
    return this.findCorrectPropertyFromFile(row, property);
  };

  createInsertLogMap: () => Promise<InsertLogMap> = async (): Promise<InsertLogMap> => {
    const logFiles = await glob(
      `${this.config.log4jsConfig.appenders.file.filename}.*.log`
    );
    const insertLogMap = {};
    logFiles.forEach(async logFile => {
      const logContent = await fs.readFile(logFile, "utf8");
      logContent.split("\n").forEach(line => {
        if (line.match(/DbService - insert:/)) {
          const row = this.decodeRow(
            JSON.parse(line.split("DbService - insert: row = ")[1])
          );
          if (insertLogMap[row.hash]) {
            insertLogMap[row.hash].push(row);
          } else {
            insertLogMap[row.hash] = [row];
          }
        }
      });
    });
    return insertLogMap;
  };

  cleanHashValue: (v: ?string) => ?string = (v: ?string): ?string => {
    if (v === "undefined") {
      return null;
    }
    if (!v) {
      return null;
    }
    return String(v);
  };

  decodeRow: (dbRow: any) => HashRow = (dbRow: Object): HashRow => ({
    hash: dbRow.$hash,
    p_hash: dbRow.$pHash,
    // NOTE: type mismatch bug fix for old version
    d_hash: this.cleanHashValue(dbRow.$dHash),
    width: dbRow.$width,
    height: dbRow.$height,
    ratio: dbRow.$ratio,
    timestamp: dbRow.$timestamp,
    name: dbRow.$name,
    to_path: dbRow.$toPath,
    from_path: dbRow.$fromPath,
    size: dbRow.$size,
    state: dbRow.$state,
    process_state: dbRow.$processState
  });
}
