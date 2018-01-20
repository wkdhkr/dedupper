// @flow
import crypto from "crypto";
import fs from "fs-extra";
import type { Logger } from "log4js";

import ImageminService from "./ImageminService";
import { TYPE_IMAGE } from "../../../types/ClassifyTypes";
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
    const shasum = crypto.createHash(this.config.hashAlgorithm);

    return new Promise((resolve, reject) => {
      const r = hash => {
        this.log.debug(`calculate hash: path = ${targetPath} hash = ${hash}`);
        resolve(hash);
      };

      // ignore image metadata
      if (this.as.detectClassifyType(targetPath) === TYPE_IMAGE) {
        this.imageminService
          .run(targetPath)
          .then(([{ data }]) => {
            shasum.update(data);
            r(shasum.digest("hex"));
          })
          .catch(reject);
      } else {
        const s = fs.createReadStream(targetPath);
        s.on("data", data => {
          shasum.update(data);
        });
        s.on("error", reject);
        s.on("end", () => {
          r(shasum.digest("hex"));
        });
      }
    });
  }
}
