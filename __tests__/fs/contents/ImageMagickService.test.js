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
        await subject.isDamaged(`${TestHelper.sampleDir}firefox.png`)
      ).toBe(false);
    });
    it("jpg", async () => {
      expect(
        await subject.isDamaged(`${TestHelper.sampleDir}firefox.jpg`)
      ).toBe(false);
    });
    it("empty", async () => {
      expect(await subject.isDamaged(`${TestHelper.sampleDir}empty.jpg`)).toBe(
        true
      );
    });
    it("not found", async () => {
      expect(
        await subject.isDamaged(`${TestHelper.sampleDir}notfound.jpg`)
      ).toBe(true);
    });
    it("corrupt", async () => {
      expect(
        await subject.isDamaged(`${TestHelper.sampleDir}firefox_corrupt.jpg`)
      ).toBe(true);
    });
  });
});
