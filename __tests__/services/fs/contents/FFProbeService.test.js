/** @flow */

import { default as Subject } from "../../../../src/services/fs/contents/FFProbeService";
import TestHelper from "../../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../../../src/services/fs/contents/FFProbeService"))
      .default;

  describe("read", () => {
    it("get mkv file resolution", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout: "streams_stream_0_width=320\nstreams_stream_0_height=240",
            stderr: ""
          })
      }));
      const FFProbeService = await loadSubject();
      const subject = new FFProbeService();
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
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout: "",
            stderr: "ERROR"
          })
      }));
      const FFProbeService = await loadSubject();
      const subject = new FFProbeService();
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
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout: "streams_stream_0_width=320\nstreams_stream_0_height=240",
            stderr: "ERROR"
          })
      }));
      const FFProbeService = await loadSubject();
      const subject = new FFProbeService();
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
