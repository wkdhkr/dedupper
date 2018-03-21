// @flow
import maxListenersExceededWarning from "max-listeners-exceeded-warning";
import type { Logger } from "log4js";

import EnvironmentHelper from "./helpers/EnvironmentHelper";
import LoggerHelper from "./helpers/LoggerHelper";
import Cli from "./Cli";
import defaultConfig from "./defaultConfig";
import ProcessService from "./services/ProcessService";
import DbRepairService from "./services/db/DbRepairService";

import type { Config } from "./types";

export default class App {
  log: Logger;
  config: Config;
  cli: Cli;
  processService: ProcessService;
  isParent = true;

  constructor() {
    this.cli = new Cli();

    const userConfig = EnvironmentHelper.loadUserConfig();

    const config = {
      ...defaultConfig,
      ...userConfig,
      ...this.cli.parseArgs(),
      ...userConfig.forceConfig
    };

    if (EnvironmentHelper.isTest()) {
      maxListenersExceededWarning();
      config.dryrun = true;
    }

    const logLevel = config.verbose
      ? "trace"
      : config.logLevel || config.defaultLogLevel;

    config.getLogger = (clazz: Object) => {
      const logger = LoggerHelper.getLogger(clazz);
      if (this.config.quiet) {
        logger.level = "off";
      } else {
        logger.level = logLevel;
      }
      return logger;
    };
    this.config = config;
    if (this.config.logConfig) {
      if (this.config.dryrun) {
        this.config.log4jsConfig.categories.default.appenders = ["out"];
      }
      if (!this.config.quiet) {
        LoggerHelper.configure(config.log4jsConfig);
      }
    }
    this.log = this.config.getLogger(this);

    if (this.config.path) {
      this.processService = new ProcessService(this.config, this.config.path);
    }
  }

  async run(): Promise<void> {
    let isError = false;

    try {
      if (this.config.dryrun) {
        this.log.info("dryrun mode.");
      }
      if (this.config.dbRepair) {
        const drs = new DbRepairService(this.config);
        await drs.run();
      } else {
        const result = await this.processService.process();
        if (!result) {
          isError = true;
        }
      }
    } catch (e) {
      this.log.fatal(e);
    }

    await this.close(isError);
  }

  async close(isError: boolean): Promise<void> {
    const exitCode = isError ? 1 : 0;
    if (this.config.wait) {
      setTimeout(
        () => console.log("\ndone.\nPress any key or two minutes to exit..."),
        500
      );
      setTimeout(() => process.exit(exitCode), 1000 * 120);
      if (process.stdout.isTTY) {
        (process.stdin: any).setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.on("data", process.exit.bind(process, exitCode));
    } else if (isError) {
      process.exit(exitCode);
    }
  }
}
