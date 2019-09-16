// @flow
import type {
  FacePPResult,
  NsfwJsResult,
  FaceApiModelName
} from "../types/DeepLearningTypes";
import LockHelper from "./LockHelper";

export default class DeepLearningHelper {
  static tfjsBackEnd: "cpu" | "gpu" = "cpu";

  static NsfwJsResultMap: { [string]: NsfwJsResult[] } = {};

  static FacePPResultMap: { [string]: FacePPResult } = {};

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

  static addFacePPResult(key: string, result: FacePPResult) {
    DeepLearningHelper.FacePPResultMap[key] = result;
  }

  static removeFacePPResult(key: string) {
    delete DeepLearningHelper.FacePPResultMap[key];
  }

  static getFacePPResult(key: string): FacePPResult | null {
    return DeepLearningHelper.FacePPResultMap[key] || null;
  }

  static pullFacePPResult(key: string): FacePPResult | null {
    const result = DeepLearningHelper.FacePPResultMap[key];
    DeepLearningHelper.removeFacePPResult(key);
    return result;
  }

  static isTensorflowModuleLoaded = false;

  static loadTensorflowModule(backEnd: "cpu" | "gpu"): "cpu" | "gpu" {
    let finalBackEnd: "gpu" | "cpu" = backEnd;
    let tf;
    if (DeepLearningHelper.isTensorflowModuleLoaded) {
      return DeepLearningHelper.tfjsBackEnd;
    }
    if (backEnd === "cpu") {
      // eslint-disable-next-line global-require
      tf = require("@tensorflow/tfjs-node");
    } else if (backEnd === "gpu") {
      if (LockHelper.lockProcessSync("gpu")) {
        // eslint-disable-next-line global-require
        tf = require("@tensorflow/tfjs-node-gpu");
      } else {
        // eslint-disable-next-line global-require
        tf = require("@tensorflow/tfjs-node");
        finalBackEnd = "cpu";
      }
    } else {
      throw new Error("unknown tfjs back end");
    }
    tf.enableProdMode();
    DeepLearningHelper.isTensorflowModuleLoaded = true;
    DeepLearningHelper.tfjsBackEnd = finalBackEnd;
    return finalBackEnd;
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
