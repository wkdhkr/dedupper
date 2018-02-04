// @flow
import dhash from "dhash-image";
import { promisify } from "util";

import PHashService from "./PHashService";

import type { Exact, Config } from "../../../types";

export default class DHashService extends PHashService {
  constructor(config: Exact<Config>) {
    super(config);
    this.log = config.getLogger(this);
    this.config = config;
  }

  calculate = async (targetPath: string): Promise<void | string> =>
    promisify(dhash)(targetPath)
      .then(async (hash: Buffer) => {
        const hex = parseInt(hash.toString("hex"), 16);
        this.log.debug(`calculate dHash: path = ${targetPath} hash = ${hex}`);
        return hex;
      })
      .catch(async e => {
        this.log.warn(e, `path = ${targetPath}`);
      });
}
