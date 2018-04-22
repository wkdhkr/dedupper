// @flow
import pLimit from "p-limit";
import FormData from "form-data";
import axios from "axios";
import concat from "concat-stream";
import fs from "fs-extra";
import type { Logger } from "log4js";
import followRedirects from "follow-redirects";

import type { Config } from "../../types";

followRedirects.maxBodyLength = 1024 * 1024 * 1000;
let currentApiPoolOffset: number = -1;

export default class OpenNsfwService {
  log: Logger;
  config: Config;
  limit: any;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.limit = pLimit(config.deepLearningConfig.nsfwApi.length * 2);
  }

  detectApiUrl = (): string => {
    currentApiPoolOffset += 1;
    const currentApi = this.config.deepLearningConfig.nsfwApi[
      currentApiPoolOffset
    ];
    if (currentApi) {
      return currentApi;
    }
    currentApiPoolOffset = -1;
    return this.detectApiUrl();
  };

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
    new Promise((resolve, reject) => {
      try {
        const form = new FormData();
        form.append("image", fs.createReadStream(targetPath));

        form.pipe(
          concat({ encoding: "buffer" }, async data => {
            const res = await this.limit(() =>
              axios.post(this.detectApiUrl(), data, {
                headers: form.getHeaders()
              })
            ).catch(reject);
            resolve(res.data);
          })
        );
      } catch (e) {
        reject(e);
      }
    });
}
