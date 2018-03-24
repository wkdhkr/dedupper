/** @flow */
import { default as Subject } from "../../../src/services/db/DbService";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import { TYPE_VIDEO } from "../../../src/types/ClassifyTypes";

describe(Subject.name, () => {
  let config;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });
  describe("query", () => {
    it("delete, insert, all, queryByHash", async () => {
      config.path = `${TestHelper.sampleDir}SampleVideo_360x240_1mb.mkv`;
      const fs = new FileService(config);
      const subject = new Subject(config);
      await fs.prepareDir(config.dbBasePath, true);
      const fileInfo = await fs.collectFileInfo();
      expect(await subject.deleteByHash(fileInfo)).toBeUndefined();
      expect(await subject.insert(fileInfo)).toBeUndefined();
      expect(await subject.queryByHash(fileInfo)).toMatchObject({
        hash: "46cf38c05e540a341c816e4a402e0988f3a074eb"
      });
      expect(
        await subject.queryByHash({ ...fileInfo, hash: "" })
      ).toBeUndefined();
      expect((await subject.all(TYPE_VIDEO)).length > 0).toBeTruthy();
      await subject.deleteByHash(fileInfo);
    });

    it("delete, insert, queryByPHash", async () => {
      config.pHashSearchThreshold = 11;
      config.pHashIgnoreSameDir = false;
      const insert = async filePath => {
        config.path = filePath;
        const fs = new FileService(config);
        const subject = new Subject(config);
        await fs.prepareDir(config.dbBasePath, true);
        const fileInfo = await fs.collectFileInfo();
        expect(await subject.deleteByHash(fileInfo)).toBeUndefined();
        expect(await subject.insert(fileInfo)).toBeUndefined();
        return [subject, fileInfo];
      };
      await insert(`${TestHelper.sampleDir}firefox_small.jpg`);
      const [subject, fileInfo] = await insert(
        `${TestHelper.sampleDir}firefox.jpg`
      );
      expect(
        await subject.queryByPHash({ ...fileInfo, p_hash: "1234" })
      ).toEqual([]);
      expect(
        await subject.queryByPHash({
          ...fileInfo,
          p_hash: "7856513260241168089"
        })
      ).toMatchObject([
        {
          p_hash: "7856513260241168089"
        },
        {
          p_hash: "7856513260239070937"
        }
      ]);
      config.pHashIgnoreSameDir = true;
      expect(
        await subject.queryByPHash({ ...fileInfo, p_hash: "1234" })
      ).toEqual([]);
      expect(
        await subject.queryByPHash({
          ...fileInfo,
          p_hash: "7856513260241168089"
        })
      ).toMatchObject([]);
      expect(await subject.queryByPHash({ ...fileInfo, p_hash: "" })).toEqual(
        []
      );
      await subject.deleteByHash(fileInfo);
    });

    it("delete, insert, queryByName", async () => {
      config.useFileName = true;
      const insert = async filePath => {
        config.path = filePath;
        const fs = new FileService(config);
        const subject = new Subject(config);
        await fs.prepareDir(config.dbBasePath, true);
        const fileInfo = await fs.collectFileInfo();
        expect(await subject.deleteByHash(fileInfo)).toBeUndefined();
        expect(await subject.insert(fileInfo)).toBeUndefined();
        return [subject, fileInfo];
      };
      const [subject, fileInfo] = await insert(
        `${TestHelper.sampleDir}firefox.jpg`
      );
      expect(
        await subject.queryByName({ ...fileInfo, id: "999", p_hash: "1234" })
      ).toMatchObject([
        {
          name: "firefox"
        }
      ]);
      await subject.deleteByHash(fileInfo);
    });
  });
});
