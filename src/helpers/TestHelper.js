// @flow
import type { Logger } from "log4js";
import defaultConfig from "../defaultConfig";
import Cli from "../Cli";
import LoggerHelper from "../helpers/LoggerHelper";
import type { Config } from "../types";

export default class TestHelper {
  static sampleDir = "__tests__/sample/";
  static sampleFile = {
    image: {
      jpg: {
        default: `${TestHelper.sampleDir}firefox.jpg`,
        corrupt: `${TestHelper.sampleDir}firefox_corrupt.jpg`,
        small: `${TestHelper.sampleDir}firefox_small.jpg`,
        empty: `${TestHelper.sampleDir}empty.jpg`,
        notfound: `${TestHelper.sampleDir}notfound.jpg`
      },
      png: {
        default: `${TestHelper.sampleDir}firefox.png`
      }
    },
    video: {
      mkv: {
        default: `${TestHelper.sampleDir}SampleVideo_360x240_1mb.mkv`,
        corrupt: `${TestHelper.sampleDir}SampleVideo_360x240_1mb_corrupt.mkv`,
        empty: `${TestHelper.sampleDir}empty.mkv`
      }
    },
    misc: {
      txt: {
        default: `${TestHelper.sampleDir}foo.txt`
      },
      unknown: {
        default: `${TestHelper.sampleDir}foo._xyz_`
      }
    }
  };

  static getLogger(clazz: Object): Logger {
    const logger = LoggerHelper.getLogger(clazz);
    logger.level = "off";
    return logger;
  }
  static createDummyConfig(): Config {
    const cli = new Cli();
    return {
      ...defaultConfig,
      ...cli.parseArgs(),
      getLogger: this.getLogger
    };
  }
}
