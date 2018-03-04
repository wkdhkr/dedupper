/** @flow */
import { default as Subject } from "../../src/helpers/LoggerHelper";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../src/helpers/LoggerHelper")).default;

  it("configure, flush, getLogger", async () => {
    jest.doMock("./../../src/helpers/EnvironmentHelper", () => ({
      isTest: () => false
    }));
    jest.doMock("log4js", () => ({
      configure: () => {},
      shutdown: cb => cb(),
      getLogger: () => ({})
    }));
    const subject = await loadSubject();

    expect(subject.configure({})).toBeUndefined();
    expect(subject.getLogger(Subject)).toEqual({});
    expect(await subject.flush()).toBeUndefined();
  });
});
