// @flow
import type { Logger } from "log4js";
import defaultConfig from "../defaultConfig";
import Cli from "../Cli";
import LoggerHelper from "./LoggerHelper";
import type { Config, CommanderConfig } from "../types";

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

  static mockLoggerHelper = () =>
    jest.mock(
      "./LoggerHelper",
      () =>
        class LoggerHelperMock {
          static flush = () => Promise.resolve();
          static configure = () => {};
          static getLogger(): Object {
            return {
              trace: () => {},
              debug: () => {},
              info: () => {},
              warn: () => {},
              fatal: () => {}
            };
          }
        }
    );
  static mockCli = () => {
    jest.mock(
      "../Cli",
      () =>
        class CliMock {
          parseArgs = (): CommanderConfig => ({
            logLevel: "off",
            quiet: true,
            dryrun: true,
            pHash: true,
            logConfig: true,
            report: false,
            path: "",
            stripImage: false
          });
        }
    );
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
