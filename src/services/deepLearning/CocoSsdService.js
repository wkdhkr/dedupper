// @flow
import "fast-text-encoding";
// eslint-disable-next-line import/no-unresolved
import * as cocoSsd from "@tensorflow-models/coco-ssd";

import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import { MARK_ERASE } from "../../types/FileNameMarks";
import LockHelper from "../../helpers/LockHelper";
import { canvas, saveFile } from "./faceApi/commons";
import type { Config } from "../../types";

const { Image, createCanvas } = canvas;
let model;
export default class CocoSsdService {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  createCanvasAndContext: (w: number, h: number) => Array<any> = (
    w: number,
    h: number
  ) => {
    const c = createCanvas(w, h);
    return [c, c.getContext("2d")];
  };

  loadModel: () => Promise<void> = async (): Promise<void> => {
    await LockHelper.lockProcess();
    if (!model) {
      model = await cocoSsd.load("mobilenet_v2");
      // model = await cocoSsd.load();
    }
    await LockHelper.unlockProcess();
  };

  demo: (targetPath: string) => Promise<Array<any>> = async (
    targetPath: string
  ): Promise<any[]> => {
    const classes = await this.predict(targetPath);
    const img = await canvas.loadImage(targetPath);
    const [c, ctx] = this.createCanvasAndContext(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    const context = c.getContext("2d");
    ctx.font = "10px Arial";

    for (let i = 0; i < classes.length; i += 1) {
      context.beginPath();
      context.rect(...classes[i].bbox);
      context.lineWidth = 1;
      context.strokeStyle = "green";
      context.fillStyle = "green";
      context.stroke();
      context.fillText(
        `${classes[i].score.toFixed(3)} ${classes[i].class}`,
        classes[i].bbox[0],
        classes[i].bbox[1] > 10 ? classes[i].bbox[1] - 5 : 10
      );
    }
    const destPath = FileNameMarkHelper.mark(targetPath, new Set([MARK_ERASE]));
    saveFile(destPath, c.toBuffer("image/jpeg"));
    return classes;
  };

  predict: (targetPath: string) => Promise<Array<any>> = async (
    targetPath: string
  ): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = async () => {
          const [c, ctx] = this.createCanvasAndContext(img.width, img.height);
          ctx.drawImage(img, 0, 0);
          // classify
          if (!model) {
            await this.loadModel();
          }
          if (model) {
            const maxDetectionSize = 10;
            const classes = await model.detect(c, maxDetectionSize);
            // Classify the image
            resolve(classes);
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
