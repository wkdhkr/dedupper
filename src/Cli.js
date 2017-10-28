const program = require("commander");
const info = require("../package");

class Cli {
  parseArgs() {
    program
      .version(info.version)
      .option("-n, --dryrun", "dryrun mode")
      .parse(process.argv);

    return program;
  }
}
