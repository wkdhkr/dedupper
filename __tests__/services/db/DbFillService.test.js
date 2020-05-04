/** @flow */
import { default as Subject } from "../../../src/services/db/DbFillService";
import FileService from "../../../src/services/fs/FileService";
import TestHelper from "../../../src/helpers/TestHelper";
import DbService from "../../../src/services/db/DbService";
import ProcessStateDbService from "../../../src/services/db/ProcessStateDbService";

jest.setTimeout(60000);
describe(Subject.name, () => {
  let config;
  const loadSubject = async () =>
    import("../../../src/services/db/DbFillService");
  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });
  describe("DbFillService", () => {
    it("searchAndGo", async () => {
      jest.mock("fs-extra", () => ({
        ...jest.requireActual("fs-extra"),
        pathExists: jest.fn().mockImplementation(() => Promise.resolve(true))
      }));
      jest.mock(
        "./../../../src/services/deepLearning/facePP/FacePPService",
        () =>
          class C {
            detectFaces = () => {
              const result = {
                time_used: 1,
                faces: [],
                image_id: "a",
                request_id: "a",
                face_num: 0
              };
              return Promise.resolve(result);
            };
          }
      );
      jest.mock(
        "./../../../src/services/deepLearning/NsfwJsService",
        () =>
          class C {
            predict = () => {
              const results = [
                { className: "Neutral", probability: 0.9989791512489319 },
                { className: "Drawing", probability: 0.000926750130020082 },
                { className: "Hentai", probability: 0.00005238258381723426 },
                { className: "Porn", probability: 0.00003987717718700878 },
                { className: "Sexy", probability: 0.0000015715845620434266 }
              ];
              return Promise.resolve(results);
            };
          }
      );
      jest.mock(
        "./../../../src/services/db/NsfwJsDbService",
        () =>
          class C {
            queryByHash = () => Promise.resolve(null);

            insert = () => Promise.resolve();
          }
      );
      config.useFileName = true;
      const insert = async filePath => {
        config.path = filePath;
        const fs = new FileService(config);
        await fs.prepareDir(config.dbBasePath, true);
        const ds = new DbService(config);
        const fileInfo = await fs.collectFileInfo();
        await ds.deleteByHash(fileInfo);
        await ds.insert(fileInfo);
        return fileInfo;
      };
      config.maxWorkers = 1;
      const psds = new ProcessStateDbService(config);
      await psds.init();
      const { default: DbFillService } = await loadSubject();
      const subject = new DbFillService(config);
      const fileInfo = await insert(`${TestHelper.sampleDir}firefox_small.jpg`);
      await psds.deleteByHash(fileInfo.hash);
      expect(await subject.run(1)).toBeUndefined();
      expect(await psds.queryByHash(fileInfo.hash)).toMatchObject({
        facepp: 2,
        facepp_face_count: 0,
        nsfwjs: 2
      });
      expect(await psds.deleteByHash(fileInfo.hash)).toBeUndefined();
    });
  });
});
