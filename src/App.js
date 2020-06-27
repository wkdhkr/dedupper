// @flow
// import "source-map-support/register";
// eslint-disable-next-line no-unused-vars
// import nodereport from "node-report";
import maxListenersExceededWarning from "max-listeners-exceeded-warning";
// import SegfaultHandler from "segfault-handler";
import type { Logger } from "log4js";

import ProcessHelper from "./helpers/ProcessHelper";
import EnvironmentHelper from "./helpers/EnvironmentHelper";
import LoggerHelper from "./helpers/LoggerHelper";
import Cli from "./Cli";
import defaultConfig from "./defaultConfig";
import ProcessService from "./services/ProcessService";
import DbRepairService from "./services/db/DbRepairService";
import DbFillService from "./services/db/DbFillService";
import Server from "./servers";

import type { Config } from "./types";

// SegfaultHandler.registerHandler("crash.log");
// nodereport.triggerReport();

export default class App {
  log: Logger;

  config: Config;

  cli: Cli;

  processService: ProcessService;

  isParent = true;

  constructor() {
    this.cli = new Cli();

    const userConfig = EnvironmentHelper.loadUserConfig();

    const config: Object = {
      ...defaultConfig,
      ...userConfig,
      ...(this.cli.parseArgs(): any),
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
    } else {
      this.processService = new ProcessService(this.config, ".");
    }
  }

  registerErrorCallback = () => {
    process.on("uncaughtException", err => {
      this.log.fatal(`Uncaught exception: ${err}`);
    });
    process.on("unhandledRejection", (reason, p) => {
      this.log.fatal("Unhandled Rejection at:", p, "reason:", reason);
      // application specific logging, throwing an error, or other logic here
    });
  };

  async run() {
    let isError = false;

    this.registerErrorCallback();

    await this.processService.lockForSingleProcess();

    try {
      if (this.config.dryrun) {
        this.log.info("dryrun mode.");
      }
      if (this.config.dbRepair) {
        const drs = new DbRepairService(this.config);
        await drs.run();
      } else if (this.config.dbFill) {
        const dfs = new DbFillService(this.config);
        await dfs.run(this.config.dbFill, 1000);
      } else if (this.config.server) {
        const s = new Server(this.config);
        s.run();
      } else {
        const result = await this.processService.process();
        if (!result) {
          isError = true;
        }
      }
    } catch (e) {
      isError = true;
      this.log.fatal(e);
    }

    await this.processService.unlockForSingleProcess();

    await this.close(isError);
  }

  close(isError: boolean) {
    const exitCode = isError ? 1 : 0;
    if (this.config.wait) {
      setTimeout(
        () => console.log("\ndone.\nPress any key or two minutes to exit..."),
        500
      );
      setTimeout(() => ProcessHelper.exit(exitCode), 1000 * 120);
      ProcessHelper.setStdInHook("data", () => ProcessHelper.exit(exitCode));
    } else if (isError) {
      ProcessHelper.exit(exitCode);
    }
  }
}
