/** @flow */

import { default as Subject } from "../../../../src/services/fs/contents/HashService";
import AttributeService from "../../../../src/services/fs/AttributeService";
import TestHelper from "../../../../src/helpers/TestHelper";

jest.setTimeout(15000);
describe(Subject.name, () => {
  let subject;
  beforeEach(() => {
    const config = TestHelper.createDummyConfig();
    const as = new AttributeService(config);
    subject = new Subject(config, as);
  });
  describe("calculate", () => {
    it("video", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.video.mkv.default)
      ).toBe("46cf38c05e540a341c816e4a402e0988f3a074eb");
    });
    it("png", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.image.png.default)
      ).toBe("7ea1e8201e1e72ac73bfcd3a112cff9baec682db");
    });
    it("jpg", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.image.jpg.default)
      ).toBe("dd82c626ec0047df4caf1309b8e4008b072e2627");
    });
    it("scrap", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.misc.txt.default)
      ).toBe("");
    });
    it("unknown", async () => {
      expect(
        await subject.calculate(TestHelper.sampleFile.misc.unknown.default)
      ).toBe("");
    });
  });
});
