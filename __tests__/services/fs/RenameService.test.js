/** @flow */

import { default as Subject } from "../../../src/services/fs/RenameService";
import TestHelper from "../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let config;

  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });

  describe("converge", () => {
    it("dedupe", async () => {
      config.renameRules = [];
      const subject = new Subject(config);
      expect(
        subject.converge("C:\\aaa\\bbb\\ccc\\aaa\\aaa.mp4", "D:\\Video")
      ).toBe("D:\\Video\\aaa\\bbb\\ccc\\aaa.mp4");
      expect(
        subject.converge("D:\\aaa\\aaa\\aaa\\aaa\\01.mp4", "D:\\Video\\")
      ).toBe("D:\\Video\\aaa\\01.mp4");
      expect(
        subject.converge(
          "D:\\xyz\\aaa\\bbb\\aaa\\01.mp4",
          "D:\\Video\\xyz\\bbb"
        )
      ).toBe("D:\\Video\\xyz\\bbb\\xyz\\aaa\\bbb\\01.mp4");
    });

    it("no dir keep", async () => {
      config.dirKeep = false;
      const subject = new Subject(config);

      expect(
        subject.converge("C:\\aaa\\bbb\\ccc\\aaa\\aaa.mp4", "D:\\Video")
      ).toBe("D:\\Video\\aaa.mp4");
    });

    it("replace", async () => {
      config.renameRules = [
        ["aaa", "zzz"],
        [/\\ccc\\/, "\\"],
        ["あいうえお", "かきくけこ"]
      ];
      const subject = new Subject(config);

      expect(
        subject.converge("C:\\aaa\\bbb\\ccc\\aaa\\aaa.mp4", "D:\\Video")
      ).toBe("D:\\Video\\zzz\\bbb\\zzz.mp4");

      expect(
        subject.converge("C:\\aaa\\bbb\\ccc\\aaa\\aaa.mp4", "D:\\Video")
      ).toBe("D:\\Video\\zzz\\bbb\\zzz.mp4");

      expect(subject.converge("C:\\あいうえお.mp4", "D:\\Video")).toBe(
        "D:\\Video\\かきくけこ.mp4"
      );

      expect(subject.converge("C:\\あいうえお.mp4", "D:\\Video")).toBe(
        "D:\\Video\\かきくけこ.mp4"
      );
      expect(
        subject.converge("C:\\test.jpg\\test.jpg\\test.jpg", "D:\\Image")
      ).toBe("D:\\Image\\test.jpg\\test.jpg");
    });
  });
});
