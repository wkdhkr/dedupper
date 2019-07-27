// @flow
import * as faceapi from "face-api.js";

import DeepLearningHelper from "../../../helpers/DeepLearningHelper";
import LockHelper from "../../../helpers/LockHelper";
import { canvas, faceDetectionNet, faceDetectionOptions } from "./commons";
import type { Config } from "../../../types";
import {
  MODEL_SSD_MOBILENETV1,
  MODEL_AGE_GENDER,
  MODEL_FACE_LANDMARK_68
} from "../../../types/DeepLearningTypes";

import type { FaceApiModelName } from "../../../types/DeepLearningTypes";
import FaceApiModelService from "./FaceApiModelService";

export default class FaceApiService {
  config: Config;

  faceApiModelService: FaceApiModelService;

  constructor(config: Config) {
    this.config = config;
    this.faceApiModelService = new FaceApiModelService(config);
  }

  loadFaceDetectionNetModel = async () => {
    if (DeepLearningHelper.isFaceApiModelLoaded(MODEL_SSD_MOBILENETV1)) {
      return;
    }
    LockHelper.lockProcess();
    const modelPath = await this.faceApiModelService.prepare(
      MODEL_SSD_MOBILENETV1
    );
    await faceDetectionNet.loadFromDisk(modelPath);
    LockHelper.unlockProcess();
  };

  loadAgeGenderNetModel = async () => {
    if (DeepLearningHelper.isFaceApiModelLoaded(MODEL_AGE_GENDER)) {
      return;
    }
    LockHelper.lockProcess();
    const modelPath = await this.faceApiModelService.prepare(MODEL_AGE_GENDER);
    await faceapi.nets.ageGenderNet.loadFromDisk(modelPath);
    LockHelper.unlockProcess();
  };

  loadLandmark68NetModel = async () => {
    if (DeepLearningHelper.isFaceApiModelLoaded(MODEL_FACE_LANDMARK_68)) {
      return;
    }
    LockHelper.lockProcess();
    const modelPath = await this.faceApiModelService.prepare(
      MODEL_FACE_LANDMARK_68
    );
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    LockHelper.unlockProcess();
  };

  isUsed = (name: FaceApiModelName) =>
    this.config.deepLearningConfig.faceApiUseModels.includes(name);

  loadModels = async () =>
    Promise.all([
      this.isUsed(MODEL_FACE_LANDMARK_68)
        ? this.loadLandmark68NetModel()
        : Promise.resolve(),
      this.isUsed(MODEL_AGE_GENDER)
        ? this.loadAgeGenderNetModel()
        : Promise.resolve(),
      this.isUsed(MODEL_SSD_MOBILENETV1)
        ? this.loadFaceDetectionNetModel()
        : Promise.resolve()
    ]);

  predict = async (targetPath: string) => {
    await this.loadModels();
    const img = await canvas.loadImage(targetPath);
    let f = faceapi.detectAllFaces(img, faceDetectionOptions);
    if (this.isUsed(MODEL_FACE_LANDMARK_68)) {
      f = f.withFaceLandmarks();
    }
    if (this.isUsed(MODEL_AGE_GENDER)) {
      f = f.withAgeAndGender();
    }
    return f;
  };
}
