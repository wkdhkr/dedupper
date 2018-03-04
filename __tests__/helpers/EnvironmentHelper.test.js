/** @flow */
import { default as Subject } from "../../src/helpers/EnvironmentHelper";
import { TYPE_VIDEO, TYPE_IMAGE } from "../../dist/types/ClassifyTypes";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../src/helpers/EnvironmentHelper")).default;

  it("get home directory", () => {
    Object.defineProperty(process, "platform", {
      value: "win32"
    });
    expect(Subject.getHomeDir()).toBe(process.env.USERPROFILE);

    Object.defineProperty(process, "platform", {
      value: "unix"
    });
    Object.defineProperty(process.env, "HOME", {
      value: process.env.USERPROFILE
    });
    expect(Subject.getHomeDir()).toBe(process.env.USERPROFILE);
  });

  it("loadUserConfig test", async () => {
    expect((await loadSubject()).loadUserConfig()).toEqual({});
  });

  it("loadUserConfig", async () => {
    const fs = {
      pathExistsSync: () => true
    };
    jest.doMock("fs-extra", () => fs);
    jest.doMock("require-uncached", () =>
      jest.fn().mockImplementation(() => ({
        dbBasePath: "./test"
      }))
    );
    expect((await loadSubject()).loadUserConfig(true)).toEqual({
      dbBasePath: "./test"
    });
  });

  it("loadPathMatchConfig", () => {
    expect(
      Subject.loadPathMatchConfig(
        {
          "\\fuga\\": { pHashIgnoreSameDir: false },
          "\\hoge\\": { meanExactThreshold: 3000 },
          "\\aaaa\\": { defaultLogLevel: "debug" }
        },
        "C:\\hoge\\fuga\\foo.txt"
      )
    ).toEqual({ meanExactThreshold: 3000, pHashIgnoreSameDir: false });
    expect(
      Subject.loadPathMatchConfig(undefined, "C:\\hoge\\fuga\\foo.txt")
    ).toEqual({});
  });

  it("loadClassifyTypeConfig", () => {
    expect(
      Subject.loadClassifyTypeConfig(
        {
          [TYPE_VIDEO]: { defaultLogLevel: "debug" }
        },
        TYPE_VIDEO
      )
    ).toEqual({ defaultLogLevel: "debug" });
    expect(Subject.loadPathMatchConfig(undefined, TYPE_IMAGE)).toEqual({});
  });
});
