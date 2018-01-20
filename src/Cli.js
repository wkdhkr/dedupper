// @flow
import commander from "commander";
import type { CommanderConfig } from "./types";

export default class Cli {
  parseArgs = (): CommanderConfig => {
    commander
      .option("-v, --verbose", "show debug log")
      .option("-l, --log-level [level]", "log level")
      .option("-P, --no-p-hash", "skip p-hash matching")
      .option("-p, --path [path]", "target file path")
      .option("-n, --dryrun", "dryrun mode")
      .parse(process.argv);
    return ((commander: any): CommanderConfig);
  };
}
