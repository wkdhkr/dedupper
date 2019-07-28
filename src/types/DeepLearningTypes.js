// @flow
export type FaceDirect = "frontal" | "profile";
export type GenderClass = "M" | "F";
export type AgeClass =
  | "(4, 6)"
  | "(8, 12)"
  | "(15, 20)"
  | "(25, 32)"
  | "(38, 43)"
  | "(48, 53)"
  | "(60, 100)";

export type DeepLearningMode = "disallow" | "allow" | "none";
export type DeepLearningLogicalOperation = "and" | "or";
export type NsfwType = "nsfw" | "sfw";
export type FaceApiModelName =
  | "face_expression"
  | "age_gender_model"
  | "face_landmark_68"
  | "face_landmark_68_tiny"
  | "face_recognition"
  | "mtcnn"
  | "ssd_mobilenetv1"
  | "tiny_face_detector";

export const MODEL_FACE_EXPRESSION = "face_expression";
export const MODEL_AGE_GENDER = "age_gender_model";
export const MODEL_FACE_LANDMARK_68 = "face_landmark_68";
export const MODEL_FACE_LANDMARK_68_TINY = "face_landmark_68_tiny";
export const MODEL_FACE_RECOGNITION = "face_recognition";
export const MODEL_MTCNN = "face_mtcnn";
export const MODEL_SSD_MOBILENETV1 = "ssd_mobilenetv1";
export const MODEL_TINY_FACE_DETECTOR = "tiny_face_detector";
