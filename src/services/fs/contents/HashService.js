// @flow
import crypto from "crypto";
import fs from "fs-extra";
import typeof { Logger } from "log4js";

import {
  TYPE_SCRAP,
  TYPE_UNKNOWN,
  TYPE_DEDUPPER_LOCK,
  TYPE_DEDUPPER_CACHE
} from "../../../types/ClassifyTypes";
import type AttributeService from "../AttributeService";
import type { Config } from "../../../types";

export default class HashService {
  log: Logger;

  config: Config;

  as: AttributeService;

  constructor(config: Config, as: AttributeService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = as;
  }

  calculate(targetPath: string): Promise<string> {
    const classifyType = this.as.detectClassifyType(targetPath);
    const shasum = crypto.createHash(this.config.hashAlgorithm);
    if (
      [
        TYPE_SCRAP,
        TYPE_UNKNOWN,
        TYPE_DEDUPPER_LOCK,
        TYPE_DEDUPPER_CACHE
      ].includes(classifyType)
    ) {
      return Promise.resolve("");
    }

    return new Promise(resolve => {
      const r = hash => {
        this.log.debug(`calculate hash: path = ${targetPath} hash = ${hash}`);
        resolve(hash);
      };

      const s = fs.createReadStream(targetPath);
      s.on("data", data => {
        shasum.update(data);
      });
      s.on("error", e => {
        this.log.warn(e, `path = ${targetPath}`);
        resolve("");
      });
      s.on("end", () => {
        r(shasum.digest("hex"));
      });
    });
  }
}
