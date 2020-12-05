// @flow
import pLimit from "p-limit";
import fs from "fs-extra";
import csv from "async-csv";
import typeof { Logger } from "log4js";
import FileService from "../FileService";
import FileNameMarkHelper from "../../../helpers/FileNameMarkHelper";
import { MARK_BLOCK } from "../../../types/FileNameMarks";
import type { Config } from "../../../types";

type FvcExport = {
  id: string,
  Title: string,
  FilePath: string,
  FileSize: string,
  IndexTime: string,
  LengthSeconds: string,
  Link: string,
  Rating: string,
  Genre: string,
  Description: string
};

export default class FastVideoCatalogerService {
  log: Logger;

  config: Config;

  fs: FileService;

  constructor(config: Config, f: FileService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.fs = f;
  }

  isFastVideoCatalogerExportedFile(targetPath?: string): boolean {
    return this.fs.getFileName(targetPath) === "ExportedVideos.csv";
  }

  async collectBlockFiles(targetPath?: string): Promise<string[]> {
    const finalTargetPath = targetPath || this.fs.getSourcePath();
    const csvString = await fs.readFile(finalTargetPath);
    const results: FvcExport[] = await csv.parse(csvString, {
      delimiter: ";",
      columns: true
    });

    const limit = pLimit(this.config.maxWorkers);
    return Promise.all(
      results
        .filter(r => r.Rating === "1")
        .map(r =>
          limit(async () => {
            this.log.debug(`detect rating = 1 file. path = ${r.FilePath}`);
            const markedPath = FileNameMarkHelper.mark(
              r.FilePath,
              new Set([MARK_BLOCK])
            );
            if (!(await this.fs.as.isExists(markedPath))) {
              if (await this.fs.as.isExists(r.FilePath)) {
                await this.fs.rename(r.FilePath, markedPath);
              } else {
                this.log.warn(`path not found. path = ${r.FilePath}`);
                return null;
              }
            }
            return markedPath;
          })
        )
        .filter(Boolean)
    );
  }
}
