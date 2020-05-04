/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
// @flow
import type { Logger } from "log4js";
import { STATE_ACCEPTED, STATE_KEEPING } from "../../types/FileStates";
import SQLiteService from "./SQLiteService";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import DeepLearningHelper from "../../helpers/DeepLearningHelper";
import DbHelper from "../../helpers/DbHelper";
import type { Database } from "./SQLiteService";
import type {
  FacePPCoordinate,
  FacePPLandmark,
  FacePPResult,
  FacePPFace
} from "../../types/DeepLearningTypes";
import type { Config, FileInfo, FacePPRow } from "../../types";

export default class FacePPDbService {
  log: Logger;

  config: Config;

  ss: SQLiteService;

  constructor(config: Config) {
    this.log = config.getLogger(this);
    this.config = config;
    this.ss = new SQLiteService(config);
  }

  isInsertNeedless = async (fileInfo: FileInfo): Promise<boolean> => {
    if ([STATE_ACCEPTED, STATE_KEEPING].includes(fileInfo.state)) {
      const hitRows = await this.queryByHash(fileInfo);
      if (hitRows.length) {
        return true;
      }
      if (
        DeepLearningHelper.getFacePPResult(fileInfo.hash) ||
        fileInfo.facePP
      ) {
        return false;
      }
    }
    return true;
  };

  prepareTable = async (db: Database<FacePPRow>) =>
    this.ss.prepareTable(
      db,
      this.config.deepLearningConfig.facePPDbCreateTableSql,
      this.config.deepLearningConfig.facePPDbCreateIndexSqls
    );

  createValueMap = (
    face: FacePPFace,
    $version: number,
    $hash: string,
    $image_id: string,
    $face_num: number
  ) => {
    const a = face.attributes;
    return {
      $landmark: FacePPDbService.encodeLandmark(face.landmark),
      $hash,
      $image_id,
      $face_token: face.face_token,
      $face_num,
      $version,
      $emotion_sadness: a.emotion.sadness,
      $emotion_neutral: a.emotion.neutral,
      $emotion_disgust: a.emotion.disgust,
      $emotion_anger: a.emotion.anger,
      $emotion_surprise: a.emotion.surprise,
      $emotion_fear: a.emotion.fear,
      $emotion_happiness: a.emotion.happiness,
      $beauty_female_score: a.beauty.female_score,
      $beauty_male_score: a.beauty.male_score,
      $gender: a.gender.value,
      $age: a.age.value,
      $mouth_close: a.mouthstatus.close,
      $mouth_surgical_mask_or_respirator:
        a.mouthstatus.surgical_mask_or_respirator,
      $mouth_open: a.mouthstatus.open,
      $mouth_other_occlusion: a.mouthstatus.other_occlusion,
      $glass: a.glass.value,
      $skin_dark_circle: a.skinstatus.dark_circle,
      $skin_stain: a.skinstatus.stain,
      $skin_acne: a.skinstatus.acne,
      $skin_health: a.skinstatus.health,
      $headpose_yaw_angle: a.headpose.yaw_angle,
      $headpose_pitch_angle: a.headpose.pitch_angle,
      $headpose_roll_angle: a.headpose.roll_angle,
      $gaussianblur: a.blur.gaussianblur.value,
      $motionblur: a.blur.motionblur.value,
      $blurness: a.blur.blurness.value,
      $smile: a.smile.value,
      $eye_status_left_normal_glass_eye_open:
        a.eyestatus.left_eye_status.normal_glass_eye_open,
      $eye_status_left_normal_glass_eye_close:
        a.eyestatus.left_eye_status.normal_glass_eye_close,
      $eye_status_left_no_glass_eye_close:
        a.eyestatus.left_eye_status.no_glass_eye_close,
      $eye_status_left_no_glass_eye_open:
        a.eyestatus.left_eye_status.no_glass_eye_open,
      $eye_status_left_occlusion: a.eyestatus.left_eye_status.occlusion,
      $eye_status_left_dark_glasses: a.eyestatus.left_eye_status.dark_glasses,
      $eye_status_right_normal_glass_eye_open:
        a.eyestatus.right_eye_status.normal_glass_eye_open,
      $eye_status_right_normal_glass_eye_close:
        a.eyestatus.right_eye_status.normal_glass_eye_close,
      $eye_status_right_no_glass_eye_close:
        a.eyestatus.right_eye_status.no_glass_eye_close,
      $eye_status_right_no_glass_eye_open:
        a.eyestatus.right_eye_status.no_glass_eye_open,
      $eye_status_right_occlusion: a.eyestatus.right_eye_status.occlusion,
      $eye_status_right_dark_glasses: a.eyestatus.right_eye_status.dark_glasses,
      $eyegaze_right_position_x_coordinate:
        a.eyegaze.right_eye_gaze.position_x_coordinate,
      $eyegaze_right_position_y_coordinate:
        a.eyegaze.right_eye_gaze.position_y_coordinate,
      $eyegaze_right_vector_z: a.eyegaze.right_eye_gaze.vector_z_component,
      $eyegaze_right_vector_x: a.eyegaze.right_eye_gaze.vector_x_component,
      $eyegaze_right_vector_y: a.eyegaze.right_eye_gaze.vector_y_component,
      $eyegaze_left_position_x_coordinate:
        a.eyegaze.left_eye_gaze.position_x_coordinate,
      $eyegaze_left_position_y_coordinate:
        a.eyegaze.left_eye_gaze.position_y_coordinate,
      $eyegaze_left_vector_z: a.eyegaze.left_eye_gaze.vector_z_component,
      $eyegaze_left_vector_x: a.eyegaze.left_eye_gaze.vector_x_component,
      $eyegaze_left_vector_y: a.eyegaze.left_eye_gaze.vector_y_component,
      $facequality: a.facequality.value,
      $ethnicity: a.ethnicity.value,
      $top: face.face_rectangle.top,
      $left: face.face_rectangle.left,
      $width: face.face_rectangle.width,
      $height: face.face_rectangle.height
    };
  };

  createRowsFromFileInfo = (fileInfo: FileInfo) => {
    const $hash = fileInfo.hash;
    const $version = this.config.deepLearningConfig.facePPDbVersion;
    const facePPResult =
      DeepLearningHelper.pullFacePPResult(fileInfo.hash) ||
      (fileInfo.facePP || {}).result;
    if (!facePPResult) {
      throw new Error("no face++ result");
    }
    const rows = [];
    facePPResult.faces.forEach((face: FacePPFace) => {
      rows.push(
        this.createValueMap(
          face,
          $version,
          $hash,
          facePPResult.image_id,
          facePPResult.face_num
        )
      );
    });
    return rows;
  };

  deleteByHash({ hash: $hash }: FileInfo): Promise<?FacePPRow> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          if (!this.config.dryrun) {
            await DbHelper.beginSafe(db);
            db.run(
              `delete from ${this.config.deepLearningConfig.facePPDbTableName} where hash = $hash`,
              { $hash },
              err => {
                if (err) {
                  db.close();
                  reject(err);
                  return;
                }
                DbHelper.commitSafe(db, () => {
                  db.close();
                  resolve();
                });
              }
            );
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  queryByHash({ hash: $hash }: FileInfo): Promise<FacePPRow[]> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve([]);
        return;
      }
      const db = this.spawnDb();
      db.serialize(async () => {
        await this.prepareTable(db);
        try {
          db.all(
            `select * from ${this.config.deepLearningConfig.facePPDbTableName} where hash = $hash`,
            { $hash },
            (err, rows: FacePPRow[]) => {
              db.close();
              if (!this.ss.handleEachError(db, err, reject)) {
                return;
              }
              resolve(rows);
            }
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  all = (): Promise<FacePPRow[]> =>
    new Promise((resolve, reject) => {
      const db = this.spawnDb();
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.all(
            `select * from ${this.config.deepLearningConfig.facePPDbTableName}`,
            {},
            (err, rows: FacePPRow[]) => {
              db.close();
              if (err) {
                reject(err);
                return;
              }
              resolve(rows);
            }
          );
        } catch (e) {
          reject(e);
        }
      });
    });

  spawnDb = (): Database<FacePPRow> =>
    this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));

  queryByValue(column: string, $value: number | string): Promise<FacePPRow[]> {
    return new Promise((resolve, reject) => {
      const db = this.spawnDb();
      const rows = [];
      db.serialize(async () => {
        try {
          await this.prepareTable(db);
          db.each(
            `select * from ${this.config.deepLearningConfig.facePPDbTableName} where ${column} = $value`,
            { $value },
            (err, row: FacePPRow) => {
              this.ss.handleEachError<FacePPRow>(db, err, reject, row, rows);
            },
            err => {
              db.close();
              if (err) {
                reject(err);
                return;
              }
              resolve(rows);
            }
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  static decodeCoordinate = (s: string): FacePPCoordinate => {
    const [x, y] = s
      .split(FacePPDbService.SPLITTER_COORDINATE)
      .map(p => parseInt(p, 10));
    return { x, y };
  };

  static validateLandmark = (l?: FacePPLandmark) => {
    if (l) {
      if (Object.keys(l).length === 83) {
        return;
      }
    }

    throw new Error("invalid face++ landmark");
  };

  static encodeLandmark = (l: FacePPLandmark) => {
    FacePPDbService.validateLandmark(l);
    const s = FacePPDbService.SPLITTER_COORDINATE;
    return [
      [l.contour_chin.x, l.contour_chin.y].join(s),
      [l.contour_left1.x, l.contour_left1.y].join(s),
      [l.contour_left2.x, l.contour_left2.y].join(s),
      [l.contour_left3.x, l.contour_left3.y].join(s),
      [l.contour_left4.x, l.contour_left4.y].join(s),
      [l.contour_left5.x, l.contour_left5.y].join(s),
      [l.contour_left6.x, l.contour_left6.y].join(s),
      [l.contour_left7.x, l.contour_left7.y].join(s),
      [l.contour_left8.x, l.contour_left8.y].join(s),
      [l.contour_left9.x, l.contour_left9.y].join(s),
      [l.contour_right1.x, l.contour_right1.y].join(s),
      [l.contour_right2.x, l.contour_right2.y].join(s),
      [l.contour_right3.x, l.contour_right3.y].join(s),
      [l.contour_right4.x, l.contour_right4.y].join(s),
      [l.contour_right5.x, l.contour_right5.y].join(s),
      [l.contour_right6.x, l.contour_right6.y].join(s),
      [l.contour_right7.x, l.contour_right7.y].join(s),
      [l.contour_right8.x, l.contour_right8.y].join(s),
      [l.contour_right9.x, l.contour_right9.y].join(s),
      [l.left_eye_bottom.x, l.left_eye_bottom.y].join(s),
      [l.left_eye_center.x, l.left_eye_center.y].join(s),
      [l.left_eye_left_corner.x, l.left_eye_left_corner.y].join(s),
      [l.left_eye_lower_left_quarter.x, l.left_eye_lower_left_quarter.y].join(
        s
      ),
      [l.left_eye_lower_right_quarter.x, l.left_eye_lower_right_quarter.y].join(
        s
      ),
      [l.left_eye_pupil.x, l.left_eye_pupil.y].join(s),
      [l.left_eye_right_corner.x, l.left_eye_right_corner.y].join(s),
      [l.left_eye_top.x, l.left_eye_top.y].join(s),
      [l.left_eye_upper_left_quarter.x, l.left_eye_upper_left_quarter.y].join(
        s
      ),
      [l.left_eye_upper_right_quarter.x, l.left_eye_upper_right_quarter.y].join(
        s
      ),
      [l.left_eyebrow_left_corner.x, l.left_eyebrow_left_corner.y].join(s),
      [
        l.left_eyebrow_lower_left_quarter.x,
        l.left_eyebrow_lower_left_quarter.y
      ].join(s),
      [l.left_eyebrow_lower_middle.x, l.left_eyebrow_lower_middle.y].join(s),
      [
        l.left_eyebrow_lower_right_quarter.x,
        l.left_eyebrow_lower_right_quarter.y
      ].join(s),
      [l.left_eyebrow_right_corner.x, l.left_eyebrow_right_corner.y].join(s),
      [
        l.left_eyebrow_upper_left_quarter.x,
        l.left_eyebrow_upper_left_quarter.y
      ].join(s),
      [l.left_eyebrow_upper_middle.x, l.left_eyebrow_upper_middle.y].join(s),
      [
        l.left_eyebrow_upper_right_quarter.x,
        l.left_eyebrow_upper_right_quarter.y
      ].join(s),
      [l.mouth_left_corner.x, l.mouth_left_corner.y].join(s),
      [l.mouth_lower_lip_bottom.x, l.mouth_lower_lip_bottom.y].join(s),
      [
        l.mouth_lower_lip_left_contour1.x,
        l.mouth_lower_lip_left_contour1.y
      ].join(s),
      [
        l.mouth_lower_lip_left_contour2.x,
        l.mouth_lower_lip_left_contour2.y
      ].join(s),
      [
        l.mouth_lower_lip_left_contour3.x,
        l.mouth_lower_lip_left_contour3.y
      ].join(s),
      [
        l.mouth_lower_lip_right_contour1.x,
        l.mouth_lower_lip_right_contour1.y
      ].join(s),
      [
        l.mouth_lower_lip_right_contour2.x,
        l.mouth_lower_lip_right_contour2.y
      ].join(s),
      [
        l.mouth_lower_lip_right_contour3.x,
        l.mouth_lower_lip_right_contour3.y
      ].join(s),
      [l.mouth_lower_lip_top.x, l.mouth_lower_lip_top.y].join(s),
      [l.mouth_right_corner.x, l.mouth_right_corner.y].join(s),
      [l.mouth_upper_lip_bottom.x, l.mouth_upper_lip_bottom.y].join(s),
      [
        l.mouth_upper_lip_left_contour1.x,
        l.mouth_upper_lip_left_contour1.y
      ].join(s),
      [
        l.mouth_upper_lip_left_contour2.x,
        l.mouth_upper_lip_left_contour2.y
      ].join(s),
      [
        l.mouth_upper_lip_left_contour3.x,
        l.mouth_upper_lip_left_contour3.y
      ].join(s),
      [
        l.mouth_upper_lip_right_contour1.x,
        l.mouth_upper_lip_right_contour1.y
      ].join(s),
      [
        l.mouth_upper_lip_right_contour2.x,
        l.mouth_upper_lip_right_contour2.y
      ].join(s),
      [
        l.mouth_upper_lip_right_contour3.x,
        l.mouth_upper_lip_right_contour3.y
      ].join(s),
      [l.mouth_upper_lip_top.x, l.mouth_upper_lip_top.y].join(s),
      [l.nose_contour_left1.x, l.nose_contour_left1.y].join(s),
      [l.nose_contour_left2.x, l.nose_contour_left2.y].join(s),
      [l.nose_contour_left3.x, l.nose_contour_left3.y].join(s),
      [l.nose_contour_lower_middle.x, l.nose_contour_lower_middle.y].join(s),
      [l.nose_contour_right1.x, l.nose_contour_right1.y].join(s),
      [l.nose_contour_right2.x, l.nose_contour_right2.y].join(s),
      [l.nose_contour_right3.x, l.nose_contour_right3.y].join(s),
      [l.nose_left.x, l.nose_left.y].join(s),
      [l.nose_right.x, l.nose_right.y].join(s),
      [l.nose_tip.x, l.nose_tip.y].join(s),
      [l.right_eye_bottom.x, l.right_eye_bottom.y].join(s),
      [l.right_eye_center.x, l.right_eye_center.y].join(s),
      [l.right_eye_left_corner.x, l.right_eye_left_corner.y].join(s),
      [l.right_eye_lower_left_quarter.x, l.right_eye_lower_left_quarter.y].join(
        s
      ),
      [
        l.right_eye_lower_right_quarter.x,
        l.right_eye_lower_right_quarter.y
      ].join(s),
      [l.right_eye_pupil.x, l.right_eye_pupil.y].join(s),
      [l.right_eye_right_corner.x, l.right_eye_right_corner.y].join(s),
      [l.right_eye_top.x, l.right_eye_top.y].join(s),
      [l.right_eye_upper_left_quarter.x, l.right_eye_upper_left_quarter.y].join(
        s
      ),
      [
        l.right_eye_upper_right_quarter.x,
        l.right_eye_upper_right_quarter.y
      ].join(s),
      [l.right_eyebrow_left_corner.x, l.right_eyebrow_left_corner.y].join(s),
      [
        l.right_eyebrow_lower_left_quarter.x,
        l.right_eyebrow_lower_left_quarter.y
      ].join(s),
      [l.right_eyebrow_lower_middle.x, l.right_eyebrow_lower_middle.y].join(s),
      [
        l.right_eyebrow_lower_right_quarter.x,
        l.right_eyebrow_lower_right_quarter.y
      ].join(s),
      [l.right_eyebrow_right_corner.x, l.right_eyebrow_right_corner.y].join(s),
      [
        l.right_eyebrow_upper_left_quarter.x,
        l.right_eyebrow_upper_left_quarter.y
      ].join(s),
      [l.right_eyebrow_upper_middle.x, l.right_eyebrow_upper_middle.y].join(s),
      [
        l.right_eyebrow_upper_right_quarter.x,
        l.right_eyebrow_upper_right_quarter.y
      ].join(s)
    ].join(FacePPDbService.SPLITTER_LANDMARK);
  };

  static SPLITTER_LANDMARK = ";";

  static SPLITTER_COORDINATE = ",";

  static decodeLandmark = (rawLandmark: string): FacePPLandmark => {
    const l = rawLandmark.split(FacePPDbService.SPLITTER_LANDMARK);
    let p = 0;
    return {
      contour_chin: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left1: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left2: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left3: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left4: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left5: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left6: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left7: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left8: FacePPDbService.decodeCoordinate(l[p++]),
      contour_left9: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right1: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right2: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right3: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right4: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right5: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right6: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right7: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right8: FacePPDbService.decodeCoordinate(l[p++]),
      contour_right9: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_bottom: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_center: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_left_corner: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_lower_left_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_lower_right_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_pupil: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_right_corner: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_top: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_upper_left_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      left_eye_upper_right_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      left_eyebrow_left_corner: FacePPDbService.decodeCoordinate(l[p++]),
      left_eyebrow_lower_left_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      left_eyebrow_lower_middle: FacePPDbService.decodeCoordinate(l[p++]),
      left_eyebrow_lower_right_quarter: FacePPDbService.decodeCoordinate(
        l[p++]
      ),
      left_eyebrow_right_corner: FacePPDbService.decodeCoordinate(l[p++]),
      left_eyebrow_upper_left_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      left_eyebrow_upper_middle: FacePPDbService.decodeCoordinate(l[p++]),
      left_eyebrow_upper_right_quarter: FacePPDbService.decodeCoordinate(
        l[p++]
      ),
      mouth_left_corner: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_bottom: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_left_contour1: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_left_contour2: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_left_contour3: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_right_contour1: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_right_contour2: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_right_contour3: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_lower_lip_top: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_right_corner: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_bottom: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_left_contour1: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_left_contour2: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_left_contour3: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_right_contour1: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_right_contour2: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_right_contour3: FacePPDbService.decodeCoordinate(l[p++]),
      mouth_upper_lip_top: FacePPDbService.decodeCoordinate(l[p++]),
      nose_contour_left1: FacePPDbService.decodeCoordinate(l[p++]),
      nose_contour_left2: FacePPDbService.decodeCoordinate(l[p++]),
      nose_contour_left3: FacePPDbService.decodeCoordinate(l[p++]),
      nose_contour_lower_middle: FacePPDbService.decodeCoordinate(l[p++]),
      nose_contour_right1: FacePPDbService.decodeCoordinate(l[p++]),
      nose_contour_right2: FacePPDbService.decodeCoordinate(l[p++]),
      nose_contour_right3: FacePPDbService.decodeCoordinate(l[p++]),
      nose_left: FacePPDbService.decodeCoordinate(l[p++]),
      nose_right: FacePPDbService.decodeCoordinate(l[p++]),
      nose_tip: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_bottom: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_center: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_left_corner: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_lower_left_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_lower_right_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_pupil: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_right_corner: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_top: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_upper_left_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      right_eye_upper_right_quarter: FacePPDbService.decodeCoordinate(l[p++]),
      right_eyebrow_left_corner: FacePPDbService.decodeCoordinate(l[p++]),
      right_eyebrow_lower_left_quarter: FacePPDbService.decodeCoordinate(
        l[p++]
      ),
      right_eyebrow_lower_middle: FacePPDbService.decodeCoordinate(l[p++]),
      right_eyebrow_lower_right_quarter: FacePPDbService.decodeCoordinate(
        l[p++]
      ),
      right_eyebrow_right_corner: FacePPDbService.decodeCoordinate(l[p++]),
      right_eyebrow_upper_left_quarter: FacePPDbService.decodeCoordinate(
        l[p++]
      ),
      right_eyebrow_upper_middle: FacePPDbService.decodeCoordinate(l[p++]),
      right_eyebrow_upper_right_quarter: FacePPDbService.decodeCoordinate(
        l[p++]
      )
    };
  };

  static rowToResult = (rows: FacePPRow[]): ?FacePPResult => {
    if (!rows.length) {
      return null;
    }
    return {
      time_used: 0,
      request_id: "",
      image_id: rows[0].image_id,
      face_num: rows[0].face_num,
      faces: rows.map(row => ({
        landmark: FacePPDbService.decodeLandmark(row.landmark),
        attributes: {
          emotion: {
            sadness: row.emotion_sadness,
            neutral: row.emotion_neutral,
            disgust: row.emotion_disgust,
            anger: row.emotion_anger,
            surprise: row.emotion_surprise,
            fear: row.emotion_fear,
            happiness: row.emotion_happiness
          },
          beauty: {
            female_score: row.beauty_female_score,
            male_score: row.beauty_male_score
          },
          gender: {
            value: row.gender
          },
          age: {
            value: row.age
          },
          mouthstatus: {
            close: row.mouth_close,
            surgical_mask_or_respirator: row.mouth_surgical_mask_or_respirator,
            open: row.mouth_open,
            other_occlusion: row.mouth_other_occlusion
          },
          glass: {
            value: row.glass
          },
          skinstatus: {
            dark_circle: row.skin_dark_circle,
            stain: row.skin_stain,
            acne: row.skin_acne,
            health: row.skin_health
          },
          headpose: {
            yaw_angle: row.headpose_yaw_angle,
            pitch_angle: row.headpose_pitch_angle,
            roll_angle: row.headpose_roll_angle
          },
          blur: {
            blurness: {
              threshold: 50,
              value: row.blurness
            },
            motionblur: {
              threshold: 50,
              value: row.motionblur
            },
            gaussianblur: {
              threshold: 50,
              value: row.gaussianblur
            }
          },
          smile: {
            threshold: 50,
            value: row.smile
          },
          eyestatus: {
            left_eye_status: {
              normal_glass_eye_open: row.eye_status_left_normal_glass_eye_open,
              no_glass_eye_close: row.eye_status_left_normal_glass_eye_close,
              occlusion: row.eye_status_left_occlusion,
              no_glass_eye_open: row.eye_status_left_no_glass_eye_open,
              normal_glass_eye_close:
                row.eye_status_left_normal_glass_eye_close,
              dark_glasses: row.eye_status_left_dark_glasses
            },
            right_eye_status: {
              normal_glass_eye_open: row.eye_status_right_normal_glass_eye_open,
              no_glass_eye_close: row.eye_status_right_normal_glass_eye_close,
              occlusion: row.eye_status_right_occlusion,
              no_glass_eye_open: row.eye_status_right_no_glass_eye_open,
              normal_glass_eye_close:
                row.eye_status_right_normal_glass_eye_close,
              dark_glasses: row.eye_status_right_dark_glasses
            }
          },
          facequality: {
            threshold: 70.1,
            value: row.facequality
          },
          ethnicity: {
            value: row.ethnicity
          },
          eyegaze: {
            right_eye_gaze: {
              position_x_coordinate: row.eyegaze_right_position_x_coordinate,
              vector_z_component: row.eyegaze_right_vector_z,
              vector_x_component: row.eyegaze_right_vector_x,
              vector_y_component: row.eyegaze_right_vector_y,
              position_y_coordinate: row.eyegaze_right_position_y_coordinate
            },
            left_eye_gaze: {
              position_x_coordinate: row.eyegaze_left_position_x_coordinate,
              vector_z_component: row.eyegaze_left_vector_z,
              vector_x_component: row.eyegaze_left_vector_x,
              vector_y_component: row.eyegaze_left_vector_y,
              position_y_coordinate: row.eyegaze_left_position_y_coordinate
            }
          }
        },
        face_rectangle: {
          width: row.width,
          top: row.top,
          left: row.left,
          height: row.height
        },
        face_token: row.face_token
      }))
    };
  };

  insert = async (
    fileInfo: FileInfo,
    isReplace: boolean = true,
    force: boolean = false
  ) => {
    const isInsertNeedless = force
      ? false
      : await this.isInsertNeedless(fileInfo);
    if (isInsertNeedless) {
      return;
    }
    const rows = this.createRowsFromFileInfo(fileInfo);
    const db = this.spawnDb();
    // prevent sqlite conflict
    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve, reject) => {
        db.serialize(async () => {
          try {
            await this.prepareTable(db);
            // this.log.info(`insert: row = ${JSON.stringify(row)}`);
            if (!this.config.dryrun) {
              const columns = [
                "hash",
                "image_id",
                "face_token",
                "face_num",
                "landmark",
                "version",
                "emotion_sadness",
                "emotion_neutral",
                "emotion_disgust",
                "emotion_anger",
                "emotion_surprise",
                "emotion_fear",
                "emotion_happiness",
                "beauty_female_score",
                "beauty_male_score",
                "gender",
                "age",
                "mouth_close",
                "mouth_surgical_mask_or_respirator",
                "mouth_open",
                "mouth_other_occlusion",
                "glass",
                "skin_dark_circle",
                "skin_stain",
                "skin_acne",
                "skin_health",
                "headpose_yaw_angle",
                "headpose_pitch_angle",
                "headpose_roll_angle",
                "gaussianblur",
                "motionblur",
                "blurness",
                "smile",
                "eye_status_left_normal_glass_eye_open",
                "eye_status_left_normal_glass_eye_close",
                "eye_status_left_no_glass_eye_close",
                "eye_status_left_no_glass_eye_open",
                "eye_status_left_occlusion",
                "eye_status_left_dark_glasses",
                "eye_status_right_normal_glass_eye_open",
                "eye_status_right_normal_glass_eye_close",
                "eye_status_right_no_glass_eye_close",
                "eye_status_right_no_glass_eye_open",
                "eye_status_right_occlusion",
                "eye_status_right_dark_glasses",
                "eyegaze_right_position_x_coordinate",
                "eyegaze_right_position_y_coordinate",
                "eyegaze_right_vector_z",
                "eyegaze_right_vector_x",
                "eyegaze_right_vector_y",
                "eyegaze_left_position_x_coordinate",
                "eyegaze_left_position_y_coordinate",
                "eyegaze_left_vector_z",
                "eyegaze_left_vector_x",
                "eyegaze_left_vector_y",
                "facequality",
                "ethnicity",
                "top",
                "left",
                "width",
                "height"
              ].join(",");
              const values = [
                "$hash",
                "$image_id",
                "$face_token",
                "$face_num",
                "$landmark",
                "$version",
                "$emotion_sadness",
                "$emotion_neutral",
                "$emotion_disgust",
                "$emotion_anger",
                "$emotion_surprise",
                "$emotion_fear",
                "$emotion_happiness",
                "$beauty_female_score",
                "$beauty_male_score",
                "$gender",
                "$age",
                "$mouth_close",
                "$mouth_surgical_mask_or_respirator",
                "$mouth_open",
                "$mouth_other_occlusion",
                "$glass",
                "$skin_dark_circle",
                "$skin_stain",
                "$skin_acne",
                "$skin_health",
                "$headpose_yaw_angle",
                "$headpose_pitch_angle",
                "$headpose_roll_angle",
                "$gaussianblur",
                "$motionblur",
                "$blurness",
                "$smile",
                "$eye_status_left_normal_glass_eye_open",
                "$eye_status_left_normal_glass_eye_close",
                "$eye_status_left_no_glass_eye_close",
                "$eye_status_left_no_glass_eye_open",
                "$eye_status_left_occlusion",
                "$eye_status_left_dark_glasses",
                "$eye_status_right_normal_glass_eye_open",
                "$eye_status_right_normal_glass_eye_close",
                "$eye_status_right_no_glass_eye_close",
                "$eye_status_right_no_glass_eye_open",
                "$eye_status_right_occlusion",
                "$eye_status_right_dark_glasses",
                "$eyegaze_right_position_x_coordinate",
                "$eyegaze_right_position_y_coordinate",
                "$eyegaze_right_vector_z",
                "$eyegaze_right_vector_x",
                "$eyegaze_right_vector_y",
                "$eyegaze_left_position_x_coordinate",
                "$eyegaze_left_position_y_coordinate",
                "$eyegaze_left_vector_z",
                "$eyegaze_left_vector_x",
                "$eyegaze_left_vector_y",
                "$facequality",
                "$ethnicity",
                "$top",
                "$left",
                "$width",
                "$height"
              ].join(",");

              const replaceStatement = isReplace ? " or replace" : "";
              await DbHelper.beginSafe(db);
              db.run(
                `insert${replaceStatement} into ${this.config.deepLearningConfig.facePPDbTableName} (${columns}) values (${values})`,
                row,
                err => {
                  if (err) {
                    db.close();
                    reject(err);
                    return;
                  }
                  DbHelper.commitSafe(db, () => {
                    db.close();
                    resolve();
                  });
                }
              );
            } else {
              resolve();
            }
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  };
}
