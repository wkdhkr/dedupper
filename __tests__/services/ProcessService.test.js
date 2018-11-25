/** @flow */
import path from "path";
import DbService from "../../src/services/db/DbService";
import Subject from "../../src/services/ProcessService";
import TestHelper from "../../src/helpers/TestHelper";
import {
  TYPE_FILE_MARK_ERASE,
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
import { STATE_DEDUPED, STATE_KEEPING } from "../../src/types/FileStates";
import { TYPE_IMAGE } from "../../src/types/ClassifyTypes";

jest.setTimeout(120000);
jest.mock("lockfile", () => ({
  lock: (a, b, cb) => cb(),
  unlock: (a, cb) => cb()
}));
process.setMaxListeners(0);
jest.setTimeout(60000);
describe(Subject.name, () => {
  let config;
  const loadSubject = async () =>
    (await import("../../src/services/ProcessService")).default;
  beforeEach(async () => {
    jest.resetModules();
    jest.dontMock("../../src/services/db/DbService");
    jest.dontMock("../../src/services/fs/FileService");
    jest.dontMock("../../src/services/judgment/JudgmentService");
    jest.doMock(
      "../../src/helpers/ProcessHelper",
      () =>
        class C {
          static waitCpuIdle = async () => {};
        }
    );
    config = TestHelper.createDummyConfig();
    config.instantDelete = true;
    jest.mock(
      "../../src/helpers/DateHelper",
      () =>
        class C {
          static currentDate = new Date(2018, 0, 1);
        }
    );
  });

  it("process", async () => {
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample")
    );
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
      exec: async () => {}
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
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detect = async fileInfo => [
            TYPE_REPLACE,
            DbService.infoToRow({
              ...fileInfo,
              to_path: "B:\\Image\\2017\\01-01\\__tests__\\sample\\firefox.jpg"
            }),
            TYPE_P_HASH_MATCH,
            []
          ];
        }
    );
    const ProcessService = await loadSubject();
    const subject = new ProcessService(
      config,
      path.resolve("./__tests__/sample/firefox.jpg")
    );
    await subject.process();
    subject.config.forceTransfer = true;
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [TYPE_P_HASH_MATCH, path.resolve("__tests__\\sample\\firefox.jpg")],
        [TYPE_P_HASH_MATCH, path.resolve("__tests__\\sample\\firefox.jpg")]
      ],
      save: [
        "B:\\Image\\2017\\01-01\\__tests__\\sample\\firefox.jpg",
        "B:\\Image\\2018\\01-01\\__tests__\\sample\\firefox.jpg"
      ]
    });
  });

  it("transfer", async () => {
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detect = async fileInfo => [
            TYPE_TRANSFER,
            DbService.infoToRow(fileInfo),
            TYPE_P_HASH_MATCH_TRANSFER,
            []
          ];
        }
    );
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
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detectDeleteState = () => STATE_DEDUPED;

          detect = async fileInfo => [
            TYPE_DELETE,
            DbService.infoToRow(fileInfo),
            TYPE_P_HASH_REJECT_LOW_ENTROPY,
            []
          ];
        }
    );
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
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detect = async fileInfo => [
            TYPE_SAVE,
            DbService.infoToRow(fileInfo),
            TYPE_NO_PROBLEM,
            []
          ];
        }
    );
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
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detect = async fileInfo => [
            TYPE_RELOCATE,
            DbService.infoToRow(fileInfo),
            TYPE_HASH_MATCH_RELOCATE,
            []
          ];
        }
    );
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

  it("relocate manual", async () => {
    config.manual = true;
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detect = async fileInfo => [
            TYPE_RELOCATE,
            DbService.infoToRow(fileInfo),
            TYPE_HASH_MATCH_RELOCATE,
            []
          ];
        }
    );
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
      save: [path.resolve("__tests__\\sample\\firefox.jpg")]
    });
  });

  it("hold", async () => {
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detectDeleteState = () => STATE_DEDUPED;

          detect = async fileInfo => [
            TYPE_HOLD,
            DbService.infoToRow(fileInfo),
            TYPE_DEEP_LEARNING,
            []
          ];
        }
    );
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

  it("imported file", async () => {
    const targetPath = path.resolve("./__tests__/sample/firefox.jpg");
    const isAcceptedState = jest.fn().mockImplementation(() => true);
    jest.doMock(
      "../../src/services/fs/FileService",
      () =>
        class C {
          isLibraryPlace = () => true;

          isDirectory = async () => false;

          isDeadLink = async () => false;

          getSourcePath = () => targetPath;
        }
    );
    jest.doMock(
      "../../src/services/db/DbService",
      () =>
        class C {
          queryByToPath = async () => [{ state: STATE_KEEPING }];

          static isAcceptedState = isAcceptedState;
        }
    );
    const ProcessService = await loadSubject();
    const subject = new ProcessService(config, targetPath);
    await subject.process();
    expect(isAcceptedState).toBeCalledWith(STATE_KEEPING);
  });

  it("imported file erase", async () => {
    const targetPath = path.resolve("./__tests__/sample/firefox.!e.jpg");
    const isAcceptedState = jest.fn().mockImplementation(() => true);
    jest.doMock(
      "../../src/services/fs/FileService",
      () =>
        class C {
          delete = async () => {};

          fillInsertFileInfo = async x => x;

          prepareDir = async () => {};

          isLibraryPlace = () => true;

          isDirectory = async () => false;

          isDeadLink = async () => false;

          getSourcePath = () => targetPath;

          cleanCacheFile = async () => {};
        }
    );
    jest.doMock(
      "../../src/services/db/DbService",
      () =>
        class C {
          static infoToRow = () => ({});

          static rowToInfo = () => ({
            d_hash: "4567",
            from_path: targetPath,
            hash: "89ab",
            height: 479,
            damaged: false,
            name: "firefox",
            p_hash: "1234",
            ratio: 1.0438413361169103,
            size: 36189,
            state: STATE_KEEPING,
            timestamp: new Date("2017-01-01").getTime(),
            to_path: "B:\\Image\\2017\\06-01\\__tests__\\sample\\firefox.jpg",
            type: TYPE_IMAGE,
            width: 500
          });

          queryByToPath = async () => [
            {
              state: STATE_KEEPING
            }
          ];

          insert = async () => {};

          queryByHash = async () => {};

          queryByPHash = async () => [];

          queryByName = async () => [];

          static isAcceptedState = isAcceptedState;
        }
    );
    const ProcessService = await loadSubject();
    const subject = new ProcessService(config, targetPath);
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [[TYPE_FILE_MARK_ERASE, targetPath]],
      save: []
    });
  });

  it("dead link", async () => {
    const targetPath = path.resolve("./__tests__/sample/firefox.jpg");
    const unlink = jest.fn().mockImplementation(async () => {});
    jest.doMock(
      "../../src/services/fs/FileService",
      () =>
        class C {
          isDirectory = async () => false;

          isDeadLink = async () => true;

          getSourcePath = () => targetPath;

          unlink = unlink;
        }
    );
    const ProcessService = await loadSubject();
    const subject = new ProcessService(config, targetPath);
    await subject.process();
    expect(unlink).toHaveBeenCalledTimes(1);
  });

  it("save with pHash calculate delay", async () => {
    const targetPath = path.resolve("./__tests__/sample/firefox.jpg");
    jest.doMock(
      "../../src/services/db/DbService",
      () =>
        class C {
          insert = async () => {};

          queryByToPath = async () => [];

          queryByHash = async () => {};

          queryByPHash = async () => [];

          queryByName = async () => [];
        }
    );
    jest.doMock(
      "../../src/services/judgment/JudgmentService",
      () =>
        class JudgmentServiceMock {
          isForgetType = () => false;

          detect = async () => [TYPE_SAVE, {}, TYPE_NO_PROBLEM, []];
        }
    );
    config.cache = false;
    config.pHash = false;
    const ProcessService = await loadSubject();
    const subject = new ProcessService(config, targetPath);
    await subject.process();
    expect(subject.getResults()).toEqual({
      judge: [
        [TYPE_NO_PROBLEM, path.resolve("__tests__\\sample\\firefox.jpg")]
      ],
      save: ["B:\\Image\\2018\\01-01\\__tests__\\sample\\firefox.jpg"]
    });
  });
});
