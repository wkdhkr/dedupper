/** @flow */
import { default as Subject } from "../../src/services/ExaminationService";
import TestHelper from "../../src/helpers/TestHelper";
import { TYPE_HOLD } from "../../src/types/ActionTypes";
import FileCacheService from "../../src/services/fs/FileCacheService";
import {
  TYPE_P_HASH_MATCH,
  TYPE_P_HASH_REJECT_DIFFERENT_MEAN,
  TYPE_DEEP_LEARNING,
  TYPE_P_HASH_REJECT_LOW_FILE_SIZE
} from "../../src/types/ReasonTypes";

const mock = (mockObject: any) => mockObject;

describe(Subject.name, () => {
  let config;
  beforeEach(() => {
    jest.resetModules();
    config = TestHelper.createDummyConfig();
  });
  it("rename", async () => {
    jest.mock("../../src/services/fs/FileService");
    const { default: FileService } = await import(
      "../../src/services/fs/FileService"
    );

    const rename = jest.fn().mockImplementation(() => Promise.resolve());
    mock(FileService).mockImplementation(() => ({
      rename,
      getSourcePath: () => "C:\\TEMP\\aaa.jpg"
    }));
    config.path = TestHelper.sampleFile.image.jpg.default;
    const fs = new FileService(config);
    const subject = new Subject(config, fs);
    const fileInfo = new FileCacheService(config).createEmptyFileInfo();
    await subject.rename(TYPE_P_HASH_MATCH, fileInfo);
    expect(rename).toBeCalledWith("C:\\TEMP\\aaa.!r.jpg");

    await subject.rename(TYPE_DEEP_LEARNING, fileInfo);
    expect(rename).toBeCalledWith("C:\\TEMP\\aaa.!b.jpg");

    await subject.rename(TYPE_P_HASH_REJECT_LOW_FILE_SIZE, fileInfo);
    expect(rename).toBeCalledWith("C:\\TEMP\\aaa.!d.jpg");
  });

  it("arrange", async () => {
    jest.mock("../../src/services/fs/FileService");
    const { default: FileService } = await import(
      "../../src/services/fs/FileService"
    );

    const createSymLink = jest.fn().mockImplementation(() => Promise.resolve());
    const rename = jest.fn().mockImplementation(() => Promise.resolve());
    mock(FileService).mockImplementation(() => ({
      createSymLink,
      rename,
      prepareDir: async () => {},
      createDedupperLock: async () => {},
      getSourcePath: () => "C:\\TEMP\\aaa.jpg",
      getDirPath: () => "C:\\TEMP"
    }));
    const fs = new FileService(config);

    const subject = new Subject(config, fs);

    config.path = TestHelper.sampleFile.image.jpg.default;
    const fileInfo = new FileCacheService(config).createEmptyFileInfo();
    await subject.arrange(
      [
        [
          TYPE_HOLD,
          ({ to_path: "C:\\TEMP\\bbb.jpg" }: any),
          TYPE_P_HASH_REJECT_DIFFERENT_MEAN
        ],
        [TYPE_HOLD, ({ to_path: "C:\\TEMP\\ccc.jpg" }: any), TYPE_P_HASH_MATCH]
      ],
      fileInfo
    );

    expect(createSymLink).toBeCalledWith(
      "C:\\TEMP\\bbb.jpg",
      "C:\\TEMP\\aaa#1.DIFFERENT_MEAN.!e.jpg"
    );

    expect(createSymLink).toBeCalledWith(
      "C:\\TEMP\\ccc.jpg",
      "C:\\TEMP\\aaa#2.REPLACE.!e.jpg"
    );
    expect(rename).toBeCalledWith("C:\\TEMP\\aaa.!s.jpg");
    expect(await subject.arrange([], fileInfo)).toBeFalsy();
  });
});
