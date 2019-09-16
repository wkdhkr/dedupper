/** @flow */

import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";

import type { FileInfo } from "../../../src/types";

jest.setTimeout(60000);
describe("DeepLearningService", () => {
  let config;
  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });

  const loadSubject = async () =>
    import("../../../src/services/deepLearning/DeepLearningService");

  const createFileInfo = (targetPath: string): Promise<FileInfo> =>
    new FileService({ ...config, path: targetPath }).collectFileInfo();

  describe("isAcceptable", () => {
    it("not image", async () => {
      config.deepLearningConfig.logicalOperation = "and";
      const { default: DeepLearningService } = await loadSubject();

      const subject = new DeepLearningService(config);
      expect(
        await subject.isAcceptable(
          await createFileInfo(TestHelper.sampleFile.video.mkv.default)
        )
      ).toBeTruthy();
    });

    it("and", async () => {
      config.deepLearningConfig.logicalOperation = "and";
      jest.mock(
        "../../../src/services/deepLearning/OpenNsfwService",
        () =>
          class C {
            isAcceptable = async () => false;
          }
      );
      const { default: DeepLearningService } = await loadSubject();

      const subject = new DeepLearningService(config);
      expect(
        await subject.isAcceptable(
          await createFileInfo(TestHelper.sampleFile.image.jpg.default)
        )
      ).toBeFalsy();
    });

    it("or", async () => {
      config.deepLearningConfig.logicalOperation = "or";
      jest.mock(
        "../../../src/services/deepLearning/OpenNsfwService",
        () =>
          class C {
            isAcceptable = async () => true;
          }
      );
      const { default: DeepLearningService } = await loadSubject();

      const subject = new DeepLearningService(config);
      expect(
        await subject.isAcceptable(
          await createFileInfo(TestHelper.sampleFile.image.jpg.default)
        )
      ).toBeTruthy();
    });

    it("or + use RudeCarnie", async () => {
      config.deepLearningConfig.faceBackEnd = "RudeCarnie";
      config.deepLearningConfig.logicalOperation = "or";
      jest.mock(
        "../../../src/services/deepLearning/OpenNsfwService",
        () =>
          class C {
            isAcceptable = async () => false;
          }
      );
      jest.mock(
        "../../../src/services/deepLearning/RudeCarnieService",
        () =>
          class C {
            isAcceptable = async () => true;
          }
      );
      const { default: DeepLearningService } = await loadSubject();

      const subject = new DeepLearningService(config);
      expect(
        await subject.isAcceptable(
          await createFileInfo(TestHelper.sampleFile.image.jpg.default)
        )
      ).toBeTruthy();
    });

    it("and + mode = none", async () => {
      config.deepLearningConfig.logicalOperation = "and";
      config.deepLearningConfig.nsfwMode = "none";
      config.deepLearningConfig.faceMode = "none";
      const { default: DeepLearningService } = await loadSubject();

      const subject = new DeepLearningService(config);
      expect(
        await subject.isAcceptable(
          await createFileInfo(TestHelper.sampleFile.image.jpg.default)
        )
      ).toBeTruthy();
    });
  });
});
