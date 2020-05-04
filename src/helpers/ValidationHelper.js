// @flow
import os from "os";
import crypto from "crypto";
import {
  ClassifyType,
  TYPE_ARCHIVE,
  TYPE_IMAGE,
  TYPE_VIDEO,
  TYPE_AUDIO,
  TYPE_TEXT,
  TYPE_SCRAP,
  TYPE_UNKNOWN
} from "../types/ClassifyTypes";

export default class ValidationHelper {
  static getAuthToken = (): string => {
    const salt = "dedupper";
    const seed = os.hostname();
    return crypto
      .createHash("sha1")
      .update(salt + seed)
      .digest("hex");
  };

  static checkAuthToken = (token: string): boolean => {
    return token === ValidationHelper.getAuthToken();
  };

  static refineClassifyType = (type: string): ClassifyType => {
    if (
      [
        TYPE_ARCHIVE,
        TYPE_IMAGE,
        TYPE_VIDEO,
        TYPE_AUDIO,
        TYPE_TEXT,
        TYPE_SCRAP,
        TYPE_UNKNOWN
      ].includes(type)
    ) {
      return type;
    }
    const e = new Error("invalid classifyType");
    e.statusCode = 400;
    throw e;
  };
}
