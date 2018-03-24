/** @flow */
import { default as Subject } from "../../src/helpers/ProcessHelper";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../src/helpers/ProcessHelper")).default;

  it("setStdInHook", async () => {
    const event = "a";
    const cb = jest.fn();

    const subject = await loadSubject();

    const spySetRawMode = jest.spyOn(process.stdin, "setRawMode");
    const spyResume = jest.spyOn(process.stdin, "resume");
    const spyOn = jest.spyOn(process.stdin, "on");

    spySetRawMode.mockImplementation(() => {});
    spyOn.mockImplementation((e, f) => f());
    spyResume.mockImplementation(() => {});

    subject.setStdInHook(event, cb);

    expect(spySetRawMode).toBeCalledWith(true);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(spyResume).toHaveBeenCalledTimes(1);
  });

  it("exit", async () => {
    const subject = await loadSubject();
    const spyExit = jest.spyOn(process, "exit");
    spyExit.mockImplementation(() => {});
    subject.exit(3);
    expect(spyExit).toBeCalledWith(3);
  });
});
