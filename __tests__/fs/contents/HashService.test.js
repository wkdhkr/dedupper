/** @flow */

import { default as Subject } from "../../../src/services/fs/contents/HashService";
import AttributeService from "../../../src/services/fs/AttributeService";
import TestHelper from "../../../src/helpers/TestHelper";

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
        await subject.calculate(
          `${TestHelper.sampleDir}SampleVideo_360x240_1mb.mkv`
        )
      ).toBe("46cf38c05e540a341c816e4a402e0988f3a074eb");
    });
    it("png", async () => {
      expect(
        await subject.calculate(`${TestHelper.sampleDir}firefox.png`)
      ).toBe("292a32f5d496f6d0883a31df5fae14f289c7f075");
    });
    it("jpg", async () => {
      expect(
        await subject.calculate(`${TestHelper.sampleDir}firefox.jpg`)
      ).toBe("dd82c626ec0047df4caf1309b8e4008b072e2627");
    });
  });
});
