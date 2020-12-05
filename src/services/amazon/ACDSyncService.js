// @flow
import path from "path";
import pLimit from "p-limit";
import typeof { Logger } from "log4js";
import TagDbService from "../db/TagDbService";
import DbService from "../db/DbService";
import FileService from "../fs/FileService";
import SQLiteService from "../db/SQLiteService";
import ACDService from "./ACDService";
import ProcessStateDbService from "../db/ProcessStateDbService";
import type { ClassifyType } from "../../types/ClassifyTypes";
import type { Config, HashRow, ProcessStateRow } from "../../types";
import LockHelper from "../../helpers/LockHelper";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";

export default class ACDSyncService {
  log: Logger;

  config: Config;

  ss: SQLiteService;

  psds: ProcessStateDbService;

  ds: DbService;

  tds: TagDbService;

  acds: ACDService;

  fs: FileService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.psds = new ProcessStateDbService(config);
    this.tds = new TagDbService(config);
    this.ds = new DbService(config);
    this.ss = new SQLiteService(config);
    this.fs = new FileService(config);
    this.acds = new ACDService(config);
  }

  lock = () => LockHelper.lockProcess();

  unlock = () => LockHelper.unlockProcess();

  run = async (processLimit: number, dbUnit: number = 1) => {
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
      this.log.info(
        `processing... count = ${totalProcessCount}, limit = ${processLimit}`
      );
    }
    this.log.info(`done.`);
  };

  isNeedless = async (hash: string) => {
    const row = await this.tds.queryByHash(hash);
    if (row) {
      if (row.t1 > 0) {
        return true;
      }
    }
    return false;
  };

  isSameFile = (row: HashRow, acdFile: any) => {
    if (acdFile.contentProperties && acdFile.contentProperties.image) {
      const { image } = acdFile.contentProperties;
      if (image.width === row.width && image.height === row.height) {
        return true;
      }
      if (image.width === row.height && image.height === row.width) {
        return true;
      }
    }
    return false;
  };

  detectFolderIdAndName = async (toPath: string) => {
    const acdPath = this.acds.convertLocalPath(toPath);
    const parsedPath = path.parse(acdPath);
    const acdFolderPath = parsedPath.dir;
    const folderId = await this.acds.prepareFolderPath(acdFolderPath);
    return [folderId, parsedPath.base];
  };

  detectAcdUploadModeAndId = async (
    psRow: ProcessStateRow,
    row: HashRow
  ): Promise<
    ["upload" | "override" | null, string | null, string | null, string | null]
  > => {
    if (!row) {
      throw new Error(`file not found in db. hash = ${psRow.hash}`);
    }
    if (psRow.acd_id) {
      this.log.debug(`detect acd_id, skip processing. hash = ${psRow.hash}`);
      return [null, null, psRow.acd_id, psRow.acd_md5];
    }
    const [folderId, baseName] = await this.detectFolderIdAndName(row.to_path);
    const [acdFile] = await this.acds.listSingleFile(folderId, baseName);
    if (!acdFile) {
      this.log.debug(`no acd_id, will be upload. hash = ${psRow.hash}`);
      return ["upload", folderId, null, null];
    }
    if (this.isSameFile(row, acdFile)) {
      this.log.debug(`uploaded, record to db. hash = ${psRow.hash}`);
      return [null, folderId, acdFile.id, acdFile.contentProperties.md5];
    }
    this.log.debug(`different file. will be override. hash = ${psRow.hash}`);
    return ["override", folderId, acdFile.id, acdFile.contentProperties.md5];
  };

  uploadAcd = async (row: HashRow, folderId: string) => {
    if (await this.fs.pathExists(row.to_path)) {
      return this.acds.upload(row.to_path, folderId);
    }
    return null;
  };

  overrideAcd = async (row: HashRow, fileId: string) => {
    if (await this.fs.pathExists(row.to_path)) {
      return this.acds.override(row.to_path, fileId);
    }
    return null;
  };

  // eslint-disable-next-line complexity
  prepareUploadAcd = async (psRow: ProcessStateRow, row: HashRow) => {
    const [mode, folderId, fileId, md5] = await this.detectAcdUploadModeAndId(
      psRow,
      row
    );
    if (md5) {
      // eslint-disable-next-line no-param-reassign
      psRow.acd_md5 = md5;
    }
    if (fileId) {
      // eslint-disable-next-line no-param-reassign
      psRow.acd_id = fileId;
    }
    if (mode === null) {
      return psRow;
    }
    let fileAcdId: string | null = null;
    let fileAcdMd5: string | null = null;
    if (mode === "upload" && folderId) {
      const file = await this.uploadAcd(row, folderId);
      if (file) {
        fileAcdId = file.id;
        fileAcdMd5 = file.contentProperties.md5;
      }
    }
    if (mode === "override" && folderId && fileId) {
      const file = await this.overrideAcd(row, fileId);
      if (file) {
        fileAcdId = fileId;
        fileAcdMd5 = file.contentProperties.md5;
      }
    }
    if (fileAcdId) {
      // eslint-disable-next-line no-param-reassign
      psRow.acd_id = fileAcdId;
      if (fileAcdMd5) {
        // eslint-disable-next-line no-param-reassign
        psRow.acd_md5 = fileAcdMd5;
      }
      return psRow;
    }
    return psRow;
  };

  isUpdated = (
    missing: number,
    acdId: string,
    acdMd5: string,
    psRow: ProcessStateRow
  ) => {
    if (missing !== psRow.missing) {
      return true;
    }
    if (acdId !== psRow.acd_id) {
      return true;
    }

    if (acdMd5 !== psRow.acd_md5) {
      return true;
    }

    return false;
  };

  // eslint-disable-next-line complexity
  processOne = async (psRow: ?ProcessStateRow): Promise<void> => {
    try {
      if (!psRow) {
        return Promise.resolve();
      }
      const currentMissing = psRow.missing;
      const currentAcdId = psRow.acd_id;
      const currentAcdMd5 = psRow.acd_md5;

      const row = await this.ds.queryByHash(
        ({
          hash: psRow.hash,
          type: TYPE_IMAGE
        }: any)
      );
      if (!row) {
        return Promise.resolve();
      }
      const isExists = await this.fs.pathExists(row.to_path);
      // eslint-disable-next-line no-param-reassign
      psRow = await this.prepareUploadAcd(psRow, row);
      const isAcdUploaded = Boolean(psRow.acd_id);
      const isNeedless = await this.isNeedless(row.hash);
      if (isAcdUploaded) {
        if (isNeedless) {
          // eslint-disable-next-line no-param-reassign
          psRow.missing = -3;
          await this.fs.delete(row.to_path);
        } else {
          // eslint-disable-next-line no-param-reassign
          psRow.missing = -2;
        }
      } else if (!isExists) {
        // eslint-disable-next-line no-param-reassign
        psRow.missing = 2;
      } else {
        // eslint-disable-next-line no-param-reassign
        psRow.missing = -1;
      }
      if (this.isUpdated(currentMissing, currentAcdId, currentAcdMd5, psRow)) {
        await this.lock();
        try {
          return this.psds.insert(psRow);
        } catch (e) {
          this.log.warn(e);
        } finally {
          await this.unlock();
        }
      }
    } catch (e) {
      this.log.error(e);
    }
    return Promise.resolve();
  };

  searchAndGo(
    type: ClassifyType = TYPE_IMAGE,
    processLimit: number = 1
  ): Promise<number> {
    const limit = pLimit(parseInt(this.config.maxWorkers / 2, 10));
    return new Promise((resolve, reject) => {
      const db = this.ss.spawn<HashRow>(this.ss.detectDbFilePath(type));
      db.serialize(async () => {
        try {
          // await this.prepareTable(db);
          db.all(
            `select * from ${this.config.processStateDbName} ` +
              `where missing = -1 ` +
              `limit ${processLimit}`,
            {},
            (async (err, rows: ProcessStateRow[]) => {
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
