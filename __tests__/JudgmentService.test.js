/** @flow */
import { default as Subject } from "../src/services/JudgmentService";
import FileService from "../src/services/fs/FileService";
import DbService from "../src/services/DbService";
import TestHelper from "../src/helpers/TestHelper";
import { TYPE_IMAGE, TYPE_VIDEO } from "../src/types/ClassifyTypes";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE
} from "../src/types/ActionTypes";
import type { FileInfo } from "../src/types";

describe(Subject.name, () => {
  let config;
  const ds = new DbService(TestHelper.createDummyConfig());
  const deleteResult = [TYPE_DELETE, null];

  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });

  const createFileInfo = (path: string): Promise<FileInfo> =>
    new FileService({ ...config, path }).collectFileInfo();

  describe("filter functions", () => {
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

  describe("detect", () => {
    it("scrap pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.misc.txt.default
      );
      const subject = new Subject(config);
      expect(await subject.detect(fileInfo, null, [])).toEqual(deleteResult);
    });

    it("hold pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.misc.unknown.default
      );
      const subject = new Subject(config);
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_HOLD,
        null
      ]);
    });

    it("delete pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      const subject = new Subject(config);

      // low file size
      config.minFileSizeByType[TYPE_VIDEO] = fileInfo.size + 1;
      expect(await subject.detect(fileInfo, null, [])).toEqual(deleteResult);
      // low resolution
      const res = fileInfo.width * fileInfo.height;
      config.minFileSizeByType[TYPE_VIDEO] = fileInfo.size - 1;
      config.minResolutionByType[TYPE_VIDEO] = res + 1;
      expect(await subject.detect(fileInfo, null, [])).toEqual(deleteResult);
      // damaged
      config.minResolutionByType[TYPE_VIDEO] = res - 1;
      expect(
        await subject.detect({ ...fileInfo, damaged: true }, null, [])
      ).toEqual(deleteResult);
      // already had
      expect(
        await subject.detect(fileInfo, ds.infoToRow(fileInfo), [])
      ).toEqual(deleteResult);
    });

    it("replace pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      const subject = new Subject(config);

      config.minFileSizeByType[TYPE_VIDEO] = 1;
      config.minResolutionByType[TYPE_VIDEO] = 1;
      const dummyStoredFileInfo = ds.infoToRow({
        ...fileInfo,
        to_path: fileInfo.from_path
      });
      // low file size
      expect(
        await subject.detect(
          { ...fileInfo, size: config.minFileSizeByType[TYPE_VIDEO] },
          null,
          [
            {
              ...dummyStoredFileInfo,
              size: config.minFileSizeByType[TYPE_VIDEO] * 2
            }
          ]
        )
      ).toEqual(deleteResult);
      // low resolution
      expect(
        await subject.detect(
          {
            ...fileInfo,
            width: fileInfo.width - 1,
            height: fileInfo.height - 1
          },
          null,
          [dummyStoredFileInfo]
        )
      ).toEqual(deleteResult);
      // newer
      expect(
        await subject.detect(
          { ...fileInfo, timestamp: fileInfo.timestamp + 1 },
          null,
          [dummyStoredFileInfo]
        )
      ).toEqual(deleteResult);
      // replace
      expect(
        await subject.detect(fileInfo, null, [dummyStoredFileInfo])
      ).toEqual([TYPE_REPLACE, dummyStoredFileInfo]);
    });
    it("save pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      const subject = new Subject(config);

      config.minFileSizeByType[TYPE_VIDEO] = 1;
      config.minResolutionByType[TYPE_VIDEO] = 1;
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_SAVE,
        null
      ]);
    });
  });
});