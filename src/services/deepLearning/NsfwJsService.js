// @flow
import "fast-text-encoding";
// import "@tensorflow/tfjs-node";
// import "@tensorflow/tfjs-node-gpu";
import * as nsfwjs from "nsfwjs";

import type { Logger } from "log4js";

import canvas from "./faceApi/commons/env";
import LockHelper from "../../helpers/LockHelper";
import DeepLearningHelper from "../../helpers/DeepLearningHelper";
import type { Config, FileInfo } from "../../types";
import type { NsfwJsResult } from "../../types/DeepLearningTypes";

const { Image, createCanvas } = canvas;
let model = null; // singleton

export default class NsfwJsService {
  log: Logger;

  config: Config;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    DeepLearningHelper.loadTensorflowModule(
      this.config.deepLearningConfig.tfjsBackEnd
    );
  }

  loadModel = async (): Promise<void> => {
    await LockHelper.lockProcess();
    if (!model) {
      // model = await nsfwjs.load();
      model = await nsfwjs.load("https://nsfwjs.com/model/", { size: 299 });
    }
    await LockHelper.unlockProcess();
  };

  createCanvasAndContext = (w: number, h: number) => {
    const c = createCanvas(w, h);
    return [c, c.getContext("2d")];
  };

  isAcceptable = async (fileInfo: FileInfo): Promise<boolean> => {
    const targetPath = fileInfo.from_path;
    const results = await this.predict(targetPath);
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
    return new Promise((resolve, reject) => {
      try {
        img.onload = async () => {
          ctx.drawImage(img, 0, 0, width, height);

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
        img.src = targetPath;
      } catch (e) {
        reject(e);
      }
    });
  };
}
