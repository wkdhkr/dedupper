/* eslint-disable camelcase */
// @flow
import type { Logger } from "log4js";
import { STATE_ACCEPTED, STATE_KEEPING } from "../../types/FileStates";
import SQLiteService from "./SQLiteService";
import { TYPE_IMAGE } from "../../types/ClassifyTypes";
import DeepLearningHelper from "../../helpers/DeepLearningHelper";
import type { Database } from "./SQLiteService";
import type { FacePPFace } from "../../types/DeepLearningTypes";
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
      const hitRow = await this.queryByHash(fileInfo);
      if (hitRow) {
        return true;
      }
      if (DeepLearningHelper.getFacePPResult(fileInfo.hash)) {
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
    $image_id: string
  ) => {
    const a = face.attributes;
    return {
      $hash,
      $image_id,
      $face_token: face.face_token,
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
      $gaussianblur: a.blur.gaussianblur,
      $motionblur: a.blur.motionblur,
      $blurness: a.blur.blurness,
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
    const facePPResult = DeepLearningHelper.pullFacePPResult(fileInfo.hash);
    if (!facePPResult) {
      throw new Error("no face++ result");
    }
    const rows = [];
    facePPResult.faces.forEach((face: FacePPFace) => {
      rows.push(
        this.createValueMap(face, $version, $hash, facePPResult.image_id)
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
            db.run(
              `delete from ${this.config.deepLearningConfig.facePPDbTableName} where hash = $hash`,
              { $hash },
              err => {
                db.close();
                if (err) {
                  reject(err);
                  return;
                }
                resolve();
              }
            );
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  queryByHash({ hash: $hash }: FileInfo): Promise<?(FacePPRow[])> {
    return new Promise((resolve, reject) => {
      if (!$hash) {
        resolve();
        return;
      }
      const db = this.ss.spawn(this.ss.detectDbFilePath(TYPE_IMAGE));
      db.serialize(async () => {
        await this.prepareTable(db);
        db.all(
          `select * from ${this.config.deepLearningConfig.facePPDbTableName} where hash = $hash`,
          { $hash },
          (err, rows: FacePPRow[]) => {
            if (!this.ss.handleEachError(db, err, reject)) {
              return;
            }
            resolve(rows);
          }
        );
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
              this.ss.handleEachError <
                FacePPRow >
                (db, err, reject, row, rows);
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

  insert = async (fileInfo: FileInfo, isReplace: boolean = true) => {
    const isInsertNeedless = await this.isInsertNeedless(fileInfo);
    if (isInsertNeedless) {
      return;
    }
    const rows = this.createRowsFromFileInfo(fileInfo);
    const db = this.ss.spawn(this.ss.detectDbFilePath(fileInfo.type));
    await Promise.all(
      rows.map(
        row =>
          new Promise((resolve, reject) => {
            db.serialize(async () => {
              try {
                await this.prepareTable(db);
                // this.log.info(`insert: row = ${JSON.stringify(row)}`);
                if (!this.config.dryrun) {
                  const columns = [
                    "hash",
                    "image_id",
                    "face_token",
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
                  db.run(
                    `insert${replaceStatement} into ${this.config.deepLearningConfig.facePPDbTableName} (${columns}) values (${values})`,
                    row,
                    err => {
                      db.close();
                      if (err) {
                        reject(err);
                        return;
                      }
                      resolve();
                    }
                  );
                } else {
                  resolve();
                }
              } catch (e) {
                reject(e);
              }
            });
          })
      )
    );
  };
}
