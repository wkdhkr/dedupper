// @flow
/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import "fast-text-encoding";
import fs from "fs-extra";
import typeof { Logger } from "log4js";
import * as bodyPix from "@tensorflow-models/body-pix";

import FileService from "../../fs/FileService";
import OpenCVHelper from "../../../helpers/OpenCVHelper";
import FileSystemHelper from "../../../helpers/FileSystemHelper";
import DeepLearningHelper from "../../../helpers/DeepLearningHelper";
import FileNameMarkHelper from "../../../helpers/FileNameMarkHelper";
import { MARK_ERASE } from "../../../types/FileNameMarks";
import LockHelper from "../../../helpers/LockHelper";
import * as demoUtil from "./demo_util";
import * as outputRenderingUtil from "./output_rendering_util";
import * as partColorScales from "./part_color_scales";
import { canvas, saveFile } from "../faceApi/commons";
import type { FileInfo, Config } from "../../../types";

const cv = OpenCVHelper.loadOpenCv();
const { Image, createCanvas } = canvas;
const absoluteInternalResolution = 641;
let net;
const guiState = {
  algorithm: "multi-person-instance",
  estimate: "partmap",
  camera: null,
  flipHorizontal: false,
  /*
  input: {
    architecture: "MobileNetV1",
    outputStride: 16,
    internalResolution: "full",
    multiplier: 0.5,
    quantBytes: 2
  },
  */
  input: {
    architecture: "ResNet50",
    outputStride: 32,
    quantBytes: 2,
    // quantBytes: 4,
    // internalResolution: "medium"
    internalResolution: "full"
  },
  multiPersonDecoding: {
    maxDetections: 5,
    // scoreThreshold: 0.5,
    scoreThreshold: 0.2,
    nmsRadius: 20,
    numKeypointForMatching: 17,
    refineSteps: 10
  },
  segmentation: {
    segmentationThreshold: 0.7,
    effect: "mask",
    maskBackground: true,
    opacity: 0.7,
    backgroundBlurAmount: 3,
    maskBlurAmount: 0,
    edgeBlurAmount: 3
  },
  partMap: {
    colorScale: "rainbow",
    effect: "partMap",
    segmentationThreshold: 0.5,
    opacity: 0.3,
    blurBodyPartAmount: 3,
    bodyPartEdgeBlurAmount: 3
  },
  showFps: false
};
export default class BodyPixService {
  config: Config;

  log: Logger;

  resizedImageSize: number = absoluteInternalResolution;

  constructor(config: Config) {
    this.config = config;
    this.log = this.config.getLogger(this);
    DeepLearningHelper.loadTensorflowModule(
      this.config.deepLearningConfig.tfjsBackEnd
    );
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
    if (!net) {
      net = await bodyPix.load(guiState.input);
    }
    await LockHelper.unlockProcess();
  };

  estimateSegmentation: (
    image: any,
    internalResolution: number
  ) => Promise<any> = async (
    image: any,
    internalResolution: number
  ): Promise<any> => {
    const multiPersonSegmentation = null;
    switch (guiState.algorithm) {
      case "multi-person-instance":
        return net.segmentMultiPerson(image, {
          internalResolution,
          segmentationThreshold: guiState.segmentation.segmentationThreshold,
          maxDetections: guiState.multiPersonDecoding.maxDetections,
          scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
          nmsRadius: guiState.multiPersonDecoding.nmsRadius,
          numKeypointForMatching:
            guiState.multiPersonDecoding.numKeypointForMatching,
          refineSteps: guiState.multiPersonDecoding.refineSteps
        });
      case "person":
        return net.segmentPerson(image, {
          internalResolution: guiState.input.internalResolution,
          segmentationThreshold: guiState.segmentation.segmentationThreshold,
          maxDetections: guiState.multiPersonDecoding.maxDetections,
          scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
          nmsRadius: guiState.multiPersonDecoding.nmsRadius
        });
      default:
        break;
    }
    return multiPersonSegmentation;
  };

  estimatePartSegmentation: (
    image: any,
    internalResolution: number
  ) => Promise<null> = async (image: any, internalResolution: number) => {
    const multiPersonPartSegmentation = null;
    switch (guiState.algorithm) {
      case "multi-person-instance":
        return net.segmentMultiPersonParts(image, {
          internalResolution,
          segmentationThreshold: guiState.segmentation.segmentationThreshold,
          maxDetections: guiState.multiPersonDecoding.maxDetections,
          scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
          nmsRadius: guiState.multiPersonDecoding.nmsRadius,
          numKeypointForMatching:
            guiState.multiPersonDecoding.numKeypointForMatching,
          refineSteps: guiState.multiPersonDecoding.refineSteps
        });
      case "person":
        return net.segmentPersonParts(image, {
          internalResolution: guiState.input.internalResolution,
          segmentationThreshold: guiState.segmentation.segmentationThreshold,
          maxDetections: guiState.multiPersonDecoding.maxDetections,
          scoreThreshold: guiState.multiPersonDecoding.scoreThreshold,
          nmsRadius: guiState.multiPersonDecoding.nmsRadius
        });
      default:
        break;
    }
    return multiPersonPartSegmentation;
  };

  drawPoses: (
    personOrPersonPartSegmentation: any,
    flipHorizontally: boolean,
    ctx: any
  ) => void = (
    personOrPersonPartSegmentation: any,
    flipHorizontally: boolean,
    ctx: any
  ) => {
    if (Array.isArray(personOrPersonPartSegmentation)) {
      personOrPersonPartSegmentation.forEach(personSegmentation => {
        let { pose } = personSegmentation;
        if (flipHorizontally) {
          pose = bodyPix.flipPoseHorizontal(pose, personSegmentation.width);
        }
        demoUtil.drawKeypoints(pose.keypoints, 0.1, ctx);
        demoUtil.drawSkeleton(pose.keypoints, 0.1, ctx);
      });
    } else {
      personOrPersonPartSegmentation.allPoses.forEach(pose => {
        let fixedPose = pose;
        if (flipHorizontally) {
          fixedPose = bodyPix.flipPoseHorizontal(
            pose,
            personOrPersonPartSegmentation.width
          );
        }
        demoUtil.drawKeypoints(fixedPose.keypoints, 0.1, ctx);
        demoUtil.drawSkeleton(fixedPose.keypoints, 0.1, ctx);
      });
    }
  };

  demo: (targetPath: string) => Promise<[null | number, any]> = async (
    targetPath: string
  ): Promise<any> => {
    const fileInfo = await new FileService({
      ...this.config,
      path: targetPath
    }).collectFileInfo();
    const flipHorizontally = guiState.flipHorizontal;
    let result = null;
    let ratio = null;
    let finalCanvas;

    switch (guiState.estimate) {
      case "segmentation":
        {
          const [multiPersonSegmentation, c, ctx, img, r] = await this.predict(
            fileInfo
          );
          result = multiPersonSegmentation;
          ratio = r;
          finalCanvas = c;

          switch (guiState.segmentation.effect) {
            case "mask": {
              const foregroundColor = { r: 255, g: 255, b: 255, a: 255 };
              const backgroundColor = { r: 0, g: 0, b: 0, a: 255 };
              const mask = bodyPix.toMask(
                multiPersonSegmentation,
                foregroundColor,
                backgroundColor,
                true
              );

              bodyPix.drawMask(
                c,
                img,
                mask,
                guiState.segmentation.opacity,
                guiState.segmentation.maskBlurAmount,
                flipHorizontally
              );
              this.drawPoses(multiPersonSegmentation, flipHorizontally, ctx);
              break;
            }
            case "bokeh":
              bodyPix.drawBokehEffect(
                c,
                img,
                multiPersonSegmentation,
                +guiState.segmentation.backgroundBlurAmount,
                guiState.segmentation.edgeBlurAmount,
                flipHorizontally
              );
              break;
            default:
              break;
          }
        }

        break;
      case "partmap": {
        const [
          multiPersonPartSegmentation,
          c,
          ctx,
          img,
          r
        ] = await this.predict(fileInfo);
        result = multiPersonPartSegmentation;
        ratio = r;
        finalCanvas = c;
        const coloredPartImageData = outputRenderingUtil.toColoredPartMask(
          multiPersonPartSegmentation,
          { ...partColorScales }[guiState.partMap.colorScale]
        );

        const maskBlurAmount = 0;
        switch (guiState.partMap.effect) {
          case "pixelation": {
            const pixelCellWidth = 10.0;

            bodyPix.drawPixelatedMask(
              c,
              img,
              coloredPartImageData,
              guiState.partMap.opacity,
              maskBlurAmount,
              flipHorizontally,
              pixelCellWidth
            );
            break;
          }
          case "partMap":
            outputRenderingUtil.drawMask(
              c,
              img,
              coloredPartImageData,
              guiState.partMap.opacity,
              maskBlurAmount,
              flipHorizontally
            );
            break;
          case "blurBodyPart": {
            const blurBodyPartIds = [0, 1];
            bodyPix.blurBodyPart(
              c,
              img,
              multiPersonPartSegmentation,
              blurBodyPartIds,
              guiState.partMap.blurBodyPartAmount,
              guiState.partMap.edgeBlurAmount,
              flipHorizontally
            );
            break;
          }
          default:
            break;
        }
        this.drawPoses(multiPersonPartSegmentation, flipHorizontally, ctx);
        break;
      }
      default:
        break;
    }
    this.save(targetPath, finalCanvas);
    return [ratio, result];
  };

  save: (targetPath: string, finalCanvas: any) => void = (
    targetPath: string,
    finalCanvas: any
  ) => {
    if (finalCanvas) {
      const destPath = FileNameMarkHelper.mark(
        targetPath,
        new Set([MARK_ERASE])
      );
      saveFile(destPath, finalCanvas.toBuffer("image/jpeg"));
    }
  };

  calcInternalResolution: (width: number, height: number) => number = (
    width: number,
    height: number
  ): number => {
    const radioWidth = absoluteInternalResolution / width;
    const radioHeight = absoluteInternalResolution / height;

    const result = Math.max(
      0.1,
      Math.min(1, Math.min(radioWidth, radioHeight))
    );
    this.log.info(`bodyPix: image ratio = ${result}`);
    return result;
  };

  preparePostImageBuffer: (fileInfo: FileInfo) => Promise<any> = async (
    fileInfo: FileInfo
  ) => {
    const isFileSizeOver = fileInfo.size > 2 * 1024 * 1024;
    const isResolutionOver =
      fileInfo.width > this.resizedImageSize ||
      fileInfo.height > this.resizedImageSize;
    if (isFileSizeOver || isResolutionOver) {
      // const isJpeg = true;
      // 1024 * x = fileInfo.width
      // x = fileInfo.width / 1024
      const longerSide =
        fileInfo.width > fileInfo.height ? fileInfo.width : fileInfo.height;
      const ratio = isResolutionOver ? this.resizedImageSize / longerSide : 1;
      /*
      const buffer = await this.jimpService.convertToPngBuffer(
        fileInfo.from_path,
        isResolutionOver
          ? this.resizedImageSize
          : Math.max(fileInfo.width, fileInfo.height),
        isJpeg
      );
      */
      const escapePath = await FileSystemHelper.prepareEscapePath(
        fileInfo.from_path
      );
      try {
        let mat = await cv.imreadAsync(escapePath);
        mat = mat.resizeToMax(this.resizedImageSize);
        await FileSystemHelper.clearEscapePath(escapePath);

        // await cv.imwriteAsync("test2.jpg", mat);
        // await fs.writeFile("test.jpg", buffer);

        await FileSystemHelper.clearEscapePath(escapePath);
        return ([ratio, cv.imencode(".jpg", mat)]: any);
      } catch (e) {
        await FileSystemHelper.clearEscapePath(escapePath);
        throw e;
      }
    }
    return ([1, await fs.readFile(fileInfo.from_path)]: any);
  };

  predict: (
    fileInfo: FileInfo
  ) => Promise<[any, any, any, any, number]> = async (
    fileInfo: FileInfo
  ): Promise<[any, any, any, any, number]> => {
    const [ratio, buffer] = await this.preparePostImageBuffer(fileInfo);
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
            if (guiState.estimate === "segmentation") {
              const segmentation = await this.estimateSegmentation(
                DeepLearningHelper.getTf().node.decodeImage(
                  // await fs.readFile(targetPath)
                  buffer
                ),
                // this.calcInternalResolution(img.width, img.height)
                ("full": any)
              );
              resolve([segmentation, c, ctx, img, ratio]);
              return;
            }
            if (guiState.estimate === "partmap") {
              const segmentation = await this.estimatePartSegmentation(
                DeepLearningHelper.getTf().node.decodeImage(
                  // await fs.readFile(targetPath)
                  buffer
                ),
                // this.calcInternalResolution(img.width, img.height)
                ("full": any)
              );
              resolve([segmentation, c, ctx, img, ratio]);
              return;
            }
            reject(new Error("unknown estimate"));
          }
          reject(new Error("model not loaded"));
        };
        img.onerror = err => {
          reject(err);
        };
        img.src = `data:image/jpeg;base64,${buffer.toString("base64")}`;
      } catch (e) {
        reject(e);
      }
    });
  };
}
