// @flow

import { promisify } from "util";
import { imageHash, hammingDistance } from "phash";
import type { Logger } from "log4js";

import type { Exact, Config } from "../../../types";

const imageHashAsync = promisify(imageHash);

export default class PHashService {
  log: Logger;
  config: Exact<Config>;
  constructor(config: Exact<Config>) {
    this.log = config.getLogger(this);
    this.config = config;
  }
  calculate = (targetPath: string): Promise<void | string> =>
    imageHashAsync(targetPath)
      .then(hash => {
        this.log.debug(`calculate hash: path = ${targetPath} hash = ${hash}`);
        return hash;
      })
      .catch(e => {
        this.log.warn(e);
      });

  compare = (a: ?string, b: ?string): number | false => {
    if (!a || !b) {
      return false;
    }
    return hammingDistance(a, b);
  };
}
