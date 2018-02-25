/** @flow */

import { default as Subject } from "../../../../src/services/fs/contents/ImageMagickService";
import TestHelper from "../../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../../../src/services/fs/contents/ImageMagickService"))
      .default;

  describe("identify", () => {
    it("png", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout:
              "250,240,6d64091e2673c43e18b3beb9ba75be3778cc6042abcf70ef6ccb34bdb04bc4a9",
            stderr: ""
          })
      }));
      const C = await loadSubject();
      const subject = new C();
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
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout:
              "500,479,f7680c47177100866759ac2029edc15bfd092d923f858547a5234c2ddbced40b",
            stderr: ""
          })
      }));
      const C = await loadSubject();
      const subject = new C();
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
      jest.doMock("child-process-promise", () => ({
        exec: () => Promise.reject(new Error("error"))
      }));
      const C = await loadSubject();
      const subject = new C();
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
      jest.doMock("child-process-promise", () => ({
        exec: () => Promise.reject(new Error("error"))
      }));
      const C = await loadSubject();
      const subject = new C();
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
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout:
              "500,479,d54bc2020758ab4bfac944164f6e74e5ba8d0be4a68a9903c31f64b4cf1345c8",
            stderr: "ERROR"
          })
      }));
      const C = await loadSubject();
      const subject = new C();
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

  describe("statistic", () => {
    it("png", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout: "0.563863,92,26687.8",
            stderr: ""
          })
      }));
      const C = await loadSubject();
      const subject = new C();
      expect(
        await subject.statistic(TestHelper.sampleFile.image.png.default)
      ).toEqual({
        entropy: 0.563863,
        quality: 92,
        mean: 26687.8
      });
    });
    it("jpg", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout: "0.781471,85,40429.2",
            stderr: ""
          })
      }));
      const C = await loadSubject();
      const subject = new C();
      expect(
        await subject.statistic(TestHelper.sampleFile.image.jpg.default)
      ).toEqual({
        entropy: 0.781471,
        quality: 85,
        mean: 40429.2
      });
    });
    it("empty", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () => Promise.reject(new Error("Command failed"))
      }));
      const C = await loadSubject();
      const subject = new C();
      expect(
        await subject
          .statistic(TestHelper.sampleFile.image.jpg.empty)
          .catch(({ message }) => message)
      ).toContain("Command failed");
    });
    it("not found", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () => Promise.reject(new Error("Command failed"))
      }));
      const C = await loadSubject();
      const subject = new C();
      expect(
        await subject
          .statistic(TestHelper.sampleFile.image.jpg.notfound)
          .catch(({ message }) => message)
      ).toContain("Command failed");
    });
    it("corrupt", async () => {
      jest.doMock("child-process-promise", () => ({
        exec: () =>
          Promise.resolve({
            stdout: "",
            stderr: "ERROR"
          })
      }));
      const C = await loadSubject();
      const subject = new C();
      expect(
        await subject
          .statistic(TestHelper.sampleFile.image.jpg.corrupt)
          .catch(({ message }) => message)
      ).toContain("imageMagick statistic error");
    });
  });
});
