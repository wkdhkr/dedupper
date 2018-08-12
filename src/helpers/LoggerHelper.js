// @flow
import log4js from "log4js";
import type { Logger } from "log4js";
import EnvironmentHelper from "./EnvironmentHelper";

export default class LoggerHelper {
  static flush(): Promise<void> {
    if (EnvironmentHelper.isTest()) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      log4js.shutdown(err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  static configure(config: Object) {
    if (EnvironmentHelper.isTest()) {
      return;
    }
    log4js.configure(config);
  }

  static getLogger(clazz: Object): Logger {
    if (EnvironmentHelper.isTest()) {
      return ({
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        fatal: () => {}
      }: any);
    }
    const logger = log4js.getLogger(`${clazz.constructor.name}`);
    return logger;
  }
}
