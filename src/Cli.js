// @flow
import commander from "commander";
import type { CommanderConfig } from "./types";

function myParseInt(value: string): number {
  // parseInt takes a string and an optional radix
  return parseInt(value, 10);
}

commander
  .allowUnknownOption()
  .option("-Z --server-port", "server port number.")
  .option("-S --server", "start dedupper server.")
  .option("-F --reset-face-api-model", "reset face-api model.")
  .option(
    "-f --db-fill [limit]",
    "fill missing db record. set process limit count.",
    myParseInt
  )
  .option(
    "-a --acd-sync [limit]",
    "acd sync. set process limit count.",
    myParseInt
  )
  .option("-x --db-repair", "repair db by log file.")
  .option("-C, --no-cache", "no use file info cache")
  .option("-m, --manual", "the current path is registered in the destination.")
  .option("-k, --keep", "save the file as keeping state")
  .option("-r, --relocate", "relocate saved file")
  .option("-D, --no-dir-keep", "no use old dir path for new path")
  .option("-R, --no-report", "disable report output")
  .option("-v, --verbose", "show debug log")
  .option("-s, --sweep", "sweep mode")
  .option("-q, --quiet", "no prompt window")
  .option("-w, --wait", "wait on process end")
  .option("-l, --log-level [level]", "log level")
  .option("-L, --no-log-config", "no log config")
  .option("-P, --no-p-hash", "skip p-hash matching")
  .option("-p, --path [path]", "target file path")
  .option("-n, --dryrun", "dryrun mode");

export default class Cli {
  parseArgs: () => CommanderConfig = (): CommanderConfig => {
    commander.parse(process.argv);
    return ((commander: any): CommanderConfig);
  };
}
