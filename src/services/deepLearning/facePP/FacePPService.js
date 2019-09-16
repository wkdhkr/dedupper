// @flow
import qs from "qs";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import type { Logger } from "log4js";
import DeepLearningHelper from "../../../helpers/DeepLearningHelper";
import JimpService from "../../fs/contents/JimpService";
import FileService from "../../fs/FileService";
import FileCacheService from "../../fs/FileCacheService";
import type { FacePPResult } from "../../../types/DeepLearningTypes";
import type { FileInfo, Config } from "../../../types";

export default class FacePPService {
  resizedImageSize = 1024;

  config: Config;

  baseParams: { [string]: string };

  jimpService: JimpService;

  fcs: FileCacheService;

  log: Logger;

  constructor(config: Config) {
    this.config = config;
    this.jimpService = new JimpService(this.config);
    this.fcs = new FileCacheService(config);
    this.log = this.config.getLogger(this);
    this.baseParams = {
      api_key: this.config.deepLearningConfig.facePPApiKey,
      api_secret: this.config.deepLearningConfig.facePPApiSecret
    };
  }

  preparePostImageBuffer = async (
    fileInfo: FileInfo
  ): Promise<[number, Buffer]> => {
    const isFileSizeOver = fileInfo.size > 2 * 1024 * 1024;
    const isResolutionOver =
      fileInfo.width > this.resizedImageSize ||
      fileInfo.height > this.resizedImageSize;
    const isJpeg = true;
    if (isFileSizeOver || isResolutionOver) {
      // 1024 * x = fileInfo.width
      // x = fileInfo.width / 1024
      const longerSide =
        fileInfo.width > fileInfo.height ? fileInfo.width : fileInfo.height;
      const ratio = isResolutionOver ? longerSide / this.resizedImageSize : 1;
      const buffer = await this.jimpService.convertToPngBuffer(
        fileInfo.from_path,
        isResolutionOver
          ? this.resizedImageSize
          : Math.max(fileInfo.width, fileInfo.height),
        isJpeg
      );

      return [ratio, buffer];
    }
    return [1, await fs.readFile(fileInfo.from_path)];
  };

  isAcceptable = async (fileInfo: FileInfo): Promise<boolean> => {
    const cachedResult = this.readResultsFromFileCache(fileInfo);
    let result = cachedResult;
    if (!result) {
      result = await this.detectFaces(fileInfo);
      // eslint-disable-next-line no-param-reassign
      fileInfo.facePP = {
        result,
        version: this.config.deepLearningConfig.facePPDbVersion
      };
      await this.fcs.write(fileInfo);
    } else {
      this.log.debug(`face++: cache hit! path = ${fileInfo.from_path}`);
    }
    this.log.info(`face++: result = ${JSON.stringify(result)}`);
    const isAcceptable = this.config.deepLearningConfig.facePPJudgeFunction(
      result
    );
    if (isAcceptable) {
      DeepLearningHelper.addFacePPResult(fileInfo.hash, result);
    }
    return isAcceptable;
  };

  readResultsFromFileCache = (fileInfo: FileInfo): ?FacePPResult => {
    if (fileInfo.facePP) {
      if (
        fileInfo.facePP.version ===
        this.config.deepLearningConfig.facePPDbVersion
      ) {
        return fileInfo.facePP.result;
      }
    }
    return null;
  };

  async detectFaces(fileInfo: FileInfo): Promise<FacePPResult> {
    const [ratio, buffer] = await this.preparePostImageBuffer(fileInfo);

    const result = await this.requestDetectFaceApi(buffer);
    return this.restoreRatio(result, ratio);
  }

  createDetectFaceParams = (buffer: Buffer): {} => {
    const params = {
      image_file: buffer
    };
    return params;
  };

  restoreRatio = (result: FacePPResult, ratio: number) => {
    result.faces.forEach(face => {
      // eslint-disable-next-line no-param-reassign
      face.face_rectangle = {
        // ratio = 1024 / x
        // x * ratio = 1024
        // x = 1024 / ratio
        width: face.face_rectangle.width / ratio,
        top: face.face_rectangle.top / ratio,
        left: face.face_rectangle.left / ratio,
        height: face.face_rectangle.height / ratio
      };
    });
    return result;
  };

  demo = async (targetPath: string): Promise<FacePPResult> => {
    const fileInfo = await new FileService({
      ...this.config,
      path: targetPath
    }).collectFileInfo();
    return this.detectFaces(fileInfo);
  };

  async requestDetectFaceApi(buffer: Buffer): Promise<FacePPResult> {
    const form = new FormData();
    form.append("image_file", buffer, { filename: "image" });
    const res: { data: FacePPResult } = await axios.post(
      [
        this.getDetectFaceApiUrl(),
        qs.stringify({
          ...this.baseParams,
          // return_landmark: 1,
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
