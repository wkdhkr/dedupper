// @flow
import path from "path";
import { MARK_DEDUPE, MARK_SAVE, MARK_REPLACE } from "./../types/FileNameMarks";
import type { FileNameMark } from "./../types/FileNameMarks";

export default class FileNameMarkHelper {
  static CHAR_DEDUPE = "d";
  static CHAR_SAVE = "s";
  static CHAR_REPLACE = "r";
  static MARK_PREFIX = "!";

  static mark(targetPath: string, marks: Set<FileNameMark>): string {
    const { dir, name, ext } = path.parse(this.strip(targetPath));
    return path.join(dir, name + this.createMarkToken(marks) + ext);
  }

  static createMarkToken(marks: Set<FileNameMark>): string {
    const chars = [];
    marks.forEach(m => {
      switch (m) {
        case MARK_DEDUPE:
          return chars.push(this.CHAR_DEDUPE);
        case MARK_SAVE:
          return chars.push(this.CHAR_SAVE);
        case MARK_REPLACE:
          return chars.push(this.CHAR_REPLACE);
        default:
          throw new Error(`unknown mark detected. mark = ${m}`);
      }
    });
    if (chars.length) {
      return `.${this.MARK_PREFIX}${chars.join("")}`;
    }
    return "";
  }

  static strip(targetPath: string): string {
    const { dir, name, ext } = path.parse(targetPath);
    const { name: originalName, ext: markToken } = path.parse(name);

    if (markToken.startsWith(`.${this.MARK_PREFIX}`)) {
      return path.join(dir, originalName + ext);
    }
    return targetPath;
  }
}
