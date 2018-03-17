/** @flow */
import { default as Subject } from "../../src/helpers/FileNameMarkHelper";
import TestHelper from "../../src/helpers/TestHelper";
import {
  MARK_SAVE,
  MARK_REPLACE,
  MARK_DEDUPE,
  MARK_TRANSFER,
  MARK_BLOCK
} from "../../src/types/FileNameMarks";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("isExists", async () => {
    expect(await Subject.isExists("aaa\\ccc.mp4")).toBeFalsy();
    expect(
      await Subject.isExists(TestHelper.sampleFile.image.jpg.default)
    ).toBeTruthy();
  });

  it("mark", () => {
    expect(Subject.mark("aaa\\ccc.mp4", new Set([]))).toBe(`aaa\\ccc.mp4`);
    expect(Subject.mark("aaa\\ccc.mp4", new Set([MARK_SAVE]))).toBe(
      `aaa\\ccc.${Subject.MARK_PREFIX}${Subject.CHAR_SAVE}.mp4`
    );
    expect(Subject.mark("aaa\\ccc.mp4", new Set([MARK_REPLACE]))).toBe(
      `aaa\\ccc.${Subject.MARK_PREFIX}${Subject.CHAR_REPLACE}.mp4`
    );
    expect(Subject.mark("aaa\\ccc.mp4", new Set([MARK_DEDUPE]))).toBe(
      `aaa\\ccc.${Subject.MARK_PREFIX}${Subject.CHAR_DEDUPE}.mp4`
    );
    expect(
      Subject.mark(
        `aaa\\ccc.${Subject.MARK_PREFIX}abcdef.mp4`,
        new Set([MARK_DEDUPE, MARK_SAVE])
      )
    ).toBe(
      `aaa\\ccc.${Subject.MARK_PREFIX}${Subject.CHAR_DEDUPE}${
        Subject.CHAR_SAVE
      }.mp4`
    );
  });

  it("findReplaceFile no hit", async () => {
    expect(
      await Subject.findReplaceFile(TestHelper.sampleFile.image.jpg.default)
    ).toBeNull();
    expect(
      await Subject.findReplaceFile(
        Subject.mark(
          TestHelper.sampleFile.image.jpg.default,
          new Set([MARK_REPLACE])
        ).replace(
          Subject.MARK_PREFIX + Subject.CHAR_REPLACE,
          `${Subject.MARK_PREFIX}2${Subject.CHAR_REPLACE}`
        )
      )
    ).toBeNull();
  });

  it("findReplaceFile hit", async () => {
    const ret = "C:\\bar\\firefox.jpg";
    const stat = jest.fn().mockImplementation(() => Promise.resolve());
    jest.doMock("fs-extra", () => ({
      readdir: () => Promise.resolve(["firefox#5.HOGE_FUGA.jpg"]),
      readlink: () => Promise.resolve("C:\\bar\\firefox.jpg"),
      stat
    }));
    expect(
      await (await import("../../src/helpers/FileNameMarkHelper")).default.findReplaceFile(
        "C:\\foo\\firefox.!5r.jpg"
      )
    ).toBe(ret);
    expect(stat).toHaveBeenCalledTimes(1);
  });

  it("extract", () => {
    expect(Subject.extract(`aaa\\ccc.!ut.mp4`)).toEqual(new Set([]));
    expect(
      Subject.extract(
        `aaa\\ccc.${Subject.MARK_PREFIX}${Subject.CHAR_REPLACE}.mp4`
      )
    ).toEqual(new Set([MARK_REPLACE]));
    expect(
      Subject.extract(
        `aaa\\ccc.${Subject.MARK_PREFIX}${Subject.CHAR_DEDUPE}.mp4`
      )
    ).toEqual(new Set([MARK_DEDUPE]));
    expect(
      Subject.extract(
        `aaa\\ccc.${Subject.MARK_PREFIX}${Subject.CHAR_DEDUPE}${
          Subject.CHAR_REPLACE
        }
        .mp4`
      )
    ).toEqual(new Set([MARK_REPLACE, MARK_DEDUPE]));
    expect(
      Subject.extract(
        `aaa\\ccc\\${Subject.DIR_DEDUPE}\\.${Subject.MARK_PREFIX}${
          Subject.CHAR_REPLACE
        }.mp4`
      )
    ).toEqual(new Set([MARK_DEDUPE]));
    expect(
      Subject.extract(
        `aaa\\ccc\\${Subject.DIR_SAVE}\\.${Subject.MARK_PREFIX}${
          Subject.CHAR_REPLACE
        }.mp4`
      )
    ).toEqual(new Set([MARK_SAVE]));
    expect(
      Subject.extract(
        `aaa\\ccc\\${Subject.DIR_REPLACE}\\.${Subject.MARK_PREFIX}${
          Subject.CHAR_REPLACE
        }.mp4`
      )
    ).toEqual(new Set([MARK_REPLACE]));
    expect(
      Subject.extract(
        `aaa\\ccc\\${Subject.DIR_TRANSFER}\\.${Subject.MARK_PREFIX}${
          Subject.CHAR_TRANSFER
        }.mp4`
      )
    ).toEqual(new Set([MARK_TRANSFER]));
    expect(
      Subject.extract(
        `aaa\\ccc\\${Subject.DIR_BLOCK}\\.${Subject.MARK_PREFIX}${
          Subject.CHAR_TRANSFER
        }.mp4`
      )
    ).toEqual(new Set([MARK_BLOCK]));
  });
});
