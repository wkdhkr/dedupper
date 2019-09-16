// @flow

import type { FacePPGlass, FacePPGender } from "../types/DeepLearningTypes";

export default class FacePPHelper {
  static glassLookup: { [FacePPGlass]: number } = {
    None: 1,
    Dark: 2,
    Normal: 3
  };

  static reverseGlassLookup: { [string]: FacePPGlass } = {
    "1": "None",
    "2": "Dark",
    "3": "Normal"
  };

  static encodeGlass(glass: FacePPGlass): number {
    if (FacePPHelper.glassLookup[glass]) {
      return FacePPHelper.glassLookup[glass];
    }
    throw new Error("unknown face++ glass type");
  }

  static decodeGlass(rawGlass: number): FacePPGlass {
    const key = FacePPHelper.reverseGlassLookup[String(rawGlass)];
    if (key) {
      return key;
    }
    throw new Error("unknown face++ glass value");
  }

  static genderLookup: { [FacePPGender]: number } = {
    Male: 1,
    Female: 2
  };

  static reverseGenderLookup: { [string]: FacePPGender } = {
    "1": "Male",
    "2": "Female"
  };

  static encodeGender(gender: FacePPGender): number {
    if (FacePPHelper.genderLookup[gender]) {
      return FacePPHelper.genderLookup[gender];
    }
    throw new Error("unknown face++ gender type");
  }

  static decodeGender(rawGender: number): FacePPGender {
    const key = FacePPHelper.reverseGenderLookup[String(rawGender)];
    if (key) {
      return key;
    }
    throw new Error("unknown face++ gender value");
  }
}
