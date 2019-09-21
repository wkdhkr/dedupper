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
              landmark: {
                mouth_upper_lip_left_contour2: {
                  y: 210,
                  x: 238
                },
                mouth_upper_lip_top: {
                  y: 212,
                  x: 254
                },
                mouth_upper_lip_left_contour1: {
                  y: 210,
                  x: 249
                },
                left_eye_upper_left_quarter: {
                  y: 139,
                  x: 227
                },
                left_eyebrow_lower_middle: {
                  y: 131,
                  x: 233
                },
                mouth_upper_lip_left_contour3: {
                  y: 213,
                  x: 240
                },
                right_eye_top: {
                  y: 148,
                  x: 289
                },
                left_eye_bottom: {
                  y: 148,
                  x: 233
                },
                right_eyebrow_lower_left_quarter: {
                  y: 139,
                  x: 289
                },
                right_eye_pupil: {
                  y: 152,
                  x: 286
                },
                mouth_lower_lip_right_contour1: {
                  y: 217,
                  x: 263
                },
                mouth_lower_lip_right_contour3: {
                  y: 223,
                  x: 260
                },
                mouth_lower_lip_right_contour2: {
                  y: 220,
                  x: 267
                },
                contour_chin: {
                  y: 251,
                  x: 244
                },
                contour_left9: {
                  y: 247,
                  x: 226
                },
                left_eye_lower_right_quarter: {
                  y: 149,
                  x: 240
                },
                mouth_lower_lip_top: {
                  y: 217,
                  x: 253
                },
                right_eyebrow_upper_middle: {
                  y: 136,
                  x: 297
                },
                left_eyebrow_left_corner: {
                  y: 134,
                  x: 212
                },
                right_eye_bottom: {
                  y: 156,
                  x: 288
                },
                contour_left7: {
                  y: 226,
                  x: 201
                },
                contour_left6: {
                  y: 213,
                  x: 192
                },
                contour_left5: {
                  y: 199,
                  x: 186
                },
                contour_left4: {
                  y: 183,
                  x: 184
                },
                contour_left3: {
                  y: 168,
                  x: 184
                },
                contour_left2: {
                  y: 152,
                  x: 186
                },
                contour_left1: {
                  y: 137,
                  x: 189
                },
                left_eye_lower_left_quarter: {
                  y: 146,
                  x: 225
                },
                contour_right1: {
                  y: 158,
                  x: 309
                },
                contour_right3: {
                  y: 184,
                  x: 304
                },
                contour_right2: {
                  y: 171,
                  x: 307
                },
                mouth_left_corner: {
                  y: 208,
                  x: 227
                },
                contour_right4: {
                  y: 196,
                  x: 299
                },
                contour_right7: {
                  y: 228,
                  x: 277
                },
                right_eyebrow_left_corner: {
                  y: 137,
                  x: 282
                },
                nose_right: {
                  y: 196,
                  x: 273
                },
                nose_tip: {
                  y: 191,
                  x: 261
                },
                contour_right5: {
                  y: 208,
                  x: 293
                },
                nose_contour_lower_middle: {
                  y: 201,
                  x: 257
                },
                left_eyebrow_lower_left_quarter: {
                  y: 132,
                  x: 222
                },
                mouth_lower_lip_left_contour3: {
                  y: 221,
                  x: 241
                },
                right_eye_right_corner: {
                  y: 156,
                  x: 299
                },
                right_eye_lower_right_quarter: {
                  y: 157,
                  x: 294
                },
                mouth_upper_lip_right_contour2: {
                  y: 213,
                  x: 266
                },
                right_eyebrow_lower_right_quarter: {
                  y: 144,
                  x: 302
                },
                left_eye_left_corner: {
                  y: 143,
                  x: 219
                },
                mouth_right_corner: {
                  y: 215,
                  x: 273
                },
                mouth_upper_lip_right_contour3: {
                  y: 216,
                  x: 263
                },
                right_eye_lower_left_quarter: {
                  y: 156,
                  x: 283
                },
                left_eyebrow_right_corner: {
                  y: 134,
                  x: 254
                },
                left_eyebrow_lower_right_quarter: {
                  y: 132,
                  x: 243
                },
                right_eye_center: {
                  y: 154,
                  x: 288
                },
                nose_left: {
                  y: 192,
                  x: 240
                },
                mouth_lower_lip_left_contour1: {
                  y: 214,
                  x: 240
                },
                left_eye_upper_right_quarter: {
                  y: 142,
                  x: 243
                },
                right_eyebrow_lower_middle: {
                  y: 141,
                  x: 296
                },
                left_eye_top: {
                  y: 139,
                  x: 236
                },
                left_eye_center: {
                  y: 145,
                  x: 234
                },
                contour_left8: {
                  y: 238,
                  x: 212
                },
                contour_right9: {
                  y: 247,
                  x: 258
                },
                right_eye_left_corner: {
                  y: 155,
                  x: 277
                },
                mouth_lower_lip_bottom: {
                  y: 224,
                  x: 251
                },
                left_eyebrow_upper_left_quarter: {
                  y: 126,
                  x: 221
                },
                left_eye_pupil: {
                  y: 143,
                  x: 233
                },
                right_eyebrow_upper_left_quarter: {
                  y: 135,
                  x: 290
                },
                contour_right8: {
                  y: 238,
                  x: 268
                },
                right_eyebrow_right_corner: {
                  y: 146,
                  x: 309
                },
                right_eye_upper_left_quarter: {
                  y: 150,
                  x: 282
                },
                left_eyebrow_upper_middle: {
                  y: 124,
                  x: 233
                },
                right_eyebrow_upper_right_quarter: {
                  y: 140,
                  x: 304
                },
                nose_contour_left1: {
                  y: 152,
                  x: 254
                },
                nose_contour_left2: {
                  y: 182,
                  x: 245
                },
                mouth_upper_lip_right_contour1: {
                  y: 212,
                  x: 259
                },
                nose_contour_right1: {
                  y: 154,
                  x: 271
                },
                nose_contour_right2: {
                  y: 186,
                  x: 271
                },
                mouth_lower_lip_left_contour2: {
                  y: 215,
                  x: 233
                },
                contour_right6: {
                  y: 219,
                  x: 286
                },
                nose_contour_right3: {
                  y: 199,
                  x: 266
                },
                nose_contour_left3: {
                  y: 197,
                  x: 248
                },
                left_eye_right_corner: {
                  y: 150,
                  x: 247
                },
                left_eyebrow_upper_right_quarter: {
                  y: 126,
                  x: 244
                },
                right_eye_upper_right_quarter: {
                  y: 151,
                  x: 295
                },
                mouth_upper_lip_bottom: {
                  y: 216,
                  x: 253
                }
              },
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
            landmark: {
              mouth_upper_lip_left_contour2: {
                y: 210,
                x: 238
              },
              mouth_upper_lip_top: {
                y: 212,
                x: 254
              },
              mouth_upper_lip_left_contour1: {
                y: 210,
                x: 249
              },
              left_eye_upper_left_quarter: {
                y: 139,
                x: 227
              },
              left_eyebrow_lower_middle: {
                y: 131,
                x: 233
              },
              mouth_upper_lip_left_contour3: {
                y: 213,
                x: 240
              },
              right_eye_top: {
                y: 148,
                x: 289
              },
              left_eye_bottom: {
                y: 148,
                x: 233
              },
              right_eyebrow_lower_left_quarter: {
                y: 139,
                x: 289
              },
              right_eye_pupil: {
                y: 152,
                x: 286
              },
              mouth_lower_lip_right_contour1: {
                y: 217,
                x: 263
              },
              mouth_lower_lip_right_contour3: {
                y: 223,
                x: 260
              },
              mouth_lower_lip_right_contour2: {
                y: 220,
                x: 267
              },
              contour_chin: {
                y: 251,
                x: 244
              },
              contour_left9: {
                y: 247,
                x: 226
              },
              left_eye_lower_right_quarter: {
                y: 149,
                x: 240
              },
              mouth_lower_lip_top: {
                y: 217,
                x: 253
              },
              right_eyebrow_upper_middle: {
                y: 136,
                x: 297
              },
              left_eyebrow_left_corner: {
                y: 134,
                x: 212
              },
              right_eye_bottom: {
                y: 156,
                x: 288
              },
              contour_left7: {
                y: 226,
                x: 201
              },
              contour_left6: {
                y: 213,
                x: 192
              },
              contour_left5: {
                y: 199,
                x: 186
              },
              contour_left4: {
                y: 183,
                x: 184
              },
              contour_left3: {
                y: 168,
                x: 184
              },
              contour_left2: {
                y: 152,
                x: 186
              },
              contour_left1: {
                y: 137,
                x: 189
              },
              left_eye_lower_left_quarter: {
                y: 146,
                x: 225
              },
              contour_right1: {
                y: 158,
                x: 309
              },
              contour_right3: {
                y: 184,
                x: 304
              },
              contour_right2: {
                y: 171,
                x: 307
              },
              mouth_left_corner: {
                y: 208,
                x: 227
              },
              contour_right4: {
                y: 196,
                x: 299
              },
              contour_right7: {
                y: 228,
                x: 277
              },
              right_eyebrow_left_corner: {
                y: 137,
                x: 282
              },
              nose_right: {
                y: 196,
                x: 273
              },
              nose_tip: {
                y: 191,
                x: 261
              },
              contour_right5: {
                y: 208,
                x: 293
              },
              nose_contour_lower_middle: {
                y: 201,
                x: 257
              },
              left_eyebrow_lower_left_quarter: {
                y: 132,
                x: 222
              },
              mouth_lower_lip_left_contour3: {
                y: 221,
                x: 241
              },
              right_eye_right_corner: {
                y: 156,
                x: 299
              },
              right_eye_lower_right_quarter: {
                y: 157,
                x: 294
              },
              mouth_upper_lip_right_contour2: {
                y: 213,
                x: 266
              },
              right_eyebrow_lower_right_quarter: {
                y: 144,
                x: 302
              },
              left_eye_left_corner: {
                y: 143,
                x: 219
              },
              mouth_right_corner: {
                y: 215,
                x: 273
              },
              mouth_upper_lip_right_contour3: {
                y: 216,
                x: 263
              },
              right_eye_lower_left_quarter: {
                y: 156,
                x: 283
              },
              left_eyebrow_right_corner: {
                y: 134,
                x: 254
              },
              left_eyebrow_lower_right_quarter: {
                y: 132,
                x: 243
              },
              right_eye_center: {
                y: 154,
                x: 288
              },
              nose_left: {
                y: 192,
                x: 240
              },
              mouth_lower_lip_left_contour1: {
                y: 214,
                x: 240
              },
              left_eye_upper_right_quarter: {
                y: 142,
                x: 243
              },
              right_eyebrow_lower_middle: {
                y: 141,
                x: 296
              },
              left_eye_top: {
                y: 139,
                x: 236
              },
              left_eye_center: {
                y: 145,
                x: 234
              },
              contour_left8: {
                y: 238,
                x: 212
              },
              contour_right9: {
                y: 247,
                x: 258
              },
              right_eye_left_corner: {
                y: 155,
                x: 277
              },
              mouth_lower_lip_bottom: {
                y: 224,
                x: 251
              },
              left_eyebrow_upper_left_quarter: {
                y: 126,
                x: 221
              },
              left_eye_pupil: {
                y: 143,
                x: 233
              },
              right_eyebrow_upper_left_quarter: {
                y: 135,
                x: 290
              },
              contour_right8: {
                y: 238,
                x: 268
              },
              right_eyebrow_right_corner: {
                y: 146,
                x: 309
              },
              right_eye_upper_left_quarter: {
                y: 150,
                x: 282
              },
              left_eyebrow_upper_middle: {
                y: 124,
                x: 233
              },
              right_eyebrow_upper_right_quarter: {
                y: 140,
                x: 304
              },
              nose_contour_left1: {
                y: 152,
                x: 254
              },
              nose_contour_left2: {
                y: 182,
                x: 245
              },
              mouth_upper_lip_right_contour1: {
                y: 212,
                x: 259
              },
              nose_contour_right1: {
                y: 154,
                x: 271
              },
              nose_contour_right2: {
                y: 186,
                x: 271
              },
              mouth_lower_lip_left_contour2: {
                y: 215,
                x: 233
              },
              contour_right6: {
                y: 219,
                x: 286
              },
              nose_contour_right3: {
                y: 199,
                x: 266
              },
              nose_contour_left3: {
                y: 197,
                x: 248
              },
              left_eye_right_corner: {
                y: 150,
                x: 247
              },
              left_eyebrow_upper_right_quarter: {
                y: 126,
                x: 244
              },
              right_eye_upper_right_quarter: {
                y: 151,
                x: 295
              },
              mouth_upper_lip_bottom: {
                y: 216,
                x: 253
              }
            },
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
