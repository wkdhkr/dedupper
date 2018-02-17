/** @flow */

import TestHelper from "../../../src/helpers/TestHelper";

describe("OpenNsfwService", () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });

  const loadSubject = async () =>
    import("../../../src/services/deepLearning/OpenNsfwService");

  describe("isAcceptable", () => {
    it("true", async () => {
      jest.mock("axios", () => ({
        post: () => Promise.resolve({ data: { nsfw: 0.6, sfw: 0.4 } })
      }));
      config.deepLearningConfig.nsfwType = "nsfw";
      config.deepLearningConfig.nsfwMode = "allow";
      config.deepLearningConfig.nsfwThreshold = 0.5;
      const { default: OpenNsfwService } = await loadSubject();
      const subject = new OpenNsfwService(config);
      expect(
        await subject.isAcceptable(TestHelper.sampleFile.image.jpg.default)
      ).toBeTruthy();
    });

    it("false", async () => {
      jest.mock("axios", () => ({
        post: () => Promise.resolve({ data: { nsfw: 0.6, sfw: 0.4 } })
      }));
      config.deepLearningConfig.nsfwType = "nsfw";
      config.deepLearningConfig.nsfwMode = "allow";
      config.deepLearningConfig.nsfwThreshold = 0.7;
      const { default: OpenNsfwService } = await loadSubject();
      const subject = new OpenNsfwService(config);
      expect(
        await subject.isAcceptable(TestHelper.sampleFile.image.jpg.default)
      ).toBeFalsy();
    });
  });
});
