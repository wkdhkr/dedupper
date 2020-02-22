/** @flow */
import Subject from "../src/App";
import TestHelper from "../src/helpers/TestHelper";

jest.useFakeTimers();

describe(Subject.name, () => {
  const loadSubject = async () => (await import("../src/App")).default;

  beforeEach(() => {
    jest.resetModules();
  });

  it("run", async () => {
    const exit = jest.fn();
    jest.doMock(
      "../src/helpers/ProcessHelper",
      () =>
        class C {
          static exit = exit;
        }
    );
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
          lockForSingleProcess = () => {};

          unlockForSingleProcess = () => {};

          process = processFn;
        }
    );
    const App = await loadSubject();
    const subject = new App();
    await subject.run();
    expect(parseArgs).toHaveBeenCalledTimes(1);
    expect(processFn).toHaveBeenCalledTimes(1);
  });

  it("run with dbRepair", async () => {
    const runFn = jest.fn().mockImplementation(async () => {});
    const parseArgs = jest.fn().mockImplementation(() => ({
      logConfig: true,
      dbRepair: true
    }));
    jest.doMock(
      "../src/Cli",
      () =>
        class C {
          parseArgs = parseArgs;
        }
    );
    jest.doMock(
      "../src/services/db/DbRepairService",
      () =>
        class C {
          run = runFn;
        }
    );
    const App = await loadSubject();
    const subject = new App();
    await subject.run();
    expect(parseArgs).toHaveBeenCalledTimes(1);
    expect(runFn).toHaveBeenCalledTimes(1);
  });

  it("close", async () => {
    const exit = jest.fn();
    const processFn = jest.fn().mockImplementation(async () => false);
    jest.doMock(
      "../src/helpers/ProcessHelper",
      () =>
        class C {
          static setStdInHook = (event, cb) => cb();

          static exit = exit;
        }
    );
    const parseArgs = jest.fn().mockImplementation(() => ({
      wait: true
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
          lockForSingleProcess = () => {};

          unlockForSingleProcess = () => {};

          process = processFn;
        }
    );
    const spyLog = jest.spyOn(console, "log");
    spyLog.mockImplementation(x => x);
    const App = await loadSubject();
    const subject = new App();
    await subject.run();
    jest.runAllTimers();
    expect(exit).toBeCalledWith(1);
    expect(exit).not.toBeCalledWith(0);
    expect(exit).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("close no wait", async () => {
    const exit = jest.fn();
    const processFn = jest.fn().mockImplementation(async () => false);
    jest.doMock(
      "../src/helpers/ProcessHelper",
      () =>
        class C {
          static exit = exit;
        }
    );
    const parseArgs = jest.fn().mockImplementation(() => ({}));
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
          lockForSingleProcess = () => {};

          unlockForSingleProcess = () => {};

          process = processFn;
        }
    );
    const App = await loadSubject();
    const subject = new App();
    await subject.run();
    jest.runAllTimers();
    expect(exit).toBeCalledWith(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("close by exeption", async () => {
    const exit = jest.fn();
    const processFn = jest
      .fn()
      .mockImplementation(async () => Promise.reject(new Error("error")));
    jest.doMock(
      "../src/helpers/ProcessHelper",
      () =>
        class C {
          static exit = exit;
        }
    );
    jest.doMock(
      "../src/services/ProcessService",
      () =>
        class C {
          lockForSingleProcess = () => {};

          unlockForSingleProcess = () => {};

          process = processFn;
        }
    );
    const App = await loadSubject();
    const subject = new App();
    await subject.run();
    expect(exit).toBeCalledWith(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });
});
