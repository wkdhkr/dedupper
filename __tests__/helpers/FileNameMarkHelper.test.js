/** @flow */
import { default as Subject } from "../../src/helpers/FileNameMarkHelper";
import {
  MARK_SAVE,
  MARK_REPLACE,
  MARK_DEDUPE
} from "../../src/types/FileNameMarks";

describe(Subject.name, () => {
  it("mark", () => {
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
});
