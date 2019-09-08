// @flow
import qs from "qs";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import JimpService from "../../fs/contents/JimpService";
import type { FileInfo, Config } from "../../../types";

export default class FacePPService {
  resizedImageSize = 1024;

  config: Config;

  baseParams: { [string]: string };

  jimpService: JimpService;

  constructor(config: Config) {
    this.config = config;
    this.jimpService = new JimpService(this.config);
    this.baseParams = {
      api_key: this.config.deepLearningConfig.facePPApiKey,
      api_secret: this.config.deepLearningConfig.facePPApiSecret
    };
  }

  preparePostImagePath = async (
    fileInfo: FileInfo
  ): Promise<[number, string]> => {
    const isFileSizeOver = fileInfo.size > 2 * 1024 * 1024;
    const isResolutionOver = fileInfo.width > 4096 || fileInfo.height > 4096;
    const isJpeg = true;
    if (isFileSizeOver || isResolutionOver) {
      // 1024 * x = fileInfo.width
      // x = fileInfo.width / 1024
      const longerSide =
        fileInfo.width > fileInfo.height ? fileInfo.width : fileInfo.height;
      const ratio = isResolutionOver ? longerSide / this.resizedImageSize : 1;
      const fixedPath = await this.jimpService.fixTargetPath(
        fileInfo.from_path,
        isResolutionOver
          ? this.resizedImageSize
          : Math.max(fileInfo.width, fileInfo.height),
        isJpeg
      );

      return [ratio, fixedPath];
    }
    return [1, fileInfo.from_path];
  };

  async detectFaces(fileInfo: FileInfo): Promise<any> {
    const [, postImagePath] = await this.preparePostImagePath(fileInfo);
    const res = await this.requestDetectFaceApi(
      this.createDetectFaceParams(postImagePath)
    );
    return res;
  }

  createDetectFaceParams = (targetPath: string): {} => {
    const params = {
      image_file: fs.createReadStream(targetPath)
    };
    return params;
  };

  demo = (targetPath: string): Promise<any> => {
    return this.requestDetectFaceApi(this.createDetectFaceParams(targetPath));
  };

  async requestDetectFaceApi(params: { [string]: any }): Promise<any> {
    const form = new FormData();
    Object.keys(params).forEach(key => {
      form.append(key, params[key]);
    });
    const res = await axios.post(
      [
        this.getDetectFaceApiUrl(),
        qs.stringify({
          ...this.baseParams,
          return_landmark: 1,
          // calculate_all: 1, // Standard API Key only
          return_attributes: this.config.deepLearningConfig.facePPFaceAttributes.join(
            ","
          )
        })
      ].join("?"),
      form,
      {
        headers: {
          // eslint-disable-next-line no-underscore-dangle
          "Content-Type": `multipart/form-data; boundary=${form._boundary}`
        }
      }
    );
    return res.data;
  }

  getDetectFaceApiUrl(): string {
    return `https://${[
      this.config.deepLearningConfig.facePPDomain,
      this.config.deepLearningConfig.facePPDetectApiPath
    ].join("/")}`;
  }
}
