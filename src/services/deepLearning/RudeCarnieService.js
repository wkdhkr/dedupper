// @flow
import pLimit from "p-limit";
import FormData from "form-data";
import axios from "axios";
import concat from "concat-stream";
import fs from "fs-extra";
import type { Logger } from "log4js";
import followRedirects from "follow-redirects";

import type { Config } from "../../types";
import type { FaceDirect } from "../../types/DeepLearningTypes";

followRedirects.maxBodyLength = 1024 * 1024 * 1000;

type PredictResponse = {
  angle: number,
  direct: FaceDirect,
  dlib_score: number,
  file_path: string,
  height: number,
  width: number,
  id: string,
  opencv_score: ?number,
  prediction: string,
  prev_prediction: string,
  score: number,
  prev_score: number
}[];

const apiPoolOffsetLookup = {
  faceDetectWithGenderApi: -1,
  facePredictAgeApi: -1
};

export default class RudeCarnieService {
  log: Logger;

  config: Config;

  limitDetect: any => Promise<any>;

  limitPredict: any => Promise<any>;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.limitDetect = pLimit(
      config.deepLearningConfig.faceDetectWithGenderApi.length * 2
    );
    this.limitPredict = pLimit(
      config.deepLearningConfig.facePredictAgeApi.length * 2
    );
    this.config = config;
  }

  detectApiUrl = (
    kind: "faceDetectWithGenderApi" | "facePredictAgeApi"
  ): string => {
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

  isAcceptable = async (targetPath: string): Promise<boolean> => {
    const { faceMode } = this.config.deepLearningConfig;

    const hitCount = (await this.query(targetPath)).length;
    // this.log.debug(`hit = ${hitCount} path = ${targetPath}`);
    if (hitCount) {
      return faceMode === "allow";
    }
    return faceMode === "disallow";
  };

  query = async (targetPath: string): Promise<PredictResponse> => {
    const rs = await fs.createReadStream(targetPath);
    return new Promise((resolve, reject) => {
      const requiredGenders = [
        ...new Set(this.config.deepLearningConfig.faceCategories.map(f => f[0]))
      ];
      const form = new FormData();
      form.append("image", rs);
      form.append("min_size", this.config.deepLearningConfig.faceMinLongSide);
      requiredGenders.forEach(c => form.append("class", c));
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          const res = await this.limitDetect(() =>
            axios
              .post(this.detectApiUrl("faceDetectWithGenderApi"), data, {
                headers: form.getHeaders()
              })
              .catch(reject)
          );
          if (res && res.data) {
            resolve(await this.predict(res.data));
          } else {
            reject(new Error("no data"));
          }
        })
      );
    });
  };

  predict = (postData: Array<any>): Promise<PredictResponse> =>
    new Promise((resolve, reject) => {
      if (postData.length === 0) {
        resolve([]);
      }
      const form = new FormData();
      form.append("no_data", 1);
      form.append("data_set", JSON.stringify(postData));
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          const { data: res } = await this.limitPredict(() =>
            axios
              .post(this.detectApiUrl("facePredictAgeApi"), data, {
                headers: form.getHeaders()
              })
              .catch(reject)
          );
          const faceSignatures = this.config.deepLearningConfig.faceCategories.map(
            c => c[0] + c[1]
          );
          resolve(
            res.filter(result => {
              const { prev_prediction: gender, prediction: age } = result;
              this.log.debug(JSON.stringify(result));
              return faceSignatures.includes(gender + age);
            })
          );
        })
      );
    });
}
