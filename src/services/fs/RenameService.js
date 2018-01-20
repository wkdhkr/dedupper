// @flow

import path from "path";
import type { Config } from "../../types";

export default class RenameService {
  config: Config;
  constructor(config: Config) {
    this.config = config;
  }

  converge(sourcePath: string, destDirPath: string): string {
    let sweepedSourcePath = sourcePath.replace(/^[a-zA-Z]:/, "");
    this.config.renameRules.forEach(([pattern, replacement]) => {
      sweepedSourcePath = sweepedSourcePath.replace(pattern, replacement);
    });
    return path.join(destDirPath, sweepedSourcePath);
  }
}
