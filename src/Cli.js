// @flow
const program = require("commander");

class Cli {
  parseArgs = () => {
    program
      .option("-v, --verbose", "show debug log")
      .option("-l, --log-level [level]", "log level")
      .option("-p, --path [path]", "target file path")
      .option("-n, --dryrun", "dryrun mode")
      .parse(process.argv);
    return program;
  };
}

module.exports = Cli;
