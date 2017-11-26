// @flow

const path = require("path");

class RenameService {
  config: {
    renameRules: Array<Array<string>>
  };
  constructor(config) {
    this.config = config;
  }

  converge(sourcePath, destDirPath) {
    let sweepedSourcePath = sourcePath.replace(/^[a-zA-Z]:/, "");
    this.config.renameRules.forEach(([pattern, replacement]) => {
      sweepedSourcePath = sweepedSourcePath.replace(pattern, replacement);
    });
    return path.join(destDirPath, sweepedSourcePath);
  }
}

module.exports = RenameService;
