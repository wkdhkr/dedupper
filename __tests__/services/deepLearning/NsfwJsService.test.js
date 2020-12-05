/** @flow */

import TestHelper from "../../../src/helpers/TestHelper";

const closeTo = (expected, precision = 2) => ({
  asymmetricMatch: actual => Math.abs(expected - actual) < 10 ** -precision / 2
});
jest.setTimeout(120000);
describe("NsfwJsService", () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });

  const loadSubject = async () =>
    import("../../../src/services/deepLearning/NsfwJsService");

  describe("predict", () => {
    it("ok", async () => {
      const { default: NsfwJsService } = await loadSubject();
      const subject = new NsfwJsService(config);
      let start;
      let end;
      start = new Date();
      expect(
        await subject.predict(TestHelper.sampleFile.image.png.anime)
      ).toEqual([
        { className: "Drawing", probability: closeTo(0.9298499822616577, 4) },
        { className: "Hentai", probability: closeTo(0.06746610254049301, 4) },
        {
          className: "Neutral",
          probability: closeTo(0.0018833467038348317, 5)
        },
        { className: "Porn", probability: closeTo(0.0007759135914966464, 4) },
        { className: "Sexy", probability: closeTo(0.00002476646659488324, 4) }
      ]);
      end = new Date() - start;
      console.log(`execution time 1: ${end}ms`);
      start = new Date();
      expect(
        await subject.predict(TestHelper.sampleFile.image.jpg.default)
      ).toEqual([
        { className: "Neutral", probability: closeTo(0.9606342315673828, 4) },
        { className: "Drawing", probability: closeTo(0.03659099340438843, 4) },
        { className: "Hentai", probability: closeTo(0.00224288715980947, 4) },
        { className: "Porn", probability: closeTo(0.0004970461595803499, 4) },
        { className: "Sexy", probability: closeTo(0.00003508067311486229, 4) }
      ]);
      end = new Date() - start;
      console.log(`execution time 2: ${end}ms`);
    });
    it("error", async () => {
      const { default: NsfwJsService } = await loadSubject();
      const subject = new NsfwJsService(config);
      await expect(
        subject.predict(TestHelper.sampleFile.image.jpg.notfound)
      ).rejects.toThrow("ENOENT"); // for new canvas version
      // ).rejects.toThrow("input stream"); // for old canvas version
    });
  });
});
