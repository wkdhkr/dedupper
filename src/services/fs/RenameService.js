// @flow

const path = require("path");

type Config = {
  renameRules: Array<Array<string>>
};

class RenameService {
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

module.exports = RenameService;
