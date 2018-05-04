// @flow
import fs from "fs-extra";
import path from "path";
import {
  MARK_BLOCK,
  MARK_ERASE,
  MARK_HOLD,
  MARK_DEDUPE,
  MARK_SAVE,
  MARK_REPLACE,
  MARK_TRANSFER
} from "./../types/FileNameMarks";
import type { FileNameMark } from "./../types/FileNameMarks";

function escapeRegExp(str: string): string {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
}

export default class FileNameMarkHelper {
  static CHAR_BLOCK = "b";
  static CHAR_ERASE = "e";
  static CHAR_HOLD = "h";
  static CHAR_DEDUPE = "d";
  static CHAR_SAVE = "s";
  static CHAR_REPLACE = "r";
  static CHAR_TRANSFER = "t";

  static DIR_ERASE = "!erase";
  static DIR_BLOCK = "!block";
  static DIR_DEDUPE = "!dedupe";
  static DIR_SAVE = "!save";
  static DIR_REPLACE = "!replace";
  static DIR_TRANSFER = "!transfer";

  static markToCharLookup: { [FileNameMark]: string } = {
    [MARK_BLOCK]: FileNameMarkHelper.CHAR_BLOCK,
    [MARK_ERASE]: FileNameMarkHelper.CHAR_ERASE,
    [MARK_DEDUPE]: FileNameMarkHelper.CHAR_DEDUPE,
    [MARK_HOLD]: FileNameMarkHelper.CHAR_HOLD,
    [MARK_SAVE]: FileNameMarkHelper.CHAR_SAVE,
    [MARK_REPLACE]: FileNameMarkHelper.CHAR_REPLACE,
    [MARK_TRANSFER]: FileNameMarkHelper.CHAR_TRANSFER
  };

  static charToMarkLookup: { [string]: FileNameMark } = {
    [FileNameMarkHelper.CHAR_BLOCK]: MARK_BLOCK,
    [FileNameMarkHelper.CHAR_ERASE]: MARK_ERASE,
    [FileNameMarkHelper.CHAR_DEDUPE]: MARK_DEDUPE,
    [FileNameMarkHelper.CHAR_HOLD]: MARK_HOLD,
    [FileNameMarkHelper.CHAR_SAVE]: MARK_SAVE,
    [FileNameMarkHelper.CHAR_REPLACE]: MARK_REPLACE,
    [FileNameMarkHelper.CHAR_TRANSFER]: MARK_TRANSFER
  };

  static MARK_PREFIX = "!";

  static async isExists(targetPath: string): Promise<boolean> {
    if (await fs.pathExists(targetPath)) {
      return true;
    }
    return Boolean(await FileNameMarkHelper.findMarkedFile(targetPath));
  }

  static extractNumber(targetPath: string): ?number {
    const { name } = path.parse(targetPath);
    const { ext } = path.parse(name);
    const match = ext.match(/[0-9]+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return null;
  }

  static async findMarkedFile(targetPath: string): Promise<?string> {
    try {
      const stripedPath = FileNameMarkHelper.strip(targetPath);
      const { dir, name, ext } = path.parse(stripedPath);

      const regEx = new RegExp(`${escapeRegExp(`${name}.!`)}.*${ext}$`);
      const files = (await fs.readdir(dir)).filter(f => f.match(regEx));
      if (files.length) {
        return files[0];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async findReplaceFileByNumber(
    targetPath: string,
    n: ?number
  ): Promise<?string> {
    if (!n) {
      return null;
    }

    const stripedPath = FileNameMarkHelper.strip(targetPath);
    const { dir, name } = path.parse(stripedPath);

    const regEx = new RegExp(`${escapeRegExp(`${name}#${n}.`)}`);
    const files = (await fs.readdir(dir)).filter(f => f.match(regEx));
    if (files.length) {
      return files[0];
    }
    return null;
  }

  static async findReplaceFile(targetPath: string): Promise<?string> {
    const symLinkPath = await FileNameMarkHelper.findReplaceFileByNumber(
      targetPath,
      FileNameMarkHelper.extractNumber(targetPath)
    );
    if (!symLinkPath) {
      return null;
    }
    try {
      const destPath = await fs.readlink(symLinkPath);
      await fs.stat(destPath);
      return destPath;
    } catch (e) {
      return null;
    }
  }

  static detectMarksByDirName(dirName: string): Set<FileNameMark> {
    if (dirName === FileNameMarkHelper.DIR_DEDUPE) {
      return new Set([MARK_DEDUPE]);
    }
    if (dirName === FileNameMarkHelper.DIR_SAVE) {
      return new Set([MARK_SAVE]);
    }
    if (dirName === FileNameMarkHelper.DIR_REPLACE) {
      return new Set([MARK_REPLACE]);
    }
    if (dirName === FileNameMarkHelper.DIR_TRANSFER) {
      return new Set([MARK_TRANSFER]);
    }
    if (dirName === FileNameMarkHelper.DIR_BLOCK) {
      return new Set([MARK_BLOCK]);
    }
    if (dirName === FileNameMarkHelper.DIR_ERASE) {
      return new Set([MARK_ERASE]);
    }
    return new Set([]);
  }

  static extract(targetPath: string): Set<FileNameMark> {
    const { dir, name } = path.parse(targetPath);
    const { ext } = path.parse(name);
    // torrent?
    if (ext === ".!ut") {
      return new Set([]);
    }

    const dirName = path.basename(dir);
    const marks = FileNameMarkHelper.detectMarksByDirName(dirName);
    if (marks.size) {
      return marks;
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
    if (marks.size === 0) {
      return targetPath;
    }
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
      .replace(FileNameMarkHelper.DIR_ERASE + path.sep, "")
      .replace(FileNameMarkHelper.DIR_DEDUPE + path.sep, "")
      .replace(FileNameMarkHelper.DIR_SAVE + path.sep, "")
      .replace(FileNameMarkHelper.DIR_TRANSFER + path.sep, "")
      .replace(FileNameMarkHelper.DIR_REPLACE + path.sep, "")
      .replace(FileNameMarkHelper.DIR_BLOCK + path.sep, "");
  }
}
