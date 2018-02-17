/** @flow */
import chalk from "chalk";
import stripAnsi from "strip-ansi";
import path from "path";

import { default as Subject } from "../../src/helpers/ReportHelper";
import {
  TYPE_DAMAGED,
  TYPE_HASH_MATCH,
  TYPE_NO_PROBLEM,
  TYPE_NG_FILE_NAME,
  TYPE_P_HASH_MAY_BE,
  TYPE_HASH_MISMATCH_RELOCATE,
  TYPE_FILE_MARK_HOLD
} from "../../src/types/ReasonTypes";

describe(Subject.name, () => {
  it("colorizeReasonType", () => {
    expect(Subject.colorizeReasonType(TYPE_P_HASH_MAY_BE)).toContain(
      TYPE_P_HASH_MAY_BE
    );
    expect(Subject.colorizeReasonType(TYPE_HASH_MISMATCH_RELOCATE)).toContain(
      TYPE_HASH_MISMATCH_RELOCATE
    );
    expect(Subject.colorizeReasonType(TYPE_FILE_MARK_HOLD)).toContain(
      TYPE_FILE_MARK_HOLD
    );
  });

  it("getSaveResults, getJudgeResults, flush", () => {
    const basePath = "C:\\abc\\def";
    Subject.appendJudgeResult(TYPE_DAMAGED, path.join(basePath, "foo.jpg"));
    Subject.appendSaveResult("D:\\hoge.jpg");

    expect(Subject.getSaveResults()).toEqual(["D:\\hoge.jpg"]);
    expect(Subject.getJudgeResults()).toEqual([
      ["TYPE_DAMAGED", "C:\\abc\\def\\foo.jpg"]
    ]);

    Subject.flush();

    expect(Subject.getSaveResults()).toEqual([]);
    expect(Subject.getJudgeResults()).toEqual([]);
  });

  it("render", async () => {
    const basePath = "C:\\abc\\def";

    Subject.appendJudgeResult(TYPE_DAMAGED, path.join(basePath, "foo.jpg"));
    Subject.appendJudgeResult(TYPE_HASH_MATCH, path.join(basePath, "bar.jpg"));
    Subject.appendJudgeResult(TYPE_NO_PROBLEM, path.join(basePath, "hoge.jpg"));
    Subject.appendJudgeResult(
      TYPE_NG_FILE_NAME,
      path.join(basePath, "thumbs.db")
    );
    Subject.appendSaveResult("D:\\hoge.jpg");

    expect(stripAnsi(chalk.reset(Subject.createRenderString(basePath)))).toBe(`
                     TYPE_DAMAGED foo.jpg
                TYPE_NG_FILE_NAME thumbs.db
                  TYPE_HASH_MATCH bar.jpg
                  TYPE_NO_PROBLEM hoge.jpg
SAVED D:\\hoge.jpg`);

    const spy = jest.spyOn(global.console, "log");
    spy.mockImplementation(x => x);
    await Subject.render("C:\\abc\\def");
    expect(spy).toBeCalled();
    spy.mockRestore();
  });
});
