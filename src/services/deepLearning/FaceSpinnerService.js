// @flow
// import cv from "opencv4nodejs-prebuilt";
import pLimit from "p-limit";
import FormData from "form-data";
import axios from "axios";
import concat from "concat-stream";
import fs from "fs-extra";
import type { Logger } from "log4js";
import followRedirects from "follow-redirects";

import OpenCVHelper from "../../helpers/OpenCVHelper";
import FileNameMarkHelper from "../../helpers/FileNameMarkHelper";
import MathHelper from "../../helpers/MathHelper";
import { MARK_ERASE } from "../../types/FileNameMarks";
import type { Config } from "../../types";

const cv = OpenCVHelper.loadOpenCv();
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

type FaceSpinnerExtendedResponse = FaceSpinnerResponse & {
  buttomExpandedCorners: [number, number][],
  expandedCorners: [number, number][]
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

  expandFaceBound = (
    corners: [number, number][],
    expandRateLookup: {
      top: number,
      right: number,
      left: number,
      buttom: number
    }
  ): [number, number][] => {
    const resultCorners = [...corners];
    const templateLookup = {
      top: 0,
      right: 0,
      left: 0,
      buttom: 0
    };
    [
      {
        ...templateLookup,
        top: expandRateLookup.top
      },
      {
        ...templateLookup,
        right: expandRateLookup.right
      },
      {
        ...templateLookup,
        left: expandRateLookup.left
      },
      {
        ...templateLookup,
        buttom: expandRateLookup.buttom
      }
    ].forEach(lookup => {
      if (lookup.top !== 0) {
        resultCorners[0] = MathHelper.getExtendedPoint(
          corners[1][0],
          corners[1][1],
          corners[0][0],
          corners[0][1],
          lookup.top
        );
        resultCorners[3] = MathHelper.getExtendedPoint(
          corners[2][0],
          corners[2][1],
          corners[3][0],
          corners[3][1],
          lookup.top
        );
      }
      if (lookup.left !== 0) {
        resultCorners[0] = MathHelper.getExtendedPoint(
          corners[3][0],
          corners[3][1],
          corners[0][0],
          corners[0][1],
          lookup.left
        );
        resultCorners[1] = MathHelper.getExtendedPoint(
          corners[2][0],
          corners[2][1],
          corners[1][0],
          corners[1][1],
          lookup.left
        );
      }
      if (lookup.buttom !== 0) {
        resultCorners[1] = MathHelper.getExtendedPoint(
          corners[0][0],
          corners[0][1],
          corners[1][0],
          corners[1][1],
          lookup.buttom
        );
        resultCorners[2] = MathHelper.getExtendedPoint(
          corners[3][0],
          corners[3][1],
          corners[2][0],
          corners[2][1],
          lookup.buttom
        );
      }
      if (lookup.right !== 0) {
        resultCorners[3] = MathHelper.getExtendedPoint(
          corners[0][0],
          corners[0][1],
          corners[3][0],
          corners[3][1],
          lookup.right
        );
        resultCorners[2] = MathHelper.getExtendedPoint(
          corners[1][0],
          corners[1][1],
          corners[2][0],
          corners[2][1],
          lookup.right
        );
      }
    });

    return resultCorners;
  };

  boundFaces = (mat: any, faces: FaceSpinnerExtendedResponse[]) => {
    const red = new cv.Vec(0, 0, 255);
    const green = new cv.Vec(0, 255, 0);
    faces.forEach(face => {
      const corners = face.expandedCorners;
      mat.drawLine(
        new cv.Point(corners[0][0], corners[0][1]),
        new cv.Point(corners[1][0], corners[1][1]),
        {
          color: green,
          thickness: 2
        }
      );
      mat.drawLine(
        new cv.Point(corners[1][0], corners[1][1]),
        new cv.Point(corners[2][0], corners[2][1]),
        {
          color: green,
          thickness: 2
        }
      );
      mat.drawLine(
        new cv.Point(corners[2][0], corners[2][1]),
        new cv.Point(corners[3][0], corners[3][1]),
        {
          color: green,
          thickness: 2
        }
      );
      mat.drawLine(
        new cv.Point(corners[3][0], corners[3][1]),
        new cv.Point(corners[0][0], corners[0][1]),
        {
          color: red,
          thickness: 2
        }
      );
    });
    return mat;
  };

  demo = async (targetPath: string): Promise<FaceSpinnerExtendedResponse[]> => {
    const results = await this.query(targetPath);

    const mat = await cv.imreadAsync(targetPath);
    const destPath = FileNameMarkHelper.mark(targetPath, new Set([MARK_ERASE]));
    await cv.imwriteAsync(destPath, this.boundFaces(mat, results));

    return results;
  };

  query = async (
    targetPath: string
  ): Promise<FaceSpinnerExtendedResponse[]> => {
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
            const faces: FaceSpinnerExtendedResponse[] = (res.data: FaceSpinnerResponse[]).map(
              face => ({
                ...face,
                // contain whole head
                /*
              corners: this.expandFaceBound(
                this.expandFaceBound(face.corners, {
                  top: 0.55,
                  right: 0,
                  left: 0,
                  buttom: 0.2
                }),
                {
                  top: 0,
                  right: 0.1,
                  left: 0.1,
                  buttom: 0
                }
              )
              */
                buttomExpandedCorners: this.expandFaceBound(face.corners, {
                  top: 0.0,
                  right: 0,
                  left: 0,
                  buttom: 0.2
                }),
                expandedCorners: this.expandFaceBound(face.corners, {
                  top: 0.55,
                  right: 0.1,
                  left: 0.1,
                  buttom: 0.2
                })
              })
            );
            resolve(faces);
          } else {
            reject(new Error("no data"));
          }
        })
      );
    });
  };
}
