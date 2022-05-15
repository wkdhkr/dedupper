// @flow
import "fast-text-encoding";
// import "@tensorflow/tfjs-node";
// import "@tensorflow/tfjs-node-gpu";
import * as posenet from "@tensorflow-models/posenet";

import DeepLearningHelper from "../../../helpers/DeepLearningHelper";
import FileNameMarkHelper from "../../../helpers/FileNameMarkHelper";
import { MARK_ERASE } from "../../../types/FileNameMarks";
import LockHelper from "../../../helpers/LockHelper";
import { canvas, saveFile } from "../faceApi/commons";
// $FlowFixMe
import * as demoUtil from "./demo_util";
import type { Config } from "../../../types";

const { Image, createCanvas } = canvas;
let net;
export default class PoseNetService {
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
    DeepLearningHelper.loadTensorflowModule(
      this.config.deepLearningConfig.tfjsBackEnd
    );
    await LockHelper.lockProcess();
    if (!net) {
      net = await posenet.load({
        architecture: "ResNet50",
        outputStride: 32,
        inputResolution: 257,
        quantBytes: 2
      });
    }
    await LockHelper.unlockProcess();
  };

  demo: (targetPath: string) => Promise<Array<any>> = async (
    targetPath: string
  ): Promise<any[]> => {
    const poses = await this.predict(targetPath);
    const img = await canvas.loadImage(targetPath);
    const [c, ctx] = this.createCanvasAndContext(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    poses.forEach(pose => {
      demoUtil.drawSkeleton(pose.keypoints, 0.5, ctx);
      demoUtil.drawKeypoints(pose.keypoints, 0.5, ctx);
    });
    const destPath = FileNameMarkHelper.mark(targetPath, new Set([MARK_ERASE]));
    saveFile(destPath, c.toBuffer("image/jpeg"));
    return poses;
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
          if (!net) {
            await this.loadModel();
          }
          if (net) {
            // Classify the image
            /*
            const poses = await net.estimateMultiplePoses(c, {
              flipHorizontal: false,
              maxDetections: 9,
              scoreThreshold: 0.5,
              nmsRadius: 20
            });
            resolve(poses);
            */
            const pose = await net.estimateSinglePose(c, {
              flipHorizontal: false
            });
            resolve([pose]);
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
