// @flow
import type {
  NsfwJsResult,
  FaceApiModelName
} from "../types/DeepLearningTypes";

export default class DeepLearningHelper {
  static NsfwJsResultMap: { [string]: NsfwJsResult[] } = {};

  static addNsfwJsResults(key: string, results: NsfwJsResult[]) {
    DeepLearningHelper.NsfwJsResultMap[key] = results;
  }

  static removeNsfwJsResults(key: string) {
    delete DeepLearningHelper.NsfwJsResultMap[key];
  }

  static getNsfwJsResults(key: string): NsfwJsResult[] | null {
    return DeepLearningHelper.NsfwJsResultMap[key] || null;
  }

  static pullNsfwJsResults(key: string): NsfwJsResult[] | null {
    const results = DeepLearningHelper.NsfwJsResultMap[key];
    DeepLearningHelper.removeNsfwJsResults(key);
    return results;
  }

  static isTensorflowModuleLoaded = false;

  static loadTensorflowModule(backEnd: string) {
    let tf;
    if (DeepLearningHelper.isTensorflowModuleLoaded) {
      return;
    }
    if (backEnd === "cpu") {
      // eslint-disable-next-line global-require
      tf = require("@tensorflow/tfjs-node");
    } else if (backEnd === "gpu") {
      // eslint-disable-next-line global-require
      tf = require("@tensorflow/tfjs-node-gpu");
    } else {
      throw new Error("unknown tfjs back end");
    }
    tf.enableProdMode();
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
