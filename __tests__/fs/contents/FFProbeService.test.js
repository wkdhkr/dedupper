/** @flow */

import { default as Subject } from "../../../src/services/fs/contents/FFProbeService";
import TestHelper from "../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let subject;
  beforeAll(() => {
    subject = new Subject();
  });
  describe("read", () => {
    it("get mkv file resolution", async () => {
      expect(
        await subject.read(TestHelper.sampleFile.video.mkv.default)
      ).toMatchObject({
        width: 320,
        height: 240,
        ratio: 320 / 240,
        damaged: false
      });
    });
    it("fail with empty file", async () => {
      expect(
        await subject.read(TestHelper.sampleFile.video.mkv.empty)
      ).toMatchObject({
        width: 0,
        height: 0,
        ratio: 0,
        damaged: true
      });
    });
    it("fail with corrupt file", async () => {
      expect(
        await subject.read(TestHelper.sampleFile.video.mkv.corrupt)
      ).toMatchObject({
        width: 320,
        height: 240,
        ratio: 320 / 240,
        damaged: true
      });
    });
  });
});
