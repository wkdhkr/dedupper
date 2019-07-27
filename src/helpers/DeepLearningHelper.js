// @flow
import type { FaceApiModelName } from "../types/DeepLearningTypes";

export default class DeepLearningHelper {
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
