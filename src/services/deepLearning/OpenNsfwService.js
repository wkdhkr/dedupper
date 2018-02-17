// @flow
import pLimit from "p-limit";
import FormData from "form-data";
import axios from "axios";
import concat from "concat-stream";
import fs from "fs-extra";
import type { Logger } from "log4js";

import type { Exact, Config } from "../../types";

const limit = pLimit(1);

export default class OpenNsfwService {
  log: Logger;
  config: Exact<Config>;

  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
  }

  isAcceptable = async (targetPath: string): Promise<boolean> => {
    const {
      nsfwType,
      nsfwMode,
      nsfwThreshold
    } = this.config.deepLearningConfig;
    const score = (await this.query(targetPath))[nsfwType];
    this.log.debug(`${nsfwType} = ${score} path = ${targetPath}`);
    if (score > nsfwThreshold) {
      return nsfwMode === "allow";
    }
    return nsfwMode === "disallow";
  };

  query = (targetPath: string): Promise<{ nsfw: number, sfw: number }> =>
    new Promise(resolve => {
      const form = new FormData();
      form.append("image", fs.createReadStream(targetPath));
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          const res = await limit(() =>
            axios.post(this.config.deepLearningConfig.nsfwApi, data, {
              headers: form.getHeaders()
            })
          );
          resolve(res.data);
        })
      );
    });
}
