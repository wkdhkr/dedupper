// @flow
import testAudio from "test-audio";
import type { Logger, Config } from "../types";
import defaultConfig from "../defaultConfig";
import Cli from "../Cli";
import LoggerHelper from "./LoggerHelper";

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
        default: `${TestHelper.sampleDir}firefox.png`,
        anime: `${TestHelper.sampleDir}wikipe-tan.png`
      },
      bmp: {
        default: `${TestHelper.sampleDir}firefox.bmp`
      }
    },
    video: {
      mkv: {
        default: `${TestHelper.sampleDir}SampleVideo_360x240_1mb.mkv`,
        corrupt: `${TestHelper.sampleDir}SampleVideo_360x240_1mb_corrupt.mkv`,
        empty: `${TestHelper.sampleDir}empty.mkv`
      }
    },
    audio: {
      mp3: {
        // default: `${TestHelper.sampleDir}foo.mp3`
        default: testAudio().filter(({ type }) => type === "mp3")[0].path
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
    const config = {
      ...defaultConfig,
      ...(cli.parseArgs(): any),
      dbBasePath: "",
      report: false,
      getLogger: this.getLogger,
      maxWorkers: 9999 // for max listeners issue
    };
    return config;
  }
}
