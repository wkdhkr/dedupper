// @flow
import log4js from "log4js";
import type { Logger } from "log4js";

export default class LoggerHelper {
  static flush(): Promise<void> {
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
    log4js.configure(config);
  }

  static getLogger(clazz: Object): Logger {
    const logger = log4js.getLogger(`${clazz.constructor.name}`);
    return logger;
  }
}
