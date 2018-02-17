// @flow
import pLimit from "p-limit";
import FormData from "form-data";
import axios from "axios";
import concat from "concat-stream";
import fs from "fs-extra";

import type { Exact, Config } from "../../types";

type PredictResponse = {
  angle: number,
  direct: "frontal" | "profile",
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

const limitDetect = pLimit(1);
const limitPredict = pLimit(1);

export default class RudeCarnieService {
  config: Exact<Config>;

  constructor(config: Exact<Config>) {
    this.config = config;
  }

  isAcceptable = async (targetPath: string): Promise<boolean> => {
    const { faceMode } = this.config.deepLearningConfig;

    const hitCount = (await this.query(targetPath)).length;
    if (hitCount) {
      return faceMode === "allow";
    }
    return faceMode === "disallow";
  };

  query = (targetPath: string): Promise<PredictResponse> =>
    new Promise(async resolve => {
      const requiredGenders = [
        ...new Set(this.config.deepLearningConfig.faceCategories.map(f => f[0]))
      ];
      const form = new FormData();
      form.append("image", await fs.createReadStream(targetPath));
      requiredGenders.forEach(c => form.append("class", c));
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          const { data: res } = await limitDetect(() =>
            axios.post(
              this.config.deepLearningConfig.faceDetectWithGenderApi,
              data,
              {
                headers: form.getHeaders()
              }
            )
          );

          resolve(await this.predict(res));
        })
      );
    });

  predict = (postData: Object): Promise<PredictResponse> =>
    new Promise(resolve => {
      const form = new FormData();
      form.append("no_data", 1);
      form.append("data_set", JSON.stringify(postData));
      form.pipe(
        concat({ encoding: "buffer" }, async data => {
          const { data: res } = await limitPredict(() =>
            axios.post(this.config.deepLearningConfig.facePredictAgeApi, data, {
              headers: form.getHeaders()
            })
          );
          const faceSignatures = this.config.deepLearningConfig.faceCategories.map(
            c => c[0] + c[1]
          );
          resolve(
            res.filter(result => {
              const { prev_prediction: gender, prediction: age } = result;
              return faceSignatures.includes(gender + age);
            })
          );
        })
      );
    });
}
