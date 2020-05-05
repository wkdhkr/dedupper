// @flow
import path from "path";
import appRoot from "app-root-path";
import "fast-text-encoding";
// import "@tensorflow/tfjs-node";
// import "@tensorflow/tfjs-node-gpu";
import * as nsfwjs from "nsfwjs";

import type { Logger } from "log4js";

import FileCacheService from "../fs/FileCacheService";
import canvas from "./faceApi/commons/env";
import LockHelper from "../../helpers/LockHelper";
import DeepLearningHelper from "../../helpers/DeepLearningHelper";
import FileSystemHelper from "../../helpers/FileSystemHelper";
import type { Config, FileInfo } from "../../types";
import type { NsfwJsResult } from "../../types/DeepLearningTypes";

const { Image, createCanvas } = canvas;
let model = null; // singleton

export default class NsfwJsService {
  log: Logger;

  config: Config;

  fcs: FileCacheService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.fcs = new FileCacheService(config);
  }

  loadModel = async (): Promise<void> => {
    DeepLearningHelper.loadTensorflowModule(
      this.config.deepLearningConfig.tfjsBackEnd
    );
    await LockHelper.lockProcess();
    if (!model) {
      // model = await nsfwjs.load();
      // model = await nsfwjs.load("https://nsfwjs.com/model/", { size: 299 });
      model = await nsfwjs.load(
        `file://${path.join(appRoot.toString(), "resource/nsfwjs/")}`,
        { size: 299 }
      );
    }
    await LockHelper.unlockProcess();
  };

  createCanvasAndContext = (w: number, h: number) => {
    const c = createCanvas(w, h);
    return [c, c.getContext("2d")];
  };

  readResultsFromFileCache = (fileInfo: FileInfo): ?(NsfwJsResult[]) => {
    if (fileInfo.nsfwJs) {
      if (
        fileInfo.nsfwJs.version ===
        this.config.deepLearningConfig.nsfwJsDbVersion
      ) {
        return fileInfo.nsfwJs.results;
      }
    }
    return null;
  };

  isAcceptable = async (fileInfo: FileInfo): Promise<boolean> => {
    const cachedResults = this.readResultsFromFileCache(fileInfo);
    let results = cachedResults;
    if (!results) {
      results = await this.predict(fileInfo.from_path);
      // eslint-disable-next-line no-param-reassign
      fileInfo.nsfwJs = {
        results,
        version: this.config.deepLearningConfig.nsfwJsDbVersion
      };
      await this.fcs.write(fileInfo);
    } else {
      this.log.debug(`nsfwJs: cache hit! path = ${fileInfo.from_path}`);
    }
    this.log.info(`nsfwjs: result = ${JSON.stringify(results)}`);
    const isAcceptable = this.config.deepLearningConfig.nsfwJsJudgeFunction(
      results
    );
    if (isAcceptable) {
      DeepLearningHelper.addNsfwJsResults(fileInfo.hash, results);
    }
    return isAcceptable;
  };

  predict = async (targetPath: string): Promise<NsfwJsResult[]> => {
    const width = 300;
    const height = 300;
    const [c, ctx] = this.createCanvasAndContext(width, height);
    const img = new Image();
    const escapePath = await FileSystemHelper.prepareEscapePath(targetPath);
    return new Promise((resolve, reject) => {
      try {
        img.onload = async () => {
          ctx.drawImage(img, 0, 0, width, height);
          await FileSystemHelper.clearEscapePath(escapePath);

          // classify
          if (!model) {
            await this.loadModel();
          }
          if (model) {
            const predictions = await model.classify(c);
            // Classify the image
            resolve(predictions);
            return;
          }
          reject(new Error("model not loaded"));
        };
        img.onerror = err => {
          reject(err);
        };
        img.src = escapePath;
      } catch (e) {
        reject(e);
      }
    });
  };
}
