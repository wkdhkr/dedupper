/** @flow */

import { default as Subject } from "../../../../src/services/fs/contents/ImageMagickService";
import TestHelper from "../../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let subject;
  beforeAll(() => {
    subject = new Subject();
  });
  describe("identify", () => {
    it("png", async () => {
      expect(
        await subject.identify(TestHelper.sampleFile.image.png.default)
      ).toEqual({
        hash:
          "6d64091e2673c43e18b3beb9ba75be3778cc6042abcf70ef6ccb34bdb04bc4a9",
        height: 240,
        damaged: false,
        ratio: 250 / 240,
        width: 250
      });
    });
    it("jpg", async () => {
      expect(
        await subject.identify(TestHelper.sampleFile.image.jpg.default)
      ).toEqual({
        hash:
          "f7680c47177100866759ac2029edc15bfd092d923f858547a5234c2ddbced40b",
        height: 479,
        damaged: false,
        ratio: 500 / 479,
        width: 500
      });
    });
    it("empty", async () => {
      expect(
        await subject.identify(TestHelper.sampleFile.image.jpg.empty)
      ).toEqual({
        hash: "",
        height: 0,
        damaged: true,
        ratio: 0,
        width: 0
      });
    });
    it("not found", async () => {
      expect(
        await subject.identify(TestHelper.sampleFile.image.jpg.notfound)
      ).toEqual({
        hash: "",
        height: 0,
        damaged: true,
        ratio: 0,
        width: 0
      });
    });
    it("corrupt", async () => {
      expect(
        await subject.identify(TestHelper.sampleFile.image.jpg.corrupt)
      ).toEqual({
        hash:
          "d54bc2020758ab4bfac944164f6e74e5ba8d0be4a68a9903c31f64b4cf1345c8",
        height: 479,
        damaged: true,
        ratio: 500 / 479,
        width: 500
      });
    });
  });
});
