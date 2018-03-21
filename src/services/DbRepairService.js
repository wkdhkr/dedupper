// @flow
import glob from "glob-promise";
import pLimit from "p-limit";
import fs from "fs-extra";
import type { Logger } from "log4js";

import PHashService from "./fs/contents/PHashService";
import DHashService from "./fs/contents/DHashService";
import DbService from "./DbService";
import { TYPE_IMAGE } from "../types/ClassifyTypes";

import type { HashRow, Config } from "../types";

type InsertLogMap = { [string]: HashRow[] };

export default class DbRepairService {
  log: Logger;
  config: Config;
  ds: DbService;
  pHashService: PHashService;
  dHashService: DHashService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ds = new DbService(config);
    this.dHashService = new DHashService(config);
    this.pHashService = new PHashService(config);
  }

  run = async () => {
    const [insertLogMap, imageRows] = await Promise.all([
      this.createInsertLogMap(),
      this.ds.all(TYPE_IMAGE)
    ]);
    await this.repairImageRows(insertLogMap, imageRows);
  };

  repairImageRows = async (
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

  findCorrectProperty = async (
    row: HashRow,
    property: "d_hash" | "p_hash",
    insertLogMap: InsertLogMap
  ): Promise<?string> => {
    let value;
    const rows = insertLogMap[row.hash] || [];
    if (rows.length === 0) {
      value = null;
    } else {
      value = (rows.filter(r => r[property])[0] || {})[property];
    }
    if (value) {
      return value;
    }
    if (property === "d_hash") {
      value = await this.dHashService.calculate(row.to_path);
    }
    if (property === "p_hash") {
      value = (await this.pHashService.calculate(row.to_path)) || null;
    }
    return value;
  };

  createInsertLogMap = async (): Promise<InsertLogMap> => {
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

  decodeRow = (dbRow: Object): HashRow => ({
    hash: dbRow.$hash,
    p_hash: dbRow.$pHash,
    d_hash: String(dbRow.$dHash), // NOTE: type mismatch bug fix for old version
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
