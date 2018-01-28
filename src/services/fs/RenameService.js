// @flow

import path from "path";
import type { Config } from "../../types";

export default class RenameService {
  config: Config;
  constructor(config: Config) {
    this.config = config;
  }

  dedupeDirName = (p: string): string => {
    const dedupedTokens = [];
    const tokens = p.split(path.sep);
    const fileName = tokens.pop();
    tokens.forEach(t => !dedupedTokens.includes(t) && dedupedTokens.push(t));
    return path.join(...dedupedTokens, fileName);
  };

  converge(sourcePath: string, destDirPath: string): string {
    let sweepedSourcePath = sourcePath.replace(/^[a-zA-Z]:/, "");
    if (this.config.dirKeep === false) {
      sweepedSourcePath = path.basename(sweepedSourcePath);
    }
    this.config.renameRules.forEach(rule => {
      if (rule instanceof Array) {
        const [pattern, replacement] = rule;
        if (pattern instanceof RegExp) {
          sweepedSourcePath = sweepedSourcePath.replace(pattern, replacement);
        } else {
          sweepedSourcePath = sweepedSourcePath
            .split(pattern)
            .join(replacement);
        }
      } else {
        sweepedSourcePath = rule(sweepedSourcePath);
      }
    });
    return path.join(destDirPath, this.dedupeDirName(sweepedSourcePath));
  }
}
