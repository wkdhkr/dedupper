/** @flow */

import { default as Subject } from "../../../src/services/fs/contents/ImageMagickService";
import TestHelper from "../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let subject;
  beforeAll(() => {
    subject = new Subject();
  });
  describe("isDamaged", () => {
    it("png", async () => {
      expect(
        await subject.isDamaged(TestHelper.sampleFile.image.png.default)
      ).toBe(false);
    });
    it("jpg", async () => {
      expect(
        await subject.isDamaged(TestHelper.sampleFile.image.jpg.default)
      ).toBe(false);
    });
    it("empty", async () => {
      expect(
        await subject.isDamaged(TestHelper.sampleFile.image.jpg.empty)
      ).toBe(true);
    });
    it("not found", async () => {
      expect(
        await subject.isDamaged(TestHelper.sampleFile.image.jpg.notfound)
      ).toBe(true);
    });
    it("corrupt", async () => {
      expect(
        await subject.isDamaged(TestHelper.sampleFile.image.jpg.corrupt)
      ).toBe(true);
    });
  });
});
