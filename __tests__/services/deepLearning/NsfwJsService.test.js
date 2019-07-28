/** @flow */

import TestHelper from "../../../src/helpers/TestHelper";

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
        { className: "Drawing", probability: 0.9298499822616577 },
        { className: "Hentai", probability: 0.06746610254049301 },
        { className: "Neutral", probability: 0.0018833467038348317 },
        { className: "Porn", probability: 0.0007759135914966464 },
        { className: "Sexy", probability: 0.00002476646659488324 }
      ]);
      end = new Date() - start;
      console.log(`execution time 1: ${end}ms`);
      start = new Date();
      expect(
        await subject.predict(TestHelper.sampleFile.image.jpg.default)
      ).toEqual([
        { className: "Neutral", probability: 0.9606342315673828 },
        { className: "Drawing", probability: 0.03659099340438843 },
        { className: "Hentai", probability: 0.00224288715980947 },
        { className: "Porn", probability: 0.0004970461595803499 },
        { className: "Sexy", probability: 0.00003508067311486229 }
      ]);
      end = new Date() - start;
      console.log(`execution time 2: ${end}ms`);
    });
    it("error", async () => {
      const { default: NsfwJsService } = await loadSubject();
      const subject = new NsfwJsService(config);
      await expect(
        subject.predict(TestHelper.sampleFile.image.jpg.notfound)
        // ).rejects.toThrow("ENOENT"); // for new canvas version
      ).rejects.toThrow("input stream");
    });
  });
});
