/** @flow */
import path from "path";

import { default as Subject } from "../../../src/services/fs/FileCacheService";
import AttributeService from "../../../src/services/fs/AttributeService";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import FileNameMarkHelper from "../../../dist/helpers/FileNameMarkHelper";
import { MARK_ERASE } from "../../../src/types/FileNameMarks";
import type { FileInfo } from "../../../src/types";

jest.setTimeout(60000);
describe(Subject.name, () => {
  let config;

  beforeEach(() => {
    config = TestHelper.createDummyConfig();
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../../src/services/fs/FileCacheService")).default;

  const createFileInfo = (targetPath: string): Promise<FileInfo> =>
    new FileService({ ...config, path: targetPath }).collectFileInfo();

  it("getPath", async () => {
    const FileCacheService = await loadSubject();
    const as = new AttributeService(config);
    const subject = new FileCacheService(config, as);

    expect(
      subject.getPath(FileNameMarkHelper.mark("aaa.txt", new Set([MARK_ERASE])))
    ).toEqual("aaa.txt.dpcache");
  });

  it("detectFromPath", async () => {
    const targetPath = TestHelper.sampleFile.image.jpg.default;
    config.path = targetPath;
    const FileCacheService = await loadSubject();
    const as = new AttributeService(config);
    const subject = new FileCacheService(config, as);

    expect(
      subject.detectFromPath(
        FileNameMarkHelper.mark(targetPath, new Set([MARK_ERASE]))
      )
    ).toEqual(path.resolve(targetPath));

    expect(subject.detectFromPath()).toEqual(path.resolve(targetPath));
  });

  it("loadCacheFile", async () => {
    const targetPath = TestHelper.sampleFile.image.jpg.default;
    config.path = targetPath;
    const json = JSON.stringify(await createFileInfo(targetPath));
    jest.doMock("fs-extra", () => ({
      readFile: jest.fn().mockImplementation(() => Promise.resolve(json)),
      pathExists: () => true
    }));
    const FileCacheService = await loadSubject();
    const as = new AttributeService(config);
    const subject = new FileCacheService(config, as);

    expect(await subject.load(targetPath)).toEqual(JSON.parse(json));
  });

  it("clean", async () => {
    const FileCacheService = await loadSubject();
    const as = new AttributeService(config);
    const subject = new FileCacheService(config, as);
    config.path = TestHelper.sampleFile.image.jpg.notfound;

    expect(await subject.clean()).toBeUndefined();
  });

  it("loadCacheFile path change", async () => {
    const targetPath = TestHelper.sampleFile.image.jpg.default;
    config.path = TestHelper.sampleFile.image.png.default;
    const json = JSON.stringify(await createFileInfo(targetPath));
    jest.doMock("fs-extra", () => ({
      readFile: jest.fn().mockImplementation(() => Promise.resolve(json)),
      pathExists: () => true
    }));
    const FileCacheService = await loadSubject();
    const as = new AttributeService(config);
    const subject = new FileCacheService(config, as);

    expect(await subject.load(targetPath)).toEqual(JSON.parse(json));
  });

  it("writeCacheFile", async () => {
    const targetPath = TestHelper.sampleFile.image.jpg.default;
    config.path = targetPath;
    const writeFile = jest.fn().mockImplementation(() => Promise.resolve());
    const touchHide = jest.fn().mockImplementation(() => Promise.resolve());
    jest.doMock("fs-extra", () => ({
      writeFile,
      pathExists: () => Promise.resolve(true),
      unlink: () => Promise.resolve()
    }));
    jest.doMock("../../../src/services/fs/AttributeService", () => ({
      default: class C {
        touchHide = touchHide;

        getSourcePath = () => targetPath;

        getFileName = () => "firefox.jpg";
      }
    }));
    const FileCacheService = await loadSubject();
    const AS = (await import("../../../src/services/fs/AttributeService"))
      .default;
    const as = new AS(config);
    const subject = new FileCacheService(config, as);

    await subject.write(subject.createEmptyFileInfo());
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(touchHide).toHaveBeenCalledTimes(1);
  });
});
