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
        await subject.read(`${TestHelper.sampleDir}SampleVideo_360x240_1mb.mkv`)
      ).toMatchObject({
        width: 320,
        height: 240,
        ratio: 320 / 240,
        damaged: false
      });
    });
    it("fail with empty file", async () => {
      expect(
        await subject.read(`${TestHelper.sampleDir}notfound.mkv`)
      ).toMatchObject({
        width: 0,
        height: 0,
        ratio: 0,
        damaged: true
      });
    });
    it("fail with corrupt file", async () => {
      expect(
        await subject.read(
          `${TestHelper.sampleDir}SampleVideo_360x240_1mb_corrupt.mkv`
        )
      ).toMatchObject({
        width: 320,
        height: 240,
        ratio: 320 / 240,
        damaged: true
      });
    });
  });
});
