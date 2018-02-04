/** @flow */
import { default as Subject } from "../../src/services/JudgmentService";
import FileService from "../../src/services/fs/FileService";
import DbService from "../../src/services/DbService";
import TestHelper from "../../src/helpers/TestHelper";
import {
  TYPE_IMAGE,
  TYPE_VIDEO,
  TYPE_SCRAP
} from "../../src/types/ClassifyTypes";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE,
  TYPE_RELOCATE
} from "../../src/types/ActionTypes";
import {
  TYPE_UNKNOWN_FILE_TYPE,
  TYPE_SCRAP_FILE_TYPE,
  TYPE_NG_FILE_NAME,
  TYPE_NG_DIR_PATH,
  TYPE_DAMAGED,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_LOW_LONG_SIDE,
  TYPE_HASH_MATCH,
  TYPE_HASH_MATCH_RELOCATE,
  TYPE_HASH_MISMATCH_RELOCATE,
  TYPE_P_HASH_MATCH,
  TYPE_NO_PROBLEM,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
  TYPE_P_HASH_REJECT_LOW_RESOLUTION,
  TYPE_P_HASH_REJECT_NEWER
} from "../../src/types/ReasonTypes";
import type { FileInfo } from "../../src/types";

describe(Subject.name, () => {
  let config;
  const deleteResult = [TYPE_DELETE, null];

  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });

  const createFileInfo = (path: string): Promise<FileInfo> =>
    new FileService({ ...config, path }).collectFileInfo();

  describe("filter functions", () => {
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

  describe("detect", () => {
    it("scrap pattern", async () => {
      config.classifyTypeByExtension.txt = TYPE_SCRAP;
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.misc.txt.default
      );
      const subject = new Subject(config);
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        ...deleteResult,
        TYPE_SCRAP_FILE_TYPE,
        []
      ]);
    });

    it("hold pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.misc.unknown.default
      );
      const subject = new Subject(config);
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_HOLD,
        null,
        TYPE_UNKNOWN_FILE_TYPE,
        []
      ]);
    });

    it("delete pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      const subject = new Subject(config);

      expect(
        await subject.detect(
          { ...fileInfo, from_path: "C:\\hoge.bak\\NG_WORD.txt" },
          null,
          []
        )
      ).toEqual([...deleteResult, TYPE_NG_DIR_PATH, []]);

      config.ngDirPathPatterns = ["abcdefg"];
      expect(
        await subject.detect(
          { ...fileInfo, from_path: "C:\\abcdefg\\hoge.txt" },
          null,
          []
        )
      ).toEqual([...deleteResult, TYPE_NG_DIR_PATH, []]);

      config.ngFileNamePatterns = ["ng.txt", /ng_word/i];
      expect(
        await subject.detect({ ...fileInfo, name: "NG_WORD.txt" }, null, [])
      ).toEqual([...deleteResult, TYPE_NG_FILE_NAME, []]);

      expect(
        await subject.detect({ ...fileInfo, name: "ng.txt" }, null, [])
      ).toEqual([...deleteResult, TYPE_NG_FILE_NAME, []]);

      expect(
        await subject.detect({ ...fileInfo, damaged: true }, null, [])
      ).toEqual([...deleteResult, TYPE_DAMAGED, []]);

      config.minFileSizeByType[TYPE_VIDEO] = fileInfo.size + 1;
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        ...deleteResult,
        TYPE_LOW_FILE_SIZE,
        []
      ]);

      const res = fileInfo.width * fileInfo.height;
      config.minFileSizeByType[TYPE_VIDEO] = fileInfo.size - 1;
      config.minResolutionByType[TYPE_VIDEO] = res + 1;
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        ...deleteResult,
        TYPE_LOW_RESOLUTION,
        []
      ]);

      config.minResolutionByType[TYPE_VIDEO] = res - 1;
      config.minLongSideByType[TYPE_VIDEO] = fileInfo.width + 1;
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        ...deleteResult,
        TYPE_LOW_LONG_SIDE,
        []
      ]);

      config.minLongSideByType[TYPE_VIDEO] = fileInfo.width - 1;
      expect(
        await subject.detect(fileInfo, DbService.infoToRow(fileInfo), [])
      ).toEqual([...deleteResult, TYPE_HASH_MATCH, []]);
    });

    it("replace pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.image.jpg.default
      );
      const subject = new Subject(config);

      config.path = TestHelper.sampleFile.image.jpg.default;
      config.pHashIgnoreSameDir = false;
      config.minFileSizeByType[TYPE_IMAGE] = 1;
      config.minResolutionByType[TYPE_IMAGE] = 1;
      config.minLongSideByType[TYPE_IMAGE] = 1;
      const dummyStoredFileInfo = {
        ...DbService.infoToRow({
          ...fileInfo,
          to_path: fileInfo.from_path
        }),
        d_hash_distance: 0,
        p_hash_distance: 0
      };
      // low file size
      expect(
        await subject.detect(
          { ...fileInfo, size: config.minFileSizeByType[TYPE_IMAGE] },
          null,
          [
            {
              ...dummyStoredFileInfo,
              size: config.minFileSizeByType[TYPE_IMAGE] * 2
            }
          ]
        )
      ).toEqual([
        TYPE_DELETE,
        expect.objectContaining({
          from_path: TestHelper.sampleFile.image.jpg.default,
          d_hash_distance: 0,
          p_hash_distance: 0
        }),
        "TYPE_P_HASH_REJECT_LOW_FILE_SIZE",
        []
      ]);
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
      ).toEqual([
        TYPE_DELETE,
        expect.objectContaining({
          from_path: TestHelper.sampleFile.image.jpg.default,
          d_hash_distance: 0,
          p_hash_distance: 0
        }),
        TYPE_P_HASH_REJECT_LOW_RESOLUTION,
        []
      ]);
      // newer
      expect(
        await subject.detect(
          { ...fileInfo, timestamp: fileInfo.timestamp + 1 },
          null,
          [dummyStoredFileInfo]
        )
      ).toEqual([
        TYPE_DELETE,
        expect.objectContaining({
          from_path: TestHelper.sampleFile.image.jpg.default,
          d_hash_distance: 0,
          p_hash_distance: 0
        }),
        TYPE_P_HASH_REJECT_NEWER,
        []
      ]);
      // replace
      expect(
        await subject.detect(fileInfo, null, [dummyStoredFileInfo])
      ).toEqual([TYPE_REPLACE, dummyStoredFileInfo, TYPE_P_HASH_MATCH, []]);
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
        null,
        TYPE_NO_PROBLEM,
        []
      ]);
    });

    it("relocate pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      config.relocate = true;
      const subject = new Subject(config);

      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_HOLD,
        null,
        TYPE_HASH_MISMATCH_RELOCATE,
        []
      ]);

      expect(
        await subject.detect(fileInfo, DbService.infoToRow(fileInfo), [])
      ).toEqual([
        TYPE_RELOCATE,
        DbService.infoToRow(fileInfo),
        TYPE_HASH_MATCH_RELOCATE,
        []
      ]);
    });
  });
});