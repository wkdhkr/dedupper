/** @flow */

import { default as Subject } from "../../../src/services/fs/contents/ImageSizeService";
import TestHelper from "../../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let subject;
  beforeAll(() => {
    subject = new Subject();
  });
  describe("read", () => {
    it("get png file resolution", async () => {
      expect(
        await subject.read(`${TestHelper.sampleDir}firefox.png`)
      ).toMatchObject({
        width: 250,
        height: 240
      });
    });
    it("get png file resolution", async () => {
      expect(
        await subject.read(`${TestHelper.sampleDir}firefox.jpg`)
      ).toMatchObject({
        width: 500,
        height: 479
      });
    });
    it("fail with not found", () => {
      subject
        .read(`${TestHelper.sampleDir}notfound.png`)
        .catch(({ message }) =>
          expect(message).toEqual(expect.stringContaining("ENOENT"))
        );
    });
    it("fail with empty file", async () => {
      subject
        .read(`${TestHelper.sampleDir}empty.jpg`)
        .catch(({ message }) =>
          expect(message).toEqual(
            expect.stringContaining("File Size is not greater than 0")
          )
        );
    });
  });
});
