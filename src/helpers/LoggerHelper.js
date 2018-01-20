// @flow
import log4js from "log4js";
import type { Logger } from "log4js";

export default class LoggerHelper {
  static getLogger(clazz: Object): Logger {
    const logger = log4js.getLogger(`${clazz.constructor.name}`);
    return logger;
  }
}
