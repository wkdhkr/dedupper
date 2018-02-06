/** @flow */
import path from "path";
import Subject from "../../src/services/ProcessService";
import TestHelper from "../../src/helpers/TestHelper";

describe(Subject.name, () => {
  let config;
  const loadSubject = async () =>
    (await import("../../src/services/ProcessService")).default;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
    jest.resetModules();
    TestHelper.mockLoggerHelper();
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
          "TYPE_DAMAGED",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\SampleVideo_360x240_1mb_corrupt.mkv"
        ],
        [
          "TYPE_DAMAGED",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\empty.jpg"
        ],
        [
          "TYPE_DAMAGED",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\empty.mkv"
        ],
        [
          "TYPE_DAMAGED",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox_corrupt.jpg"
        ],
        [
          "TYPE_UNKNOWN_FILE_TYPE",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\foo._xyz_"
        ],
        [
          "TYPE_UNKNOWN_FILE_TYPE",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\foo.txt"
        ],
        [
          "TYPE_LOW_FILE_SIZE",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\SampleVideo_360x240_1mb.mkv"
        ],
        [
          "TYPE_LOW_FILE_SIZE",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox_small.jpg"
        ],
        [
          "TYPE_LOW_RESOLUTION",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.jpg"
        ],
        [
          "TYPE_LOW_RESOLUTION",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.png"
        ]
      ],
      save: []
    });
  });

  it("replace", async () => {
    // eslint-disable-next-line global-require
    jest.mock("../../src/services/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detect = fileInfo =>
          Promise.resolve([
            "TYPE_REPLACE",
            DbService.infoToRow(fileInfo),
            "TYPE_P_HASH_MATCH",
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
          "TYPE_P_HASH_MATCH",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.jpg"
        ]
      ],
      save: [
        "B:\\Image\\2018\\01\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.jpg"
      ]
    });
  });

  it("save", async () => {
    // eslint-disable-next-line global-require
    jest.mock("../../src/services/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detect = fileInfo =>
          Promise.resolve([
            "TYPE_SAVE",
            DbService.infoToRow(fileInfo),
            "TYPE_NO_PROBLEM",
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
          "TYPE_NO_PROBLEM",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.jpg"
        ]
      ],
      save: [
        "B:\\Image\\2018\\01\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.jpg"
      ]
    });
  });

  it("relocate", async () => {
    // eslint-disable-next-line global-require
    jest.mock("../../src/services/JudgmentService", () => {
      // eslint-disable-next-line global-require
      const DbService = require("../../src/services/DbService").default;
      return class JudgmentServiceMock {
        isForgetType = () => false;
        detect = fileInfo =>
          Promise.resolve([
            "TYPE_RELOCATE",
            DbService.infoToRow(fileInfo),
            "TYPE_HASH_MATCH_RELOCATE",
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
          "TYPE_HASH_MATCH_RELOCATE",
          "C:\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.jpg"
        ]
      ],
      save: [
        "B:\\Image\\2018\\01\\Users\\Owner\\src\\dedupper\\__tests__\\sample\\firefox.jpg"
      ]
    });
  });
});
