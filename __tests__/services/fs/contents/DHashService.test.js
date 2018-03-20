/** @flow */

import { default as Subject } from "../../../../src/services/fs/contents/DHashService";
import TestHelper from "../../../../src/helpers/TestHelper";

jest.setTimeout(20000);
describe(Subject.name, () => {
  let subject;
  beforeEach(() => {
    const config = TestHelper.createDummyConfig();
    subject = new Subject(config);
  });
  describe("calculate", () => {
    it("png", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.image.png.default)
      ).toBe("8102699993036934000");
    });

    it("jpg", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.image.jpg.default)
      ).toBe("3698360429560414000");
    });

    it("empty", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.image.jpg.empty)
      ).toBeUndefined();
    });
  });
});
