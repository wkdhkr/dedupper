/** @flow */
import Subject from "../../src/services/DbRepairService";
import TestHelper from "../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let config;
  const loadSubject = async () =>
    (await import("../../src/services/DbRepairService")).default;

  beforeEach(async () => {
    config = TestHelper.createDummyConfig();
    jest.resetModules();
  });

  it("run", async () => {
    const insert = jest.fn().mockImplementation(async () => {});
    config.dryrun = false;
    jest.doMock(
      "../../src/services/fs/contents/PHashService",
      () =>
        class C {
          calculate = async () => "1111";
        }
    );
    jest.doMock(
      "../../src/services/fs/contents/DHashService",
      () =>
        class C {
          calculate = async () => "2222";
        }
    );
    jest.doMock("glob-promise", () => async () => ["a.log"]);
    jest.doMock("fs-extra", () => ({
      pathExists: async () => true,
      readFile: async () => `[2018-03-19T00:13:59.746][48536][INFO] DbService - insert: row = {"$hash":"1234","$pHash":"6789","$dHash": 9876,"$width":1000,"$height":1000,"$ratio":1.5,"$timestamp":1468718862675,"$name":"aaa","$toPath":"B:\\\\Image\\\\2018\\\\03-18\\\\aaa.jpg","$fromPath":"Z:\\\\aaa.jpg","$size":10000,"$state":0}
[2018-03-19T00:13:59.762][48536][DEBUG] FileCacheService - clean path = Z:\\aaa.jpg.dpcache
[2018-03-19T00:13:59.764][48536][WARN] FileService - delete file/dir: path = Z:\\aaa.jpg.dpcache
[2018-03-19T00:14:08.352][48536][INFO] DbService - insert: row = {"$hash":"abcdefg","$pHash":"02468","$dHash":18642,"$width":500,"$height":500,"$ratio":1,"$timestamp":1468633349551,"$name":"bbb","$toPath":"B:\\\\Image\\\\2018\\\\03-18\\\\bbb.jpg","$fromPath":"Z:\\\\bbb.jpg","$size":2000000,"$state":300}
[2018-03-19T00:14:08.352][48536][INFO] DbService - insert: row = {"$hash":"abcdefg","$pHash":"2468","$dHash":8642,"$width":500,"$height":500,"$ratio":1,"$timestamp":1468633349551,"$name":"bbb","$toPath":"B:\\\\Image\\\\2018\\\\03-18\\\\bbb.jpg","$fromPath":"Z:\\\\bbb.jpg","$size":2000000,"$state":300}`
    }));
    jest.doMock(
      "../../src/services/DbService",
      () =>
        class C {
          static rowToInfo = () => ({});
          insert = insert;
          all = async () => [
            { hash: "1234" },
            { hash: "abcdefg", d_hash: "8642" },
            { hash: "hijklmn" }
          ];
        }
    );
    const DbRepairService = await loadSubject();
    const drs = new DbRepairService(config);
    await drs.run();
    expect(insert).toHaveBeenCalledTimes(5);
  });
});
