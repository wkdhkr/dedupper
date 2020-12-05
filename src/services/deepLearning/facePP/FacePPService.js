// @flow
// import cv from "opencv4nodejs-prebuilt";
import qs from "qs";
import axiosRetry from "axios-retry";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import typeof { Logger } from "log4js";
import LockHelper from "../../../helpers/LockHelper";
import FileSystemHelper from "../../../helpers/FileSystemHelper";
import DeepLearningHelper from "../../../helpers/DeepLearningHelper";
import OpenCVHelper from "../../../helpers/OpenCVHelper";
import MathHelper from "../../../helpers/MathHelper";
import JimpService from "../../fs/contents/JimpService";
import FileService from "../../fs/FileService";
import FileCacheService from "../../fs/FileCacheService";
import type {
  FacePPLandmark,
  FacePPFace,
  FacePPResult
} from "../../../types/DeepLearningTypes";
import type { FileInfo, Config } from "../../../types";
import FileNameMarkHelper from "../../../helpers/FileNameMarkHelper";
import { MARK_ERASE } from "../../../types/FileNameMarks";

axiosRetry(axios, { retries: 100, retryDelay: axiosRetry.exponentialDelay });

const cv = OpenCVHelper.loadOpenCv();

export default class FacePPService {
  resizedImageSize = -1;

  config: Config;

  baseParams: { [string]: string };

  jimpService: JimpService;

  fcs: FileCacheService;

  log: Logger;

  constructor(config: Config) {
    this.config = config;
    this.resizedImageSize = this.config.deepLearningConfig.facePPResizedImageSize;
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
    if (isFileSizeOver || isResolutionOver) {
      // const isJpeg = true;
      // 1024 * x = fileInfo.width
      // x = fileInfo.width / 1024
      const longerSide =
        fileInfo.width > fileInfo.height ? fileInfo.width : fileInfo.height;
      const ratio = isResolutionOver ? this.resizedImageSize / longerSide : 1;
      /*
      const buffer = await this.jimpService.convertToPngBuffer(
        fileInfo.from_path,
        isResolutionOver
          ? this.resizedImageSize
          : Math.max(fileInfo.width, fileInfo.height),
        isJpeg
      );
      */
      const escapePath = await FileSystemHelper.prepareEscapePath(
        fileInfo.from_path
      );
      try {
        let mat = await cv.imreadAsync(escapePath);
        mat = mat.resizeToMax(this.resizedImageSize);
        await FileSystemHelper.clearEscapePath(escapePath);

        // await cv.imwriteAsync("test2.jpg", mat);
        // await fs.writeFile("test.jpg", buffer);

        await FileSystemHelper.clearEscapePath(escapePath);
        return [ratio, cv.imencode(".jpg", mat)];
      } catch (e) {
        await FileSystemHelper.clearEscapePath(escapePath);
        throw e;
      }
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
    this.log.info(
      `face++: hash = ${fileInfo.hash}, result = ${JSON.stringify(result)}`
    );
    const isHit = this.config.deepLearningConfig.facePPJudgeFunction(result);
    const { faceMode } = this.config.deepLearningConfig;
    if (isHit) {
      const isAcceptable = faceMode === "allow";
      if (isAcceptable) {
        DeepLearningHelper.addFacePPResult(fileInfo.hash, result);
        return true;
      }
    }
    return faceMode === "disallow";
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

  restoreRatio = (result: FacePPResult, ratio: number) => {
    result.faces.forEach(face => {
      // eslint-disable-next-line no-param-reassign
      face.face_rectangle = {
        // ratio = 1024 / x
        // x * ratio = 1024
        // x = 1024 / ratio
        width: Math.round(face.face_rectangle.width / ratio),
        top: Math.round(face.face_rectangle.top / ratio),
        left: Math.round(face.face_rectangle.left / ratio),
        height: Math.round(face.face_rectangle.height / ratio)
      };
      const newLandmark: FacePPLandmark = ({}: any);
      // let count = 0;
      Object.keys(face.landmark).forEach(key => {
        // count += 1;
        newLandmark[key] = {
          x: Math.round(face.landmark[key].x / ratio),
          y: Math.round(face.landmark[key].y / ratio)
        };
      });
      // eslint-disable-next-line no-param-reassign
      face.landmark = newLandmark;
      // this.log.info(`landmark point count = ${count}`);
      // console.log(`landmark point count = ${count}`);
    });
    return result;
  };

  boundFaces = (mat: any, faces: FacePPFace[]) => {
    const green = new cv.Vec(0, 255, 0);
    const red = new cv.Vec(0, 0, 255);
    // const blue = new cv.Vec(255, 0, 0);
    const lineSetting = { color: green, thickness: 2 };
    const lineSettingRed = { color: red, thickness: 2 };
    // const lineSettingBlue = { color: blue, thickness: 2 };

    faces.forEach(face => {
      const fr = face.face_rectangle;
      const a = face.attributes;
      // normal
      mat.drawLine(
        new cv.Point(fr.left, fr.top),
        new cv.Point(fr.left, fr.top + fr.height),
        lineSetting
      );
      mat.drawLine(
        new cv.Point(fr.left, fr.top + fr.height),
        new cv.Point(fr.left + fr.width, fr.top + fr.height),
        lineSetting
      );
      mat.drawLine(
        new cv.Point(fr.left + fr.width, fr.top + fr.height),
        new cv.Point(fr.left + fr.width, fr.top),
        lineSetting
      );
      mat.drawLine(
        new cv.Point(fr.left + fr.width, fr.top),
        new cv.Point(fr.left, fr.top),
        lineSetting
      );

      // tilted
      const centerX = fr.left + parseInt(fr.width / 2, 10);
      const centerY = fr.top + parseInt(fr.height / 2, 10);
      const angle = a.headpose.roll_angle;
      mat.drawLine(
        new cv.Point(
          ...MathHelper.rotatePoint(fr.left, fr.top, centerX, centerY, angle)
        ),
        new cv.Point(
          ...MathHelper.rotatePoint(
            fr.left,
            fr.top + fr.height,
            centerX,
            centerY,
            angle
          )
        ),
        lineSettingRed
      );
      mat.drawLine(
        new cv.Point(
          ...MathHelper.rotatePoint(
            fr.left,
            fr.top + fr.height,
            centerX,
            centerY,
            angle
          )
        ),
        new cv.Point(
          ...MathHelper.rotatePoint(
            fr.left + fr.width,
            fr.top + fr.height,
            centerX,
            centerY,
            angle
          )
        ),
        lineSettingRed
      );
      mat.drawLine(
        new cv.Point(
          ...MathHelper.rotatePoint(
            fr.left + fr.width,
            fr.top + fr.height,
            centerX,
            centerY,
            angle
          )
        ),
        new cv.Point(
          ...MathHelper.rotatePoint(
            fr.left + fr.width,
            fr.top,
            centerX,
            centerY,
            angle
          )
        ),
        lineSettingRed
      );
      mat.drawLine(
        new cv.Point(
          ...MathHelper.rotatePoint(
            fr.left + fr.width,
            fr.top,
            centerX,
            centerY,
            angle
          )
        ),
        new cv.Point(
          ...MathHelper.rotatePoint(fr.left, fr.top, centerX, centerY, angle)
        ),
        lineSettingRed
      );

      const alpha = 0.4;
      cv.drawTextBox(
        mat,
        new cv.Point(fr.left, fr.top + fr.height),
        [
          {
            text: `beauty: ${a.beauty.male_score}`,
            fontSize: 0.5,
            color: green
          },
          {
            text: `age: ${a.age.value}`,
            fontSize: 0.5,
            color: green
          },
          {
            text: `ethnicity: ${a.ethnicity.value}`,
            fontSize: 0.5,
            color: green
          },
          {
            text: `facequality: ${a.facequality.value}`,
            fontSize: 0.5,
            color: green
          },
          {
            text: `blur: ${a.blur.blurness.value}`,
            fontSize: 0.5,
            color: green
          },
          {
            text: `motionblur: ${a.blur.motionblur.value}`,
            fontSize: 0.5,
            color: green
          },
          {
            text: `gaussianblur: ${a.blur.gaussianblur.value}`,
            fontSize: 0.5,
            color: green
          },
          {
            text: `gender: ${a.gender.value}`,
            fontSize: 0.5,
            color: green
          }
        ],
        alpha
      );
    });
    return mat;
  };

  demo = async (targetPath: string): Promise<FacePPResult> => {
    const fileInfo = await new FileService({
      ...this.config,
      path: targetPath
    }).collectFileInfo();
    const mat = await cv.imreadAsync(targetPath);
    const destPath = FileNameMarkHelper.mark(targetPath, new Set([MARK_ERASE]));
    const result = await this.detectFaces(fileInfo);
    await cv.imwriteAsync(
      destPath,
      this.drawLandmark(this.boundFaces(mat, result.faces), result.faces)
    );
    return result;
  };

  drawLandmark = (mat: any, faces: FacePPFace[]) => {
    const blue = new cv.Vec(255, 0, 0);
    faces.forEach(face => {
      Object.keys(face.landmark).forEach(key => {
        mat.drawCircle(
          new cv.Point(face.landmark[key].x, face.landmark[key].y),
          2,
          blue,
          -1
        );
      });
    });
    return mat;
  };

  async requestDetectFaceApi(
    buffer: Buffer,
    retryCount: number = 0
  ): Promise<FacePPResult> {
    const form = new FormData();
    form.append("image_file", buffer, { filename: "image" });
    await LockHelper.lockKey("facepp", true);
    try {
      const res: { data: FacePPResult } = await axios.post(
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
          timeout: 1000 * 30,
          headers: {
            // eslint-disable-next-line no-underscore-dangle
            "Content-Type": `multipart/form-data; boundary=${form._boundary}`
          }
        }
      );
      await LockHelper.unlockKey("facepp");
      // filter no attribute faces
      res.data.faces = res.data.faces.filter(face => face.attributes);
      res.data.face_num = res.data.faces.length;
      return res.data;
    } catch (e) {
      const newRetryCount = retryCount + 1;
      await LockHelper.unlockKey("facepp");
      if (newRetryCount === 100) {
        throw e;
      }
      this.log.warn(`face++: request failed. retryCount = ${newRetryCount}`);
      return this.requestDetectFaceApi(buffer, newRetryCount);
    }
  }

  getDetectFaceApiUrl(): string {
    return `https://${[
      this.config.deepLearningConfig.facePPDomain,
      this.config.deepLearningConfig.facePPDetectApiPath
    ].join("/")}`;
  }
}
