/** @flow */
import { default as Subject } from "../../../src/services/db/NsfwJsDbService";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import DeepLearningHelper from "../../../src/helpers/DeepLearningHelper";

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
        const fileInfo = await fs.collectFileInfo();
        await fs.prepareDir(config.dbBasePath, true);
        DeepLearningHelper.addNsfwJsResults(fileInfo.hash, [
          { className: "Drawing", probability: 0.9298499822616577 },
          { className: "Hentai", probability: 0.06746610254049301 },
          {
            className: "Neutral",
            probability: 0.0018833467038348317
          },
          { className: "Porn", probability: 0.0007759135914966464 },
          { className: "Sexy", probability: 0.00002476646659488324 }
        ]);
        expect(await subject.insert(fileInfo)).toBeUndefined();
        return [subject, fileInfo];
      };
      const [subject, fileInfo] = await insert(
        `${TestHelper.sampleDir}firefox.jpg`
      );
      expect(await subject.queryByHash(fileInfo)).toMatchObject({
        drawing: 0.93,
        hash:
          "f7680c47177100866759ac2029edc15bfd092d923f858547a5234c2ddbced40b",
        hentai: 0.067,
        hentai_porn: 0.068,
        hentai_porn_sexy: 0.068,
        hentai_sexy: 0.067,
        neutral: 0.002,
        porn: 0.001,
        porn_sexy: 0.001,
        sexy: 0,
        version: 1
      });
      await subject.deleteByHash(fileInfo);
    });
  });
});
