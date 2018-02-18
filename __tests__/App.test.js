/** @flow */
import Subject from "../src/App";
import TestHelper from "../src/helpers/TestHelper";

jest.useFakeTimers();

describe(Subject.name, () => {
  const loadSubject = async () => (await import("../src/App")).default;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  it("run", async () => {
    const processFn = jest.fn().mockImplementation(async () => true);
    const parseArgs = jest.fn().mockImplementation(() => ({
      logConfig: true,
      path: TestHelper.sampleFile.image.jpg.default
    }));
    jest.doMock(
      "../src/Cli",
      () =>
        class C {
          parseArgs = parseArgs;
        }
    );
    jest.doMock(
      "../src/services/ProcessService",
      () =>
        class C {
          process = processFn;
        }
    );
    const App = await loadSubject();
    const subject = new App();
    await subject.run();
    expect(parseArgs).toHaveBeenCalledTimes(1);
    expect(processFn).toHaveBeenCalledTimes(1);
  });
});
