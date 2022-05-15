// @flow
import os from "os";
import crypto from "crypto";
import {
  TYPE_ARCHIVE,
  TYPE_IMAGE,
  TYPE_VIDEO,
  TYPE_AUDIO,
  TYPE_TEXT,
  TYPE_SCRAP,
  TYPE_UNKNOWN
} from "../types/ClassifyTypes";
import type { ClassifyType } from "../types/ClassifyTypes";

export default class ValidationHelper {
  static getAuthToken(): string {
    const salt = "dedupper";
    const seed = os.hostname();
    return crypto
      .createHash("sha1")
      .update(salt + seed)
      .digest("hex");
  }

  static checkAuthToken(token: string): boolean {
    return token === ValidationHelper.getAuthToken();
  }

  static refineHash(hash: any): string {
    if (hash && hash.length === 64) {
      return (hash: any);
    }
    const e: any = new Error("invalid hash parameter.");
    e.statusCode = 400;
    throw e;
  }

  static refineChannelId(id: any): string {
    if (String(id).match(/[0-9a-z\\-]+/)) {
      return (id: any);
    }
    const e: any = new Error("invalid hash parameter.");
    e.statusCode = 400;
    throw e;
  }

  static refineClassifyType(type: string): ClassifyType {
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
      return (type: any);
    }
    const e: any = new Error("invalid classifyType parameter");
    e.statusCode = 400;
    throw e;
  }
}
