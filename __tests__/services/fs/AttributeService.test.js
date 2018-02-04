/** @flow */
import path from "path";

import { default as Subject } from "../../../src/services/fs/AttributeService";
import TestHelper from "../../../src/helpers/TestHelper";
import { TYPE_UNKNOWN, TYPE_IMAGE } from "../../../src/types/ClassifyTypes";

describe(Subject.name, () => {
  let config;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });
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
    expect(await subject.getDestPath()).toBe(
      `${
        config.baseLibraryPathByType[TYPE_IMAGE]
      }\\2018\\01\\__tests__\\sample\\firefox.jpg`
    );
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
});