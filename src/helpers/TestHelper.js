// @flow
import type { Logger } from "log4js";
import defaultConfig from "../defaultConfig";
import Cli from "../Cli";
import LoggerHelper from "../helpers/LoggerHelper";
import type { Config } from "../types";

export default class TestHelper {
  static sampleDir = "__tests__/sample/";

  static getLogger(clazz: Object): Logger {
    const logger = LoggerHelper.getLogger(clazz);
    logger.level = "off";
    return logger;
  }
  static createDummyConfig(): Config {
    const cli = new Cli();
    return {
      ...defaultConfig,
      ...cli.parseArgs(),
      getLogger: this.getLogger
    };
  }
}
