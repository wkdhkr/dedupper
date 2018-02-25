/** @flow */

import { default as Subject } from "../../../src/services/fs/FileCacheService";
import AttributeService from "../../../src/services/fs/AttributeService";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import type { FileInfo } from "../../../src/types";

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

  it("loadCacheFile", async () => {
    const targetPath = TestHelper.sampleFile.image.jpg.default;
    config.path = targetPath;
    const json = JSON.stringify(await createFileInfo(targetPath));
    jest.doMock("fs-extra", () => ({
      readFile: jest.fn().mockImplementation(() => json),
      pathExists: () => true
    }));
    const FileCacheService = await loadSubject();
    const as = new AttributeService(config);
    const subject = new FileCacheService(config, as);

    expect(await subject.loadCacheFile(targetPath)).toEqual(JSON.parse(json));
  });

  it("loadCacheFile path change", async () => {
    const targetPath = TestHelper.sampleFile.image.jpg.default;
    config.path = TestHelper.sampleFile.image.png.default;
    const json = JSON.stringify(await createFileInfo(targetPath));
    jest.doMock("fs-extra", () => ({
      readFile: jest.fn().mockImplementation(() => json),
      pathExists: () => true
    }));
    const FileCacheService = await loadSubject();
    const as = new AttributeService(config);
    const subject = new FileCacheService(config, as);

    expect(await subject.loadCacheFile(targetPath)).toEqual(JSON.parse(json));
  });
});
