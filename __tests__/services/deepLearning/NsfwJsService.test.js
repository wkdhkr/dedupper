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
        { className: "Drawing", probability: 0.9298348426818848 },
        { className: "Hentai", probability: 0.0674789547920227 },
        { className: "Neutral", probability: 0.001884751720353961 },
        { className: "Porn", probability: 0.000776403583586216 },
        { className: "Sexy", probability: 0.000024786762878648005 }
      ]);
      end = new Date() - start;
      console.log(`execution time 1: ${end}ms`);
      start = new Date();
      expect(
        await subject.predict(TestHelper.sampleFile.image.jpg.default)
      ).toEqual([
        { className: "Neutral", probability: 0.9606250524520874 },
        { className: "Drawing", probability: 0.036601193249225616 },
        { className: "Hentai", probability: 0.0022417474538087845 },
        { className: "Porn", probability: 0.0004968461580574512 },
        { className: "Sexy", probability: 0.000035070537705905735 }
      ]);
      end = new Date() - start;
      console.log(`execution time 2: ${end}ms`);
    });
    it("error", async () => {
      const { default: NsfwJsService } = await loadSubject();
      const subject = new NsfwJsService(config);
      await expect(
        subject.predict(TestHelper.sampleFile.image.jpg.notfound)
      ).rejects.toThrow("ENOENT");
    });
  });
});
