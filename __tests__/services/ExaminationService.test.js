/** @flow */
import { default as Subject } from "../../src/services/ExaminationService";
import TestHelper from "../../src/helpers/TestHelper";
import { TYPE_HOLD } from "../../src/types/ActionTypes";
import {
  TYPE_P_HASH_MATCH,
  TYPE_P_HASH_REJECT_DIFFERENT_MEAN
} from "../../src/types/ReasonTypes";

const mock = (mockObject: any) => mockObject;

describe(Subject.name, () => {
  let config;
  beforeEach(() => {
    config = TestHelper.createDummyConfig();
  });

  it("arrange", async () => {
    jest.mock("../../src/services/fs/FileService");
    const {
      default: FileService
    } = await import("../../src/services/fs/FileService");

    const createSymLink = jest.fn().mockImplementation(() => Promise.resolve());
    const rename = jest.fn().mockImplementation(() => Promise.resolve());
    mock(FileService).mockImplementation(() => ({
      createSymLink,
      rename,
      prepareDir: async () => {},
      getSourcePath: () => "C:\\TEMP\\aaa.jpg",
      getDirPath: () => "C:\\TEMP"
    }));
    const fs = new FileService(config);

    const subject = new Subject(config, fs);

    await subject.arrange([
      [
        TYPE_HOLD,
        ({ to_path: "C:\\TEMP\\bbb.jpg" }: any),
        TYPE_P_HASH_REJECT_DIFFERENT_MEAN
      ],
      [TYPE_HOLD, ({ to_path: "C:\\TEMP\\ccc.jpg" }: any), TYPE_P_HASH_MATCH]
    ]);
    expect(createSymLink).toBeCalledWith(
      "C:\\TEMP\\bbb.jpg",
      "C:\\TEMP\\aaa_2.DIFFERENT_MEAN.!e.jpg"
    );
    expect(rename).toBeCalledWith("C:\\TEMP\\aaa.!s.jpg");
  });
});
