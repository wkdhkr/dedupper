/** @flow */
import { default as Subject } from "../../../src/services/db/FacePPDbService";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import DeepLearningHelper from "../../../src/helpers/DeepLearningHelper";

jest.setTimeout(40000);
describe(Subject.name, () => {
  let config;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });
  describe("query", () => {
    it("delete, insert, queryByHash", async () => {
      const insert = async filePath => {
        config.path = filePath;
        const fs = new FileService(config);
        const subject = new Subject(config);
        const fileInfo = await fs.collectFileInfo();
        await fs.prepareDir(config.dbBasePath, true);
        DeepLearningHelper.addFacePPResult(fileInfo.hash, {
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
        });

        await subject.deleteByHash(fileInfo);
        expect(await subject.insert(fileInfo)).toBeUndefined();
        return [subject, fileInfo];
      };
      const [subject, fileInfo] = await insert(
        `${TestHelper.sampleDir}firefox.jpg`
      );

      /*
      expect(await subject.queryByHash(fileInfo)).toEqual([
        {
          age: 23,
          beauty_female_score: 81.806,
          beauty_male_score: 80.179,
          blurness: 0.682,
          emotion_anger: 0.099,
          emotion_disgust: 0.009,
          emotion_fear: 0.003,
          emotion_happiness: 0.003,
          emotion_neutral: 99.778,
          emotion_sadness: 0.05,
          emotion_surprise: 0.059,
          ethnicity: "WHITE",
          eye_status_left_dark_glasses: 0.092,
          eye_status_left_no_glass_eye_close: 0,
          eye_status_left_no_glass_eye_open: 94.919,
          eye_status_left_normal_glass_eye_close: 0.002,
          eye_status_left_normal_glass_eye_open: 4.976,
          eye_status_left_occlusion: 0.011,
          eye_status_right_dark_glasses: 3.585,
          eye_status_right_no_glass_eye_close: 0.018,
          eye_status_right_no_glass_eye_open: 0.115,
          eye_status_right_normal_glass_eye_close: 0.057,
          eye_status_right_normal_glass_eye_open: 0.164,
          eye_status_right_occlusion: 96.061,
          eyegaze_left_position_x_coordinate: 0.619,
          eyegaze_left_position_y_coordinate: 0.359,
          eyegaze_left_vector_x: 0.136,
          eyegaze_left_vector_y: -0.261,
          eyegaze_left_vector_z: 0.956,
          eyegaze_right_position_x_coordinate: 0.628,
          eyegaze_right_position_y_coordinate: 0.058,
          eyegaze_right_vector_x: 0.382,
          eyegaze_right_vector_y: -0.325,
          eyegaze_right_vector_z: 0.865,
          face_num: 1,
          face_token: "abcdefg",
          facequality: 0.006,
          gaussianblur: 0.682,
          gender: "Female",
          glass: "None",
          hash:
            "f7680c47177100866759ac2029edc15bfd092d923f858547a5234c2ddbced40b",
          headpose_pitch_angle: -4.3394575,
          headpose_roll_angle: -8.798053,
          headpose_yaw_angle: -56.995735,
          height: 110,
          image_id: "xxxxxxxxxxxxxxxxx",
          left: 74,
          motionblur: 0.682,
          mouth_close: 99.884,
          mouth_open: 0.004,
          mouth_other_occlusion: 0.112,
          mouth_surgical_mask_or_respirator: 0,
          skin_acne: 19.277,
          skin_dark_circle: 11.382,
          skin_health: 4.653,
          skin_stain: 55.703,
          smile: 0.042,
          top: 132,
          version: "1",
          width: 110
        }
      ]);
      // await subject.deleteByHash(fileInfo);
      */
      expect(Subject.rowToResult(await subject.queryByHash(fileInfo))).toEqual({
        face_num: 1,
        faces: [
          {
            attributes: {
              age: { value: 23 },
              beauty: { female_score: 81.806, male_score: 80.179 },
              blur: {
                blurness: { threshold: 50, value: 0.682 },
                gaussianblur: { threshold: 50, value: 0.682 },
                motionblur: { threshold: 50, value: 0.682 }
              },
              emotion: {
                anger: 0.099,
                disgust: 0.009,
                fear: 0.003,
                happiness: 0.003,
                neutral: 99.778,
                sadness: 0.05,
                surprise: 0.059
              },
              ethnicity: { value: "WHITE" },
              eyegaze: {
                left_eye_gaze: {
                  position_x_coordinate: 0.619,
                  position_y_coordinate: 0.359,
                  vector_x_component: 0.136,
                  vector_y_component: -0.261,
                  vector_z_component: 0.956
                },
                right_eye_gaze: {
                  position_x_coordinate: 0.628,
                  position_y_coordinate: 0.058,
                  vector_x_component: 0.382,
                  vector_y_component: -0.325,
                  vector_z_component: 0.865
                }
              },
              eyestatus: {
                left_eye_status: {
                  dark_glasses: 0.092,
                  no_glass_eye_close: 0.002,
                  no_glass_eye_open: 94.919,
                  normal_glass_eye_close: 0.002,
                  normal_glass_eye_open: 4.976,
                  occlusion: 0.011
                },
                right_eye_status: {
                  dark_glasses: 3.585,
                  no_glass_eye_close: 0.057,
                  no_glass_eye_open: 0.115,
                  normal_glass_eye_close: 0.057,
                  normal_glass_eye_open: 0.164,
                  occlusion: 96.061
                }
              },
              facequality: { threshold: 70.1, value: 0.006 },
              gender: { value: "Female" },
              glass: { value: "None" },
              headpose: {
                pitch_angle: -4.3394575,
                roll_angle: -8.798053,
                yaw_angle: -56.995735
              },
              mouthstatus: {
                close: 99.884,
                open: 0.004,
                other_occlusion: 0.112,
                surgical_mask_or_respirator: 0
              },
              skinstatus: {
                acne: 19.277,
                dark_circle: 11.382,
                health: 4.653,
                stain: 55.703
              },
              smile: { threshold: 50, value: 0.042 }
            },
            face_rectangle: { height: 110, left: 74, top: 132, width: 110 },
            face_token: "abcdefg"
          }
        ],
        image_id: "xxxxxxxxxxxxxxxxx",
        request_id: "",
        time_used: 0
      });
    });
  });
});
