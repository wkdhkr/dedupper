// @flow
import "fast-text-encoding";
import "@tensorflow/tfjs-node";
// import "@tensorflow/tfjs-node-gpu";
import * as nsfwjs from "nsfwjs";

import type { Logger } from "log4js";

import { Image, createCanvas } from "canvas-prebuilt";
import LockHelper from "../../helpers/LockHelper";
import type { Config } from "../../types";

let model = null; // singleton

export default class NsfwJsService {
  log: Logger;

  config: Config;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
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
    const canvas = createCanvas(w, h);
    return [canvas, canvas.getContext("2d")];
  };

  predict = async (targetPath: string): Promise<boolean> => {
    const width = 300;
    const height = 300;
    const [canvas, ctx] = this.createCanvasAndContext(width, height);
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
            const predictions = await model.classify(canvas);
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
