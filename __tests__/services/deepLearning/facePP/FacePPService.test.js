// @flow

import type { FileInfo } from "../../../../src/types";
import TestHelper from "../../../../src/helpers/TestHelper";
import FileService from "../../../../src/services/fs/FileService";

jest.setTimeout(60000);
describe("FacePPService", () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });

  const createFileInfo = (targetPath: string): Promise<FileInfo> =>
    new FileService({ ...config, path: targetPath }).collectFileInfo();

  const loadSubject = async () =>
    import("../../../../src/services/deepLearning/facePP/FacePPService");

  describe("isAcceptable", () => {
    it("true", async () => {
      jest.mock("axios", () => ({
        post: () =>
          Promise.resolve({
            data: {
              time_used: 209,
              faces: [
                {
                  attributes: {
                    emotion: {
                      sadness: 0.05,
                      neutral: 99.778,
                      disgust: 0.009,
                      anger: 0.099,
                      surprise: 0.059,
                      fear: 0.003,
                      happiness: 0.003
                    },
                    beauty: {
                      female_score: 81.806,
                      male_score: 80.179
                    },
                    gender: {
                      value: "Female"
                    },
                    age: {
                      value: 23
                    },
                    mouthstatus: {
                      close: 99.884,
                      surgical_mask_or_respirator: 0,
                      open: 0.004,
                      other_occlusion: 0.112
                    },
                    glass: {
                      value: "None"
                    },
                    skinstatus: {
                      dark_circle: 11.382,
                      stain: 55.703,
                      acne: 19.277,
                      health: 4.653
                    },
                    headpose: {
                      yaw_angle: -56.995735,
                      pitch_angle: -4.3394575,
                      roll_angle: -8.798053
                    },
                    blur: {
                      blurness: {
                        threshold: 50,
                        value: 0.682
                      },
                      motionblur: {
                        threshold: 50,
                        value: 0.682
                      },
                      gaussianblur: {
                        threshold: 50,
                        value: 0.682
                      }
                    },
                    smile: {
                      threshold: 50,
                      value: 0.042
                    },
                    eyestatus: {
                      left_eye_status: {
                        normal_glass_eye_open: 4.976,
                        no_glass_eye_close: 0,
                        occlusion: 0.011,
                        no_glass_eye_open: 94.919,
                        normal_glass_eye_close: 0.002,
                        dark_glasses: 0.092
                      },
                      right_eye_status: {
                        normal_glass_eye_open: 0.164,
                        no_glass_eye_close: 0.018,
                        occlusion: 96.061,
                        no_glass_eye_open: 0.115,
                        normal_glass_eye_close: 0.057,
                        dark_glasses: 3.585
                      }
                    },
                    facequality: {
                      threshold: 70.1,
                      value: 0.006
                    },
                    ethnicity: {
                      value: "WHITE"
                    },
                    eyegaze: {
                      right_eye_gaze: {
                        position_x_coordinate: 0.628,
                        vector_z_component: 0.865,
                        vector_x_component: 0.382,
                        vector_y_component: -0.325,
                        position_y_coordinate: 0.058
                      },
                      left_eye_gaze: {
                        position_x_coordinate: 0.619,
                        vector_z_component: 0.956,
                        vector_x_component: 0.136,
                        vector_y_component: -0.261,
                        position_y_coordinate: 0.359
                      }
                    }
                  },
                  face_rectangle: {
                    width: 110,
                    top: 132,
                    left: 74,
                    height: 110
                  },
                  face_token: "abcdefg"
                }
              ],
              image_id: "xxxxxxxxxxxxxxxxx",
              request_id: "1568628706,xxxxxxxxxxxxxx",
              face_num: 1
            }
          })
      }));
      const { default: FacePPService } = await loadSubject();
      const subject = new FacePPService(config);
      const fileInfo: FileInfo = await createFileInfo(
        TestHelper.sampleFile.image.jpg.default
      );
      expect(await subject.isAcceptable(fileInfo)).toBeTruthy();
      fileInfo.facePP = ({ version: 2 }: any);
      fileInfo.size = 9999999999;
      expect(await subject.isAcceptable(fileInfo)).toBeTruthy();
      fileInfo.facePP = ({ version: 3 }: any);
      fileInfo.size = 1;
      fileInfo.width = 9999;
      expect(await subject.isAcceptable(fileInfo)).toBeTruthy();
      fileInfo.facePP = ({ version: 4 }: any);
      fileInfo.width = 1;
      fileInfo.height = 9999;
      expect(await subject.isAcceptable(fileInfo)).toBeTruthy();
    });
    it("false", async () => {
      jest.mock("axios", () => ({
        post: () =>
          Promise.resolve({
            data: {
              time_used: 209,
              faces: [],
              image_id: "xxxxxxxxxxxxxxxxx",
              request_id: "1568628706,xxxxxxxxxxxxxx",
              face_num: 0
            }
          })
      }));
      const { default: FacePPService } = await loadSubject();
      const subject = new FacePPService(config);
      const fileInfo: FileInfo = await createFileInfo(
        TestHelper.sampleFile.image.jpg.default
      );
      expect(await subject.isAcceptable(fileInfo)).toBeFalsy();
    });
  });
});
