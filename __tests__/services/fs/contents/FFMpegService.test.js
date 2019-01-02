/** @flow */

import { default as Subject } from "../../../../src/services/fs/contents/FFMpegService";
import TestHelper from "../../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../../../src/services/fs/contents/FFMpegService"))
      .default;

  describe("read", () => {
    it("get mp3 file hash", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout: "MD5=aaa",
            stderr: ""
          })
      }));
      const FFMpegService = await loadSubject();
      const subject = new FFMpegService();
      expect(
        await subject.read(TestHelper.sampleFile.audio.mp3.default)
      ).toMatchObject({
        hash: "aaa",
        damaged: false
      });
    });
  });
});
