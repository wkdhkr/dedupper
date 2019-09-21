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

export type FacePPGlass = "None" | "Dark" | "Normal";
export type FacePPGender = "Male" | "Female";

export type FacePPValue<T> = {
  threshold: T,
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

export type FacePPCoordinate = {
  x: number,
  y: number
};

export type FacePPLandmark = {
  mouth_upper_lip_left_contour2: FacePPCoordinate,
  mouth_upper_lip_top: FacePPCoordinate,
  mouth_upper_lip_left_contour1: FacePPCoordinate,
  left_eye_upper_left_quarter: FacePPCoordinate,
  left_eyebrow_lower_middle: FacePPCoordinate,
  mouth_upper_lip_left_contour3: FacePPCoordinate,
  right_eye_top: FacePPCoordinate,
  left_eye_bottom: FacePPCoordinate,
  right_eyebrow_lower_left_quarter: FacePPCoordinate,
  right_eye_pupil: FacePPCoordinate,
  mouth_lower_lip_right_contour1: FacePPCoordinate,
  mouth_lower_lip_right_contour3: FacePPCoordinate,
  mouth_lower_lip_right_contour2: FacePPCoordinate,
  contour_chin: FacePPCoordinate,
  contour_left9: FacePPCoordinate,
  left_eye_lower_right_quarter: FacePPCoordinate,
  mouth_lower_lip_top: FacePPCoordinate,
  right_eyebrow_upper_middle: FacePPCoordinate,
  left_eyebrow_left_corner: FacePPCoordinate,
  right_eye_bottom: FacePPCoordinate,
  contour_left7: FacePPCoordinate,
  contour_left6: FacePPCoordinate,
  contour_left5: FacePPCoordinate,
  contour_left4: FacePPCoordinate,
  contour_left3: FacePPCoordinate,
  contour_left2: FacePPCoordinate,
  contour_left1: FacePPCoordinate,
  left_eye_lower_left_quarter: FacePPCoordinate,
  contour_right1: FacePPCoordinate,
  contour_right3: FacePPCoordinate,
  contour_right2: FacePPCoordinate,
  mouth_left_corner: FacePPCoordinate,
  contour_right4: FacePPCoordinate,
  contour_right7: FacePPCoordinate,
  right_eyebrow_left_corner: FacePPCoordinate,
  nose_right: FacePPCoordinate,
  nose_tip: FacePPCoordinate,
  contour_right5: FacePPCoordinate,
  nose_contour_lower_middle: FacePPCoordinate,
  left_eyebrow_lower_left_quarter: FacePPCoordinate,
  mouth_lower_lip_left_contour3: FacePPCoordinate,
  right_eye_right_corner: FacePPCoordinate,
  right_eye_lower_right_quarter: FacePPCoordinate,
  mouth_upper_lip_right_contour2: FacePPCoordinate,
  right_eyebrow_lower_right_quarter: FacePPCoordinate,
  left_eye_left_corner: FacePPCoordinate,
  mouth_right_corner: FacePPCoordinate,
  mouth_upper_lip_right_contour3: FacePPCoordinate,
  right_eye_lower_left_quarter: FacePPCoordinate,
  left_eyebrow_right_corner: FacePPCoordinate,
  left_eyebrow_lower_right_quarter: FacePPCoordinate,
  right_eye_center: FacePPCoordinate,
  nose_left: FacePPCoordinate,
  mouth_lower_lip_left_contour1: FacePPCoordinate,
  left_eye_upper_right_quarter: FacePPCoordinate,
  right_eyebrow_lower_middle: FacePPCoordinate,
  left_eye_top: FacePPCoordinate,
  left_eye_center: FacePPCoordinate,
  contour_left8: FacePPCoordinate,
  contour_right9: FacePPCoordinate,
  right_eye_left_corner: FacePPCoordinate,
  mouth_lower_lip_bottom: FacePPCoordinate,
  left_eyebrow_upper_left_quarter: FacePPCoordinate,
  left_eye_pupil: FacePPCoordinate,
  right_eyebrow_upper_left_quarter: FacePPCoordinate,
  contour_right8: FacePPCoordinate,
  right_eyebrow_right_corner: FacePPCoordinate,
  right_eye_upper_left_quarter: FacePPCoordinate,
  left_eyebrow_upper_middle: FacePPCoordinate,
  right_eyebrow_upper_right_quarter: FacePPCoordinate,
  nose_contour_left1: FacePPCoordinate,
  nose_contour_left2: FacePPCoordinate,
  mouth_upper_lip_right_contour1: FacePPCoordinate,
  nose_contour_right1: FacePPCoordinate,
  nose_contour_right2: FacePPCoordinate,
  mouth_lower_lip_left_contour2: FacePPCoordinate,
  contour_right6: FacePPCoordinate,
  nose_contour_right3: FacePPCoordinate,
  nose_contour_left3: FacePPCoordinate,
  left_eye_right_corner: FacePPCoordinate,
  left_eyebrow_upper_right_quarter: FacePPCoordinate,
  right_eye_upper_right_quarter: FacePPCoordinate,
  mouth_upper_lip_bottom: FacePPCoordinate
};

export type FacePPFace = {
  landmark: FacePPLandmark,
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
      value: FacePPGender
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
      value: FacePPGlass
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
      blurness: FacePPValue<50>,
      motionblur: FacePPValue<50>,
      gaussianblur: FacePPValue<50>
    },
    smile: FacePPValue<50>,
    eyestatus: {
      left_eye_status: FacePPEyeStatus,
      right_eye_status: FacePPEyeStatus
    },
    facequality: FacePPValue<70.1>,
    ethnicity: {
      value: string
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
