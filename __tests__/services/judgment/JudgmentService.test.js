/** @flow */
import path from "path";
import { default as Subject } from "../../../src/services/judgment/JudgmentService";
import FileService from "../../../src/services/fs/FileService";
import ExaminationService from "../../../src/services/ExaminationService";
import DbService from "../../../src/services/db/DbService";
import TestHelper from "../../../src/helpers/TestHelper";
import {
  TYPE_IMAGE,
  TYPE_VIDEO,
  TYPE_SCRAP
} from "../../../src/types/ClassifyTypes";
import {
  TYPE_HOLD,
  TYPE_DELETE,
  TYPE_SAVE,
  TYPE_REPLACE,
  TYPE_RELOCATE,
  TYPE_TRANSFER
} from "../../../src/types/ActionTypes";
import {
  TYPE_P_HASH_MAY_BE,
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
  TYPE_P_HASH_REJECT_NEWER,
  TYPE_FILE_MARK_DEDUPE,
  TYPE_DEEP_LEARNING,
  TYPE_FILE_MARK_HOLD,
  TYPE_FILE_MARK_BLOCK,
  TYPE_FILE_MARK_ERASE,
  TYPE_FILE_MARK_SAVE,
  TYPE_FILE_MARK_REPLACE,
  TYPE_SWEEP_DEDUPPER_FILE,
  TYPE_KEEP_DEDUPPER_FILE,
  TYPE_P_HASH_REJECT_LOW_QUALITY,
  TYPE_P_HASH_REJECT_DIFFERENT_MEAN,
  TYPE_P_HASH_REJECT_LOW_ENTROPY,
  TYPE_P_HASH_MATCH_KEEPING,
  TYPE_P_HASH_MATCH_WILL_KEEP,
  TYPE_P_HASH_MATCH_TRANSFER,
  TYPE_FILE_MARK_TRANSFER,
  TYPE_HASH_MATCH_TRANSFER,
  TYPE_FILE_NAME_MATCH
} from "../../../src/types/ReasonTypes";
import {
  STATE_BLOCKED,
  STATE_DEDUPED,
  STATE_KEEPING
} from "../../../src/types/FileStates";
import { MARK_REPLACE } from "../../../src/types/FileNameMarks";
import type { FileInfo } from "../../../src/types";

jest.setTimeout(15000);
describe(Subject.name, () => {
  let config;
  const deleteResult = [TYPE_DELETE, null];

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
    config.instantDelete = true;
  });

  const loadSubject = async () =>
    (await import("../../../src/services/judgment/JudgmentService")).default;

  const createFileInfo = (targetPath: string): Promise<FileInfo> =>
    new FileService({ ...config, path: targetPath }).collectFileInfo();

  describe("filter functions", () => {
    it("detectDeleteState", () => {
      const subject = new Subject(config);

      expect(subject.detectDeleteState(TYPE_FILE_MARK_DEDUPE)).toBe(
        STATE_DEDUPED
      );
      expect(subject.detectDeleteState(TYPE_DEEP_LEARNING)).toBe(STATE_BLOCKED);
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
        await subject.detect(
          { ...fileInfo, from_path: "C:\\NG_WORD.txt" },
          null,
          []
        )
      ).toEqual([...deleteResult, TYPE_NG_FILE_NAME, []]);

      expect(
        await subject.detect({ ...fileInfo, from_path: "C:\\ng.txt" }, null, [])
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

      expect(
        await subject.detect(
          { ...fileInfo, state: STATE_KEEPING },
          DbService.infoToRow(fileInfo),
          []
        )
      ).toEqual([
        TYPE_TRANSFER,
        expect.objectContaining({
          from_path: path.resolve(TestHelper.sampleFile.video.mkv.default)
        }),
        TYPE_HASH_MATCH_TRANSFER,
        []
      ]);
    });

    it("replace pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.image.jpg.default
      );
      const subject = new Subject(config);

      config.deepLearningConfig.faceMode = "none";
      config.deepLearningConfig.nsfwMode = "none";
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
          from_path: path.resolve(TestHelper.sampleFile.image.jpg.default),
          d_hash_distance: 0,
          p_hash_distance: 0
        }),
        TYPE_P_HASH_REJECT_LOW_FILE_SIZE,
        []
      ]);
      // low resolution
      expect(
        await subject.detect(
          {
            ...fileInfo,
            width: fileInfo.width * 0.1,
            height: fileInfo.height * 0.1
          },
          null,
          [dummyStoredFileInfo]
        )
      ).toEqual([
        TYPE_DELETE,
        expect.objectContaining({
          from_path: path.resolve(TestHelper.sampleFile.image.jpg.default),
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
          from_path: path.resolve(TestHelper.sampleFile.image.jpg.default),
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

    it("replace pattern with keep mode", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.image.jpg.default
      );
      const subject = new Subject(config);

      config.keep = true;
      config.deepLearningConfig.faceMode = "none";
      config.deepLearningConfig.nsfwMode = "none";
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
      const dummyKeepingStoredFileInfo = {
        ...dummyStoredFileInfo,
        state: DbService.lookupFileStateDivision(STATE_KEEPING)
      };
      // low file size
      expect(
        await subject.detect(
          {
            ...fileInfo,
            size: config.minFileSizeByType[TYPE_IMAGE],
            state: STATE_KEEPING
          },
          null,
          [
            {
              ...dummyStoredFileInfo,
              size: config.minFileSizeByType[TYPE_IMAGE] * 2
            }
          ]
        )
      ).toEqual([
        TYPE_HOLD,
        null,
        TYPE_P_HASH_MAY_BE,
        [
          [
            TYPE_SAVE,
            expect.objectContaining({
              name: "firefox"
            }),
            TYPE_P_HASH_MATCH_WILL_KEEP
          ]
        ]
      ]);
      // replace
      expect(
        await subject.detect(fileInfo, null, [dummyKeepingStoredFileInfo])
      ).toEqual([
        TYPE_HOLD,
        null,
        TYPE_P_HASH_MAY_BE,
        [
          [
            TYPE_SAVE,
            expect.objectContaining({
              name: "firefox"
            }),
            TYPE_P_HASH_MATCH_KEEPING
          ]
        ]
      ]);
      expect(
        await subject.detect({ ...fileInfo, state: STATE_KEEPING }, null, [
          dummyKeepingStoredFileInfo
        ])
      ).toEqual([
        TYPE_HOLD,
        null,
        TYPE_P_HASH_MAY_BE,
        [
          [
            TYPE_SAVE,
            expect.objectContaining({
              name: "firefox"
            }),
            TYPE_P_HASH_MATCH_KEEPING
          ]
        ]
      ]);
      expect(
        await subject.detect({ ...fileInfo, state: STATE_KEEPING }, null, [
          dummyStoredFileInfo
        ])
      ).toEqual([
        TYPE_TRANSFER,
        expect.objectContaining({
          name: "firefox"
        }),
        TYPE_P_HASH_MATCH_TRANSFER,
        []
      ]);
    });

    it("statistic pattern", async () => {
      jest.doMock(
        "../../../src/services/fs/contents/ImageMagickService",
        () =>
          class C {
            statistic = jest
              .fn()
              // different mean
              .mockImplementationOnce(() =>
                Promise.resolve({
                  entropy: 0,
                  quality: 0,
                  mean: 9999
                })
              )
              .mockImplementationOnce(() =>
                Promise.resolve({
                  entropy: 0,
                  quality: 0,
                  mean: 0
                })
              )
              // low entropy
              .mockImplementationOnce(() =>
                Promise.resolve({
                  entropy: 0,
                  quality: 0,
                  mean: 0
                })
              )
              .mockImplementationOnce(() =>
                Promise.resolve({
                  entropy: 9999,
                  quality: 0,
                  mean: 0
                })
              )
              // low quality
              .mockImplementationOnce(() =>
                Promise.resolve({
                  entropy: 0,
                  quality: 1000,
                  mean: 0
                })
              )
              .mockImplementationOnce(() =>
                Promise.resolve({
                  entropy: 0,
                  quality: 9999,
                  mean: 0
                })
              );
          }
      );
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.image.jpg.default
      );
      config.deepLearningConfig.faceMode = "none";
      config.deepLearningConfig.nsfwMode = "none";
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

      const JudgmentService = await loadSubject();
      const subject = new JudgmentService(config);

      expect(
        await subject.detect(fileInfo, null, [dummyStoredFileInfo])
      ).toEqual([
        TYPE_HOLD,
        null,
        TYPE_P_HASH_MAY_BE,
        [
          [
            TYPE_HOLD,
            expect.objectContaining({
              name: "firefox"
            }),
            TYPE_P_HASH_REJECT_DIFFERENT_MEAN
          ]
        ]
      ]);

      expect(
        await subject.detect(fileInfo, null, [dummyStoredFileInfo])
      ).toEqual([
        TYPE_DELETE,
        expect.objectContaining({
          name: "firefox"
        }),
        TYPE_P_HASH_REJECT_LOW_ENTROPY,
        []
      ]);

      expect(
        await subject.detect(fileInfo, null, [dummyStoredFileInfo])
      ).toEqual([
        TYPE_DELETE,
        expect.objectContaining({
          name: "firefox"
        }),
        TYPE_P_HASH_REJECT_LOW_QUALITY,
        []
      ]);
    });

    it("file name hit pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      const dummyFileInfo = DbService.infoToRow(fileInfo);
      config.deepLearningConfig.faceMode = "none";
      config.deepLearningConfig.nsfwMode = "none";
      config.minFileSizeByType[TYPE_VIDEO] = 1;
      config.minResolutionByType[TYPE_VIDEO] = 1;
      config.useFileName = true;
      const subject = new Subject(config);

      expect(await subject.detect(fileInfo, null, [], [dummyFileInfo])).toEqual(
        [
          TYPE_HOLD,
          null,
          TYPE_FILE_NAME_MATCH,
          [
            [
              TYPE_HOLD,
              expect.objectContaining({
                name: "SampleVideo_360x240_1mb"
              }),
              TYPE_FILE_NAME_MATCH
            ]
          ]
        ]
      );
    });

    it("save pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      config.deepLearningConfig.faceMode = "none";
      config.deepLearningConfig.nsfwMode = "none";
      config.minFileSizeByType[TYPE_VIDEO] = 1;
      config.minResolutionByType[TYPE_VIDEO] = 1;
      const subject = new Subject(config);

      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_SAVE,
        null,
        TYPE_NO_PROBLEM,
        []
      ]);
    });

    it("deep learning pattern", async () => {
      jest.doMock(
        "../../../src/services/deepLearning/DeepLearningService",
        () =>
          class C {
            isAcceptable = async () => false;
          }
      );
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.image.jpg.default
      );
      config.minFileSizeByType[TYPE_VIDEO] = 1;
      config.minResolutionByType[TYPE_VIDEO] = 1;
      const JudgmentService = await loadSubject();
      const subject = new JudgmentService(config);

      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_HOLD,
        null,
        TYPE_DEEP_LEARNING,
        []
      ]);

      config.deepLearningConfig.instantDelete = true;
      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_DELETE,
        null,
        TYPE_DEEP_LEARNING,
        []
      ]);
    });

    it("dedupper cache delete pattern", async () => {
      jest.doMock(
        "../../../src/services/fs/FileCacheService",
        () =>
          class C {
            isCacheFileActive = () => false;
          }
      );
      const fileInfo = await createFileInfo(
        `${TestHelper.sampleFile.image.jpg.default}.dpcache`
      );
      const JudgmentService = await loadSubject();
      const subject = new JudgmentService(config);

      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_DELETE,
        null,
        TYPE_SWEEP_DEDUPPER_FILE,
        []
      ]);
    });

    it("dedupper cache keep pattern", async () => {
      jest.doMock(
        "../../../src/services/fs/FileCacheService",
        () =>
          class C {
            isCacheFileActive = () => true;
          }
      );
      const fileInfo = await createFileInfo(
        `${TestHelper.sampleFile.image.jpg.default}.dpcache`
      );
      const JudgmentService = await loadSubject();
      const subject = new JudgmentService(config);

      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_HOLD,
        null,
        TYPE_KEEP_DEDUPPER_FILE,
        []
      ]);
    });

    it("dedupper lock delete pattern", async () => {
      jest.doMock(
        "../../../src/services/fs/FileCacheService",
        () =>
          class C {
            isCacheFileActive = () => true;
          }
      );
      const fileInfo = await createFileInfo(
        `${TestHelper.sampleFile.image.jpg.default}.dplock`
      );
      const JudgmentService = await loadSubject();
      const subject = new JudgmentService(config);

      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_DELETE,
        null,
        TYPE_SWEEP_DEDUPPER_FILE,
        []
      ]);
    });

    describe("file mark pattern", () => {
      let subject;

      beforeEach(() => {
        config.deepLearningConfig.faceMode = "none";
        config.deepLearningConfig.nsfwMode = "none";
        config.minFileSizeByType[TYPE_VIDEO] = 1;
        config.minResolutionByType[TYPE_VIDEO] = 1;
        subject = new Subject(config);
      });

      const createMarkedFileInfo = async (targetPath, mark) => {
        config.path = targetPath;
        const fs = new FileService(config);
        const es = new ExaminationService(config, fs);
        const fileInfo = await createFileInfo(targetPath);
        fileInfo.from_path = es.createMarkedPath(mark);
        return fileInfo;
      };

      it("hold", async () => {
        const fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_HOLD
        );

        expect(await subject.detect(fileInfo, null, [])).toEqual([
          TYPE_HOLD,
          null,
          TYPE_FILE_MARK_HOLD,
          []
        ]);
      });

      it("block", async () => {
        const fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_BLOCK
        );

        expect(await subject.detect(fileInfo, null, [])).toEqual([
          TYPE_DELETE,
          null,
          TYPE_FILE_MARK_BLOCK,
          []
        ]);
      });

      it("dedupe", async () => {
        const fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_DEDUPE
        );

        expect(await subject.detect(fileInfo, null, [])).toEqual([
          TYPE_DELETE,
          null,
          TYPE_FILE_MARK_DEDUPE,
          []
        ]);
      });

      it("erase", async () => {
        const fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_ERASE
        );

        expect(await subject.detect(fileInfo, null, [])).toEqual([
          TYPE_DELETE,
          null,
          TYPE_FILE_MARK_ERASE,
          []
        ]);
      });

      it("save", async () => {
        let fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_SAVE
        );

        expect(await subject.detect(fileInfo, null, [])).toEqual([
          TYPE_SAVE,
          null,
          TYPE_FILE_MARK_SAVE,
          []
        ]);

        fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_REPLACE
        );

        expect(await subject.detect(fileInfo, null, [])).toEqual([
          TYPE_SAVE,
          null,
          TYPE_FILE_MARK_SAVE,
          []
        ]);

        fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_TRANSFER
        );

        expect(await subject.detect(fileInfo, null, [])).toEqual([
          TYPE_SAVE,
          null,
          TYPE_FILE_MARK_SAVE,
          []
        ]);
      });

      it("replace", async () => {
        const fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_REPLACE
        );

        const hashRow = DbService.infoToRow(fileInfo);

        expect(await subject.detect(fileInfo, null, [hashRow])).toEqual([
          TYPE_REPLACE,
          hashRow,
          TYPE_FILE_MARK_REPLACE,
          []
        ]);
      });

      it("replace with number", async () => {
        const fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.video.mkv.default,
          TYPE_FILE_MARK_REPLACE
        );

        jest.doMock("../../../src/helpers/FileNameMarkHelper", () => ({
          findReplaceFile: () => Promise.resolve(fileInfo.to_path),
          extract: () => new Set([MARK_REPLACE])
        }));

        const hashRow = DbService.infoToRow(fileInfo);

        const JudgmentService = await loadSubject();
        const js = new JudgmentService(config);
        expect(await js.detect(fileInfo, null, [hashRow])).toEqual([
          TYPE_REPLACE,
          hashRow,
          TYPE_FILE_MARK_REPLACE,
          []
        ]);
      });

      it("transfer", async () => {
        const fileInfo = await createMarkedFileInfo(
          TestHelper.sampleFile.image.jpg.default,
          TYPE_FILE_MARK_TRANSFER
        );

        const hashRow = DbService.infoToRow(fileInfo);

        expect(await subject.detect(fileInfo, null, [hashRow])).toEqual([
          TYPE_TRANSFER,
          hashRow,
          TYPE_FILE_MARK_TRANSFER,
          []
        ]);
      });
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

    it("library place pattern", async () => {
      const fileInfo = await createFileInfo(
        TestHelper.sampleFile.video.mkv.default
      );
      fileInfo.from_path = fileInfo.to_path;
      const subject = new Subject(config);

      expect(await subject.detect(fileInfo, null, [])).toEqual([
        TYPE_SAVE,
        null,
        TYPE_NO_PROBLEM,
        []
      ]);
    });
  });
});
