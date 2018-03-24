/** @flow */
import path from "path";
import Subject from "../../src/services/ProcessService";
import TestHelper from "../../src/helpers/TestHelper";
import {
  TYPE_ARCHIVE_EXTRACT,
  TYPE_DAMAGED,
  TYPE_UNKNOWN_FILE_TYPE,
  TYPE_LOW_FILE_SIZE,
  TYPE_LOW_RESOLUTION,
  TYPE_P_HASH_MATCH_TRANSFER,
  TYPE_NO_PROBLEM,
  TYPE_P_HASH_MATCH,
  TYPE_HASH_MATCH_RELOCATE,
  TYPE_P_HASH_REJECT_LOW_ENTROPY,
  TYPE_DEEP_LEARNING
} from "../../src/types/ReasonTypes";
import {
  TYPE_TRANSFER,
  TYPE_SAVE,
  TYPE_REPLACE,
  TYPE_RELOCATE,
  TYPE_DELETE,
  TYPE_HOLD
} from "../../src/types/ActionTypes";
import { STATE_DEDUPED } from "../../src/types/FileStates";

jest.mock("lockfile", () => ({
  lock: (a, b, cb) => cb(),
  unlock: (a, cb) => cb()
}));
jest.setTimeout(60000);
describe(Subject.name, () => {
  let config;
  const loadSubject = async () =>
    (await import("../../src/services/ProcessService")).default;
  beforeEach(async () => {
    config = TestHelper.createDummyConfig();
    config.instantDelete = true;
    jest.mock(
      "../../src/helpers/DateHelper",
      () =>
        class C {
          static currentDate = new Date(2018, 0, 1);
        }
    );
    jest.resetModules();
  });

  it("process", async () => {
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample")
    );
    // eslint-disable-next-line global-require
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [
          TYPE_DAMAGED,
          path.resolve("__tests__\\sample\\SampleVideo_360x240_1mb_corrupt.mkv")
        ],
        [TYPE_DAMAGED, path.resolve("__tests__\\sample\\empty.jpg")],
        [TYPE_DAMAGED, path.resolve("__tests__\\sample\\empty.mkv")],
        [TYPE_DAMAGED, path.resolve("__tests__\\sample\\firefox_corrupt.jpg")],
        [TYPE_UNKNOWN_FILE_TYPE, path.resolve("__tests__\\sample\\foo._xyz_")],
        [TYPE_UNKNOWN_FILE_TYPE, path.resolve("__tests__\\sample\\foo.txt")],
        [
          TYPE_LOW_FILE_SIZE,
          path.resolve("__tests__\\sample\\SampleVideo_360x240_1mb.mkv")
        ],
        [
          TYPE_LOW_FILE_SIZE,
          path.resolve("__tests__\\sample\\firefox_small.jpg")
        ],
        [TYPE_LOW_RESOLUTION, path.resolve("__tests__\\sample\\firefox.jpg")],
        [TYPE_LOW_RESOLUTION, path.resolve("__tests__\\sample\\firefox.png")]
      ],
      save: []
    });
  });

  it("archive dryrun", async () => {
    const ProcessService = await loadSubject();
    config.dryrun = true;
    config.archiveExtract = true;
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg.zip")
    );
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [
          TYPE_ARCHIVE_EXTRACT,
          path.resolve("__tests__\\sample\\firefox.jpg.zip")
        ]
      ],
      save: []
    });
  });

  it("archive", async () => {
    const ProcessService = await loadSubject();
    config.archiveExtract = true;
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg.zip")
    );
    jest.doMock("child-process-promise", () => ({
      exec: () => Promise.resolve()
    }));
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [
          TYPE_ARCHIVE_EXTRACT,
          path.resolve("__tests__\\sample\\firefox.jpg.zip")
        ]
      ],
      save: []
    });
  });

  it("replace", async () => {
    // eslint-disable-next-line global-require
    jest.doMock("../../src/services/judgment/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/db/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detect = fileInfo =>
          Promise.resolve([
            TYPE_REPLACE,
            DbService.infoToRow(fileInfo),
            TYPE_P_HASH_MATCH,
            []
          ]);
      };
    });
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [TYPE_P_HASH_MATCH, path.resolve("__tests__\\sample\\firefox.jpg")]
      ],
      save: ["B:\\Image\\2018\\01-01\\__tests__\\sample\\firefox.jpg"]
    });
  });

  it("transfer", async () => {
    // eslint-disable-next-line global-require
    jest.doMock("../../src/services/judgment/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/db/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detect = fileInfo =>
          Promise.resolve([
            TYPE_TRANSFER,
            DbService.infoToRow(fileInfo),
            TYPE_P_HASH_MATCH_TRANSFER,
            []
          ]);
      };
    });
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [
          TYPE_P_HASH_MATCH_TRANSFER,
          path.resolve("__tests__\\sample\\firefox.jpg")
        ]
      ],
      save: ["B:\\Image\\2018\\01-01\\__tests__\\sample\\firefox.jpg"]
    });
  });

  it("delete", async () => {
    jest.doMock("../../src/services/judgment/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/db/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detectDeleteState = () => STATE_DEDUPED;
        detect = fileInfo =>
          Promise.resolve([
            TYPE_DELETE,
            DbService.infoToRow(fileInfo),
            TYPE_P_HASH_REJECT_LOW_ENTROPY,
            []
          ]);
      };
    });
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [
          TYPE_P_HASH_REJECT_LOW_ENTROPY,
          path.resolve("__tests__\\sample\\firefox.jpg")
        ]
      ],
      save: []
    });
  });

  it("save", async () => {
    // eslint-disable-next-line global-require
    jest.doMock("../../src/services/judgment/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/db/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detect = fileInfo =>
          Promise.resolve([
            TYPE_SAVE,
            DbService.infoToRow(fileInfo),
            TYPE_NO_PROBLEM,
            []
          ]);
      };
    });
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [TYPE_NO_PROBLEM, path.resolve("__tests__\\sample\\firefox.jpg")]
      ],
      save: ["B:\\Image\\2018\\01-01\\__tests__\\sample\\firefox.jpg"]
    });
  });

  it("relocate", async () => {
    // eslint-disable-next-line global-require
    jest.doMock("../../src/services/judgment/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/db/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detect = fileInfo =>
          Promise.resolve([
            TYPE_RELOCATE,
            DbService.infoToRow(fileInfo),
            TYPE_HASH_MATCH_RELOCATE,
            []
          ]);
      };
    });
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );

    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [
          TYPE_HASH_MATCH_RELOCATE,
          path.resolve("__tests__\\sample\\firefox.jpg")
        ]
      ],
      save: ["B:\\Image\\2018\\01-01\\__tests__\\sample\\firefox.jpg"]
    });
  });

  it("hold", async () => {
    jest.doMock("../../src/services/judgment/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/db/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detectDeleteState = () => STATE_DEDUPED;
        detect = fileInfo =>
          Promise.resolve([
            TYPE_HOLD,
            DbService.infoToRow(fileInfo),
            TYPE_DEEP_LEARNING,
            []
          ]);
      };
    });
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [TYPE_DEEP_LEARNING, path.resolve("__tests__\\sample\\firefox.jpg")]
      ],
      save: []
    });
  });

  it("save with pHash calculate delay", async () => {
    jest.doMock(
      "../../src/services/db/DbService",
      () =>
        class C {
          insert = async () => Promise.resolve();
          queryByHash = async () => Promise.resolve();
          queryByPHash = async () => Promise.resolve([]);
          queryByName = async () => Promise.resolve([]);
        }
    );
    jest.doMock(
      "../../src/services/fs/FileService",
      () =>
        class C {
          collectFileInfo = async () => {};
          isDirectory = () => false;
          isDeadLink = async () => false;
          isArchive = async () => false;
          prepareDir = async () => {};
        }
    );
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;
          detect = () => Promise.resolve([TYPE_SAVE, {}, TYPE_NO_PROBLEM, []]);
        }
    );
    config.cache = false;
    config.pHash = false;
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );
    await subject.process();
  });
});
