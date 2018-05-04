/** @flow */
import sleep from "await-sleep";
import { default as Subject } from "../../src/helpers/LockHelper";

describe(Subject.name, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadSubject = async () =>
    (await import("../../src/helpers/LockHelper")).default;

  it("lockKey, unlockKey", async () => {
    const subject = await loadSubject();
    await subject.lockKey("hoge");
    subject.lockKey("hoge");
    await subject.unlockKey("hoge");
    await sleep(1500);
    expect(subject.keyLockMap.hoge).toBeTruthy();
    await subject.unlockKey("hoge");
    expect(subject.keyLockMap.hoge).toBeUndefined();
  });

  it("lockProcess, unlockProcess", async () => {
    const subject = await loadSubject();
    await subject.lockProcess();
    subject.unlockProcess();
    await sleep(1500);
    await subject.unlockProcess();
    await subject.unlockProcess();
  });
});
