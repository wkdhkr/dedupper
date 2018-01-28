// @flow
import crypto from "crypto";
import fs from "fs-extra";
import type { Logger } from "log4js";

import ImageminService from "./ImageminService";
import {
  TYPE_IMAGE,
  TYPE_SCRAP,
  TYPE_UNKNOWN
} from "../../../types/ClassifyTypes";
import type AttributeService from "../AttributeService";
import type { Exact, Config } from "../../../types";

export default class HashService {
  log: Logger;
  config: Exact<Config>;
  as: AttributeService;
  imageminService: ImageminService;

  constructor(config: Exact<Config>, as: AttributeService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = as;
    this.imageminService = new ImageminService();
  }

  calculate(targetPath: string): Promise<string> {
    const classifyType = this.as.detectClassifyType(targetPath);
    const shasum = crypto.createHash(this.config.hashAlgorithm);
    if ([TYPE_SCRAP, TYPE_UNKNOWN].includes(classifyType)) {
      return Promise.resolve("");
    }

    return new Promise(resolve => {
      const r = hash => {
        this.log.debug(`calculate hash: path = ${targetPath} hash = ${hash}`);
        resolve(hash);
      };

      // ignore image metadata
      if (classifyType === TYPE_IMAGE && this.config.stripImage) {
        this.imageminService
          .run(targetPath)
          .then(([o = {}]) => {
            shasum.update(o.data || "");
            r(shasum.digest("hex"));
          })
          .catch(e => {
            this.log.warn(e, `path = ${targetPath}`);
            resolve("");
          });
      } else {
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
      }
    });
  }
}
