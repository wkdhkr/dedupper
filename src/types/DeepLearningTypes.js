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
