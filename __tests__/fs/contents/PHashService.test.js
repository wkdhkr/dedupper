/** @flow */

import { default as Subject } from "../../../src/services/fs/contents/PHashService";
import TestHelper from "../../../src/helpers/TestHelper";

jest.setTimeout(20000);
describe(Subject.name, () => {
  let subject;
  beforeEach(() => {
    const config = TestHelper.createDummyConfig();
    subject = new Subject(config);
  });
  describe("calculate", () => {
    it("compare", async () => {
      expect(
        await subject.compare("7856513260241168089", "7856513260241168085")
      ).toBe(2);
      expect(await subject.compare(undefined, undefined)).toBeFalsy();
    });

    it("png", async () => {
      expect(
        await subject.calculate(`${TestHelper.sampleDir}firefox.png`)
      ).toBe("54086765383280");
    });

    it("jpg", async () => {
      expect(
        await subject.calculate(`${TestHelper.sampleDir}firefox.jpg`)
      ).toBe("7856513260241168089");
    });

    it("empty", async () => {
      expect(
        await subject.calculate(`${TestHelper.sampleDir}empty.jpg`)
      ).toBeUndefined();
    });
  });
});
