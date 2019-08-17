// @flow
import cv from "opencv4nodejs-prebuilt";
import pLimit from "p-limit";
import FormData from "form-data";
import axios from "axios";
import concat from "concat-stream";
import fs from "fs-extra";
import type { Logger } from "log4js";
import followRedirects from "follow-redirects";

import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import { MARK_ERASE } from "../../types/FileNameMarks";
import type { Config } from "../../types";

followRedirects.maxBodyLength = 1024 * 1024 * 1000;

type FaceSpinnerResponse = {
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  scale: number,
  conf: number,
  corners: [number, number][]
};

const apiPoolOffsetLookup = {
  faceSpinnerApi: -1
};

export default class FaceSpinnerService {
  log: Logger;

  config: Config;

  limitDetect: any => Promise<any>;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.limitDetect = pLimit(
      config.deepLearningConfig.faceDetectWithGenderApi.length * 2
    );
    this.config = config;
  }

  detectApiUrl = (kind: string = "faceSpinnerApi"): string => {
    apiPoolOffsetLookup[kind] += 1;
    const currentApi = this.config.deepLearningConfig[kind][
      apiPoolOffsetLookup[kind]
    ];
    if (currentApi) {
      return currentApi;
    }
    apiPoolOffsetLookup[kind] = -1;
    return this.detectApiUrl(kind);
  };

  boundFaces = (mat: any, faces: FaceSpinnerResponse[]) => {
    const red = new cv.Vec(0, 0, 255);
    const green = new cv.Vec(0, 255, 0);
    faces.forEach(face => {
      mat.drawLine(
        new cv.Point(face.corners[0][0], face.corners[0][1]),
        new cv.Point(face.corners[1][0], face.corners[1][1]),
        {
          color: green,
          thickness: 2
        }
      );
      mat.drawLine(
        new cv.Point(face.corners[1][0], face.corners[1][1]),
        new cv.Point(face.corners[2][0], face.corners[2][1]),
        {
          color: green,
          thickness: 2
        }
      );
      mat.drawLine(
        new cv.Point(face.corners[2][0], face.corners[2][1]),
        new cv.Point(face.corners[3][0], face.corners[3][1]),
        {
          color: green,
          thickness: 2
        }
      );
      mat.drawLine(
        new cv.Point(face.corners[3][0], face.corners[3][1]),
        new cv.Point(face.corners[0][0], face.corners[0][1]),
        {
          color: red,
          thickness: 2
        }
      );
    });
    return mat;
  };

  demo = async (targetPath: string): Promise<FaceSpinnerResponse[]> => {
    const results = await this.query(targetPath);

    const mat = await cv.imreadAsync(targetPath);
    const destPath = FileNameMarkHelper.mark(targetPath, new Set([MARK_ERASE]));
    await cv.imwriteAsync(destPath, this.boundFaces(mat, results));

    return results;
  };

  query = async (targetPath: string): Promise<FaceSpinnerResponse[]> => {
    const s = await fs.createReadStream(targetPath);
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("image", s);
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          const res = await this.limitDetect(() =>
            axios
              .post(this.detectApiUrl(), data, {
                headers: form.getHeaders()
              })
              .catch(reject)
          );
          if (res && res.data) {
            resolve(res.data);
          } else {
            reject(new Error("no data"));
          }
        })
      );
    });
  };
}
