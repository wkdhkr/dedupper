/** @flow */

import TestHelper from "../../../src/helpers/TestHelper";

describe("DeepLearningService", () => {
  let config;
  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });

  const loadSubject = async () =>
    import("../../../src/services/deepLearning/DeepLearningService");

  describe("isAcceptable", () => {
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
      expect(await subject.isAcceptable("test.jpg")).toBeFalsy();
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
      expect(await subject.isAcceptable("test.jpg")).toBeTruthy();
    });

    it("or + use RudeCarnie", async () => {
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
      expect(await subject.isAcceptable("test.jpg")).toBeTruthy();
    });
  });
});
