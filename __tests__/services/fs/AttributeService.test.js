/** @flow */
import path from "path";

import { default as Subject } from "../../../src/services/fs/AttributeService";
import DateHelper from "../../../src/helpers/DateHelper";
import TestHelper from "../../../src/helpers/TestHelper";
import {
  TYPE_UNKNOWN,
  TYPE_IMAGE,
  TYPE_DEDUPPER_LOCK
} from "../../../src/types/ClassifyTypes";

import { STATE_KEEPING, STATE_ACCEPTED } from "../../../src/types/FileStates";
import type { Config } from "../../../src/types";

describe(Subject.name, () => {
  let config: Config;
  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });
  const loadSubject = async () =>
    import("../../../src/services/fs/AttributeService");
  it("get path string", async () => {
    config.path = TestHelper.sampleFile.image.jpg.default;
    const dummyPath = "/hoge/fuga/foo.txt";
    const subject = new Subject(config);
    expect(subject.getParsedPath(dummyPath)).toMatchObject({
      base: "foo.txt",
      dir: "/hoge/fuga",
      ext: ".txt",
      name: "foo",
      root: "/"
    });
    expect(subject.getFileName()).toBe("firefox.jpg");
    expect(subject.getDirName()).toBe(path.basename(TestHelper.sampleDir));
    expect(subject.getDirName(dummyPath)).toBe("fuga");
    DateHelper.currentDate = new Date(2018, 0, 11);
    expect(await subject.getDestPath()).toBe(
      `${config.baseLibraryPathByType[TYPE_IMAGE]}\\2018\\01-11\\__tests__\\sample\\firefox.jpg`
    );
    config.libraryPathDate = new Date(2017, 3, 21);
    expect(await subject.getDestPath()).toBe(
      `${config.baseLibraryPathByType[TYPE_IMAGE]}\\2017\\04-21\\__tests__\\sample\\firefox.jpg`
    );
  });

  it("detectClassifyType", () => {
    const subject = new Subject(config);
    expect(subject.detectClassifyType("test.dplock")).toBe(TYPE_DEDUPPER_LOCK);
  });

  it("getDirPath", () => {
    const subject = new Subject(config);
    expect(subject.getDirPath(".")).toBe(".");
    expect(subject.getDirPath("C:\\hoge\\fuga\\test.txt")).toBe(
      "C:\\hoge\\fuga"
    );
  });

  it("isAccessible", async () => {
    const subject = new Subject(config);
    expect(await subject.isAccessible("?")).toBeFalsy();
    expect(await subject.isAccessible(".")).toBeTruthy();
  });

  it("getState", () => {
    config.keep = true;
    {
      const subject = new Subject(config);
      expect(subject.getState()).toBe(STATE_KEEPING);
    }
    config.keep = false;
    config.path = TestHelper.sampleFile.image.jpg.default;
    {
      const subject = new Subject(config);
      expect(subject.getState()).toBe(STATE_ACCEPTED);
      expect(subject.getState(config.path)).toBe(STATE_ACCEPTED);
    }
  });

  it("get info", async () => {
    config.path = TestHelper.sampleFile.image.jpg.default;
    const subject = new Subject(config);
    expect(subject.detectClassifyType()).toBe(TYPE_IMAGE);
    expect(
      subject.detectClassifyType(TestHelper.sampleFile.misc.unknown.default)
    ).toBe(TYPE_UNKNOWN);
    expect(await subject.isAccessible()).toBeTruthy();
    expect(
      await subject.isAccessible(TestHelper.sampleFile.image.jpg.notfound)
    ).toBeFalsy();
  });

  describe("isDeadLink", () => {
    it("false", async () => {
      jest.mock("fs-extra", () => ({
        readlink: jest
          .fn()
          .mockImplementation(() => Promise.resolve("C:\\dest_path.txt")),
        stat: jest.fn().mockImplementation(() => Promise.resolve())
      }));

      const { default: AttributeService } = await loadSubject();
      const subject = new AttributeService(config);
      expect(await subject.isDeadLink("C:\\from_path.txt")).toBeFalsy();
    });

    it("true", async () => {
      jest.mock("fs-extra", () => ({
        readlink: jest
          .fn()
          .mockImplementation(() => Promise.resolve("C:\\dest_path.txt")),
        stat: jest.fn().mockImplementation(() => {
          throw new Error("error");
        })
      }));

      const { default: AttributeService } = await loadSubject();
      const subject = new AttributeService(config);
      expect(await subject.isDeadLink("C:\\from_path.txt")).toBeTruthy();
    });
  });
});
