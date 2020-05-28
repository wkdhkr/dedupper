/** @flow */
import { default as Subject } from "../../../src/services/db/TagDbService";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";

jest.setTimeout(40000);
describe(Subject.name, () => {
  let config;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });
  describe("query", () => {
    it("delete, insert, queryByHash", async () => {
      const insert = async filePath => {
        config.path = filePath;
        const fs = new FileService(config);
        const subject = new Subject(config);
        await subject.init();
        const fileInfo = await fs.collectFileInfo();
        await fs.prepareDir(config.dbBasePath, true);
        expect(
          await subject.insert({
            ...subject.createRow(fileInfo.hash),
            t1: 1
          })
        ).toBeUndefined();
        return [subject, fileInfo];
      };
      const [subject, fileInfo] = await insert(
        `${TestHelper.sampleDir}firefox.jpg`
      );
      const row = subject.createRow(fileInfo.hash);
      expect(await subject.queryByHash(row.hash)).toMatchObject({
        hash:
          "f7680c47177100866759ac2029edc15bfd092d923f858547a5234c2ddbced40b",
        t1: 1
      });
      await subject.deleteByHash(row.hash);
    });
  });
});
