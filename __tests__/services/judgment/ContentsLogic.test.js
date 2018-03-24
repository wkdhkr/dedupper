/** @flow */
import { default as Subject } from "../../../src/services/judgment/ContentsLogic";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import { TYPE_IMAGE, TYPE_VIDEO } from "../../../src/types/ClassifyTypes";
import type { FileInfo } from "../../../src/types";

describe(Subject.name, () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });

  const createFileInfo = (targetPath: string): Promise<FileInfo> =>
    new FileService({ ...config, path: targetPath }).collectFileInfo();

  it("isLowLongSide", async () => {
    const fileInfo = await createFileInfo(
      TestHelper.sampleFile.video.mkv.default
    );
    const subject = new Subject(config);

    expect(
      await subject.isLowLongSide({
        ...fileInfo,
        width: config.minLongSideByType[TYPE_VIDEO] - 1
      })
    ).toBeTruthy();
  });

  it("video isLowResolution, isLowFileSize", async () => {
    const fileInfo = await createFileInfo(
      TestHelper.sampleFile.video.mkv.default
    );
    const subject = new Subject(config);

    const res = fileInfo.width * fileInfo.height;
    config.minResolutionByType[TYPE_VIDEO] = res + 1;
    expect(await subject.isLowResolution(fileInfo)).toBeTruthy();
    config.minResolutionByType[TYPE_VIDEO] = res - 1;
    expect(await subject.isLowResolution(fileInfo)).toBeFalsy();

    config.minFileSizeByType[TYPE_VIDEO] = fileInfo.size + 1;
    expect(await subject.isLowFileSize(fileInfo)).toBeTruthy();
    config.minFileSizeByType[TYPE_VIDEO] = fileInfo.size - 1;
    expect(await subject.isLowFileSize(fileInfo)).toBeFalsy();
  });

  it("image isLowResolution isLowFileSize", async () => {
    const fileInfo = await createFileInfo(
      TestHelper.sampleFile.image.jpg.default
    );
    const subject = new Subject(config);

    const res = fileInfo.width * fileInfo.height;
    config.minResolutionByType[TYPE_IMAGE] = res + 1;
    expect(await subject.isLowResolution(fileInfo)).toBeTruthy();
    config.minResolutionByType[TYPE_IMAGE] = res - 1;
    expect(await subject.isLowResolution(fileInfo)).toBeFalsy();

    config.minFileSizeByType[TYPE_IMAGE] = fileInfo.size + 1;
    expect(await subject.isLowFileSize(fileInfo)).toBeTruthy();
    config.minFileSizeByType[TYPE_IMAGE] = fileInfo.size - 1;
    expect(await subject.isLowFileSize(fileInfo)).toBeFalsy();
  });
});
