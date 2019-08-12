// @flow
import type { FaceApiModelName } from "../types/DeepLearningTypes";

export default class DeepLearningHelper {
  // static NsfwJsResultMap: { [string]: NsfwJsResult } = {};

  static isTensorflowModuleLoaded = false;

  static loadTensorflowModule(backEnd: string) {
    if (DeepLearningHelper.isTensorflowModuleLoaded) {
      return;
    }
    if (backEnd === "cpu") {
      // eslint-disable-next-line global-require
      require("@tensorflow/tfjs-node");
    } else if (backEnd === "gpu") {
      // eslint-disable-next-line global-require
      require("@tensorflow/tfjs-node-gpu");
    } else {
      throw new Error("unknown tfjs back end");
    }
    DeepLearningHelper.isTensorflowModuleLoaded = true;
  }

  static faceApiModelLoadState: { [FaceApiModelName]: boolean } = {};

  static faceApiModelDownloadState: { [FaceApiModelName]: boolean } = {};

  static setFaceApiModelLoadState(name: FaceApiModelName, state: boolean) {
    DeepLearningHelper.faceApiModelLoadState[name] = state;
  }

  static setFaceApiModelDownloadState(name: FaceApiModelName, state: boolean) {
    DeepLearningHelper.faceApiModelDownloadState[name] = state;
  }

  static isFaceApiModelLoaded(name: FaceApiModelName): boolean {
    return Boolean(DeepLearningHelper.faceApiModelLoadState[name]);
  }

  static isFaceApiModelDownloaded(name: FaceApiModelName): boolean {
    return Boolean(DeepLearningHelper.faceApiModelDownloadState[name]);
  }
}
