/** @flow */

import { default as Subject } from "../../src/services/fs/FileService";
import TestHelper from "../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let config;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });

  /*
  it("rename", async () => {
    config.path = "/hoge/fuga/foo.txt";
    const subject = new Subject(config);
    expect(
      await subject.rename(config.path, config.path.replace("foo", "bar"))
    ).toBeUndefined();
  });
  */

  it("collectFileInfo", async () => {
    config.path = `${TestHelper.sampleDir}firefox.jpg`;
    const subject = new Subject(config);
    expect(await subject.collectFileInfo()).toMatchObject({
      damaged: false,
      from_path: "__tests__/sample/firefox.jpg",
      hash: "dd82c626ec0047df4caf1309b8e4008b072e2627",
      height: 479,
      name: "firefox.jpg",
      p_hash: "7856513260241168089",
      ratio: 500 / 479,
      size: 36189,
      timestamp: 1516454091184,
      to_path: "B:\\Image\\2018\\01\\__tests__\\sample\\firefox.jpg",
      type: "TYPE_IMAGE",
      width: 500
    });
  });
});
