// @flow
import * as faceapi from "face-api.js";

import DeepLearningHelper from "../../../helpers/DeepLearningHelper";
import LockHelper from "../../../helpers/LockHelper";
import FaceApiModelService from "./FaceApiModelService";
import ExaminationService from "../../ExaminationService";
import {
  canvas,
  faceDetectionNet,
  faceDetectionOptions,
  saveFile
} from "./commons";
import FileNameMarkHelper from "../../../helpers/FileNameMarkHelper";
import { MARK_ERASE } from "../../../types/FileNameMarks";
import {
  MODEL_FACE_RECOGNITION,
  MODEL_SSD_MOBILENETV1,
  MODEL_AGE_GENDER,
  MODEL_FACE_LANDMARK_68
} from "../../../types/DeepLearningTypes";

import type { Config } from "../../../types";
import type { FaceApiModelName } from "../../../types/DeepLearningTypes";

export default class FaceApiService {
  config: Config;

  faceApiModelService: FaceApiModelService;

  examinationService: ExaminationService;

  constructor(config: Config) {
    this.config = config;
    this.faceApiModelService = new FaceApiModelService(config);
  }

  loadFaceRecognitionNetModel = async () => {
    if (DeepLearningHelper.isFaceApiModelLoaded(MODEL_FACE_RECOGNITION)) {
      return;
    }
    LockHelper.lockProcess();
    const modelPath = await this.faceApiModelService.prepare(
      MODEL_FACE_RECOGNITION
    );
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    LockHelper.unlockProcess();
  };

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
      this.isUsed(MODEL_FACE_RECOGNITION)
        ? this.loadFaceRecognitionNetModel()
        : Promise.resolve(),
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
    const isAgeGenderUsed = this.isUsed(MODEL_AGE_GENDER);
    const isLandmarkUsed = this.isUsed(MODEL_FACE_LANDMARK_68);
    if (isLandmarkUsed) {
      f = f.withFaceLandmarks();
    }
    if (isAgeGenderUsed) {
      f = f.withAgeAndGender();
    }
    if (
      isAgeGenderUsed &&
      isLandmarkUsed &&
      this.isUsed(MODEL_FACE_RECOGNITION)
    ) {
      f = f.withFaceDescriptors();
    }
    return f;
  };

  demo = async (targetPath: string) => {
    const results = await this.predict(targetPath);
    const img = await canvas.loadImage(targetPath);
    const out = faceapi.createCanvasFromMedia(img);
    if (this.isUsed(MODEL_AGE_GENDER)) {
      results.forEach(result => {
        const { age, gender, genderProbability } = result;
        new faceapi.draw.DrawTextField(
          [
            `${faceapi.round(age, 0)} years`,
            `${gender} (${faceapi.round(genderProbability)})`
          ],
          result.detection.box.bottomLeft
        ).draw(out);
      });
    }

    faceapi.draw.drawDetections(out, results.map(res => res.detection));
    if (this.isUsed(MODEL_FACE_LANDMARK_68)) {
      faceapi.draw.drawFaceLandmarks(out, results.map(res => res.landmarks));
    }
    const destPath = FileNameMarkHelper.mark(targetPath, new Set([MARK_ERASE]));
    saveFile(destPath, out.toBuffer("image/jpeg"));
    return results;
  };
}
