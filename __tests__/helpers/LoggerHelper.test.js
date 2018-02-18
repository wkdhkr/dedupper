/** @flow */
import { default as Subject } from "../../src/helpers/LoggerHelper";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../src/helpers/LoggerHelper")).default;

  it("loadUserConfig test", async () => {
    jest.doMock("log4js", () => ({
      configure: () => {},
      shutdown: cb => cb()
    }));
    const subject = await loadSubject();

    expect(subject.configure({})).toBeUndefined();
    expect(await subject.flush()).toBeUndefined();
  });
});
