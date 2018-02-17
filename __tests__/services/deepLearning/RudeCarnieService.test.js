/** @flow */

import TestHelper from "../../../src/helpers/TestHelper";

describe("RudeCarnieService", () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });

  const loadSubject = async () =>
    import("../../../src/services/deepLearning/RudeCarnieService");

  describe("isAcceptable", () => {
    it("false", async () => {
      jest.mock("axios", () => ({
        post: jest
          .fn()
          .mockImplementationOnce(() =>
            Promise.resolve({
              data: []
            })
          )
          .mockImplementationOnce(() =>
            Promise.resolve({
              data: [
                { prediction: "(4, 6)", prev_prediction: "F" },
                { prediction: "(25, 32)", prev_prediction: "F" },
                { prediction: "(25, 32)", prev_prediction: "F" }
              ]
            })
          )
      }));

      config.deepLearningConfig.faceMode = "allow";
      config.deepLearningConfig.faceCategories = [["M", "(4, 6)"]];
      const { default: RudeCarnieService } = await loadSubject();
      const subject = new RudeCarnieService(config);
      expect(
        await subject.isAcceptable(TestHelper.sampleFile.image.jpg.default)
      ).toBeFalsy();
    });

    it("true", async () => {
      jest.mock("axios", () => ({
        post: jest
          .fn()
          .mockImplementationOnce(() =>
            Promise.resolve({
              data: []
            })
          )
          .mockImplementationOnce(() =>
            Promise.resolve({
              data: [
                { prediction: "(4, 6)", prev_prediction: "F" },
                { prediction: "(25, 32)", prev_prediction: "F" },
                { prediction: "(25, 32)", prev_prediction: "F" }
              ]
            })
          )
      }));

      config.deepLearningConfig.faceMode = "allow";
      config.deepLearningConfig.faceCategories = [
        ["F", "(4, 6)"],
        ["F", "(8, 12)"],
        ["F", "(15, 20)"],
        ["F", "(25, 32)"],
        ["F", "(38, 43)"],
        ["F", "(48, 53)"]
      ];
      const { default: RudeCarnieService } = await loadSubject();
      const subject = new RudeCarnieService(config);
      expect(
        await subject.isAcceptable(TestHelper.sampleFile.image.jpg.default)
      ).toBeTruthy();
    });
  });
});
