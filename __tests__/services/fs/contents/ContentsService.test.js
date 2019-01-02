/** @flow */

import { default as Subject } from "../../../../src/services/fs/contents/ContentsService";
import AttributeService from "../../../../src/services/fs/AttributeService";
import TestHelper from "../../../../src/helpers/TestHelper";

jest.setTimeout(60000);
describe(Subject.name, () => {
  let config;
  let as;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
    as = new AttributeService(config);
  });
  describe("readInfo, calcuateHash, calculatePHash", () => {
    it("video", async () => {
      config.path = TestHelper.sampleFile.video.mkv.default;
      const subject = new Subject(config, as);
      expect(await subject.readInfo()).toEqual({
        damaged: false,
        height: 240,
        ratio: 320 / 240,
        width: 320,
        hash: "46cf38c05e540a341c816e4a402e0988f3a074eb"
      });
      expect(await subject.calculateHash()).toBe(
        "46cf38c05e540a341c816e4a402e0988f3a074eb"
      );
      expect(await subject.calculatePHash()).toBeUndefined();
    });

    it("jpg", async () => {
      config.path = TestHelper.sampleFile.image.jpg.default;
      const subject = new Subject(config, as);
      expect(await subject.readInfo()).toMatchObject({
        damaged: false,
        height: 479,
        ratio: 500 / 479,
        width: 500
      });
      expect(await subject.calculateHash()).toBe(
        "dd82c626ec0047df4caf1309b8e4008b072e2627"
      );
      expect(await subject.calculatePHash()).toBe("7856513260241168089");
    });

    it("png", async () => {
      config.path = TestHelper.sampleFile.image.png.default;
      const subject = new Subject(config, as);
      expect(await subject.readInfo()).toMatchObject({
        damaged: false,
        height: 240,
        ratio: 250 / 240,
        width: 250
      });
      expect(await subject.calculateHash()).toBe(
        "7ea1e8201e1e72ac73bfcd3a112cff9baec682db"
      );
      expect(await subject.calculatePHash()).toBe("54086765383280");
    });

    it("empty", async () => {
      config.path = TestHelper.sampleFile.image.jpg.empty;
      const subject = new Subject(config, as);
      expect(await subject.readInfo()).toMatchObject({
        damaged: true,
        height: 0,
        ratio: 0,
        width: 0
      });
      expect(await subject.calculateHash()).toBe(
        "da39a3ee5e6b4b0d3255bfef95601890afd80709"
      );
      expect(await subject.calculatePHash()).toBeUndefined();
    });

    it("txt", async () => {
      config.path = TestHelper.sampleFile.misc.txt.default;
      const subject = new Subject(config, as);
      expect(await subject.readInfo()).toMatchObject({
        damaged: false,
        height: 0,
        ratio: 0,
        width: 0
      });
    });

    it("audio", async () => {
      const hash = "da39a3ee5e6b4b0d3255bfef95601890afd80709";
      config.path = TestHelper.sampleFile.audio.mp3.default;
      const subject = new Subject(config, as);
      expect(await subject.readInfo()).toEqual({
        damaged: false,
        height: 0,
        ratio: 0,
        width: 0,
        hash
      });
      expect(await subject.calculatePHash()).toBeUndefined();
    });
  });
});
