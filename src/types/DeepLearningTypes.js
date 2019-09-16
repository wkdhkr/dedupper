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

export const CLASS_NAME_PORN = "Porn";
export const CLASS_NAME_SEXY = "Sexy";
export const CLASS_NAME_NEUTRAL = "Neutral";
export const CLASS_NAME_HENTAI = "Hentai";
export const CLASS_NAME_DRAWING = "Drawing";

export type NsfwJsClassName =
  | "Porn"
  | "Sexy"
  | "Hentai"
  | "Neutral"
  | "Drawing";

export type NsfwJsResult = {
  className: NsfwJsClassName,
  probability: number
};

// see https://console.faceplusplus.com/documents/5679127

export type FacePPEyeGaze = {
  position_x_coordinate: number,
  vector_z_component: number,
  vector_x_component: number,
  vector_y_component: number,
  position_y_coordinate: number
};

export type FacePPValue = {
  threshold: number,
  value: number
};

export type FacePPEyeStatus = {
  normal_glass_eye_open: number,
  no_glass_eye_close: number,
  occlusion: number,
  no_glass_eye_open: number,
  normal_glass_eye_close: number,
  dark_glasses: number
};

export type FacePPFace = {
  // landmark: { [string]: { x: number, y: number } },
  attributes: {
    emotion: {
      sadness: number,
      neutral: number,
      disgust: number,
      anger: number,
      surprise: number,
      fear: number,
      happiness: number
    },
    beauty: {
      female_score: number,
      male_score: number
    },
    gender: {
      value: "Female" | "Male"
    },
    age: {
      value: number
    },
    mouthstatus: {
      close: number,
      surgical_mask_or_respirator: number,
      open: number,
      other_occlusion: number
    },
    glass: {
      value: "None" | "Dark" | "Normal"
    },
    skinstatus: {
      dark_circle: number,
      stain: number,
      acne: number,
      health: number
    },
    headpose: {
      yaw_angle: number,
      pitch_angle: number,
      roll_angle: number
    },
    blur: {
      blurness: FacePPValue,
      motionblur: FacePPValue,
      gaussianblur: FacePPValue
    },
    smile: FacePPValue,
    eyestatus: {
      left_eye_status: FacePPEyeStatus,
      right_eye_status: FacePPEyeStatus
    },
    facequality: FacePPValue,
    ethnicity: {
      value: "ASIAN" | "WHITE" | "BLACK"
    },
    eyegaze: {
      right_eye_gaze: FacePPEyeGaze,
      left_eye_gaze: FacePPEyeGaze
    }
  },
  face_rectangle: {
    width: number,
    top: number,
    left: number,
    height: number
  },
  face_token: string
};

export type FacePPResult = {
  time_used: number,
  faces: FacePPFace[],
  image_id: string,
  request_id: string,
  face_num: number
};

export type FacePPGlass = "None" | "Dark" | "Normal";
export type FacePPGender = "Male" | "Female";
