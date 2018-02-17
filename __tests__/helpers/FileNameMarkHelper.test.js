/** @flow */
import { default as Subject } from "../../src/helpers/FileNameMarkHelper";
import {
  MARK_SAVE,
  MARK_REPLACE,
  MARK_DEDUPE
} from "../../src/types/FileNameMarks";

describe(Subject.name, () => {
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

  it("extract", () => {
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
  });
});
