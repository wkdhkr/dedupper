// @flow
import path from "path";
import {
  MARK_BLOCK,
  MARK_ERASE,
  MARK_HOLD,
  MARK_DEDUPE,
  MARK_SAVE,
  MARK_REPLACE
} from "./../types/FileNameMarks";
import type { FileNameMark } from "./../types/FileNameMarks";

export default class FileNameMarkHelper {
  static CHAR_BLOCK = "b";
  static CHAR_ERASE = "e";
  static CHAR_HOLD = "h";
  static CHAR_DEDUPE = "d";
  static CHAR_SAVE = "s";
  static CHAR_REPLACE = "r";

  static DIR_DEDUPE = "!dedupe";
  static DIR_SAVE = "!save";
  static DIR_REPLACE = "!replace";

  static markToCharLookup: { [FileNameMark]: string } = {
    [MARK_BLOCK]: FileNameMarkHelper.CHAR_BLOCK,
    [MARK_ERASE]: FileNameMarkHelper.CHAR_ERASE,
    [MARK_DEDUPE]: FileNameMarkHelper.CHAR_DEDUPE,
    [MARK_HOLD]: FileNameMarkHelper.CHAR_HOLD,
    [MARK_SAVE]: FileNameMarkHelper.CHAR_SAVE,
    [MARK_REPLACE]: FileNameMarkHelper.CHAR_REPLACE
  };

  static charToMarkLookup: { [string]: FileNameMark } = {
    [FileNameMarkHelper.CHAR_BLOCK]: MARK_BLOCK,
    [FileNameMarkHelper.CHAR_ERASE]: MARK_ERASE,
    [FileNameMarkHelper.CHAR_DEDUPE]: MARK_DEDUPE,
    [FileNameMarkHelper.CHAR_HOLD]: MARK_HOLD,
    [FileNameMarkHelper.CHAR_SAVE]: MARK_SAVE,
    [FileNameMarkHelper.CHAR_REPLACE]: MARK_REPLACE
  };

  static MARK_PREFIX = "!";

  static extract(targetPath: string): Set<FileNameMark> {
    const { dir, name } = path.parse(targetPath);
    const { ext } = path.parse(name);

    const marks = new Set();
    const dirName = path.basename(dir);
    if (dirName === FileNameMarkHelper.DIR_DEDUPE) {
      return new Set([MARK_DEDUPE]);
    }
    if (dirName === FileNameMarkHelper.DIR_SAVE) {
      return new Set([MARK_SAVE]);
    }
    if (dirName === FileNameMarkHelper.DIR_REPLACE) {
      return new Set([MARK_REPLACE]);
    }

    if (ext.startsWith(`.${FileNameMarkHelper.MARK_PREFIX}`)) {
      [...ext].forEach(c => {
        if (FileNameMarkHelper.charToMarkLookup[c]) {
          marks.add(FileNameMarkHelper.charToMarkLookup[c]);
        }
      });
      return marks;
    }
    return new Set([]);
  }

  static mark(targetPath: string, marks: Set<FileNameMark>): string {
    const { dir, name, ext } = path.parse(FileNameMarkHelper.strip(targetPath));
    return path.join(dir, name + FileNameMarkHelper.createToken(marks) + ext);
  }

  static createToken(marks: Set<FileNameMark>): string {
    const chars = [];
    marks.forEach(m => {
      if (FileNameMarkHelper.markToCharLookup[m]) {
        chars.push(FileNameMarkHelper.markToCharLookup[m]);
        return;
      }
      throw new Error(`unknown mark detected. mark = ${m}`);
    });
    if (chars.length) {
      return `.${FileNameMarkHelper.MARK_PREFIX}${chars.join("")}`;
    }
    return "";
  }

  static strip(targetPath: string): string {
    const { dir, name, ext } = path.parse(targetPath);
    const { name: originalName, ext: markToken } = path.parse(name);

    let stripedPath = targetPath;
    if (markToken.startsWith(`.${FileNameMarkHelper.MARK_PREFIX}`)) {
      stripedPath = path.join(dir, originalName + ext);
    }
    return stripedPath
      .replace(FileNameMarkHelper.DIR_DEDUPE + path.sep, "")
      .replace(FileNameMarkHelper.DIR_SAVE + path.sep, "")
      .replace(FileNameMarkHelper.DIR_REPLACE + path.sep, "");
  }
}
