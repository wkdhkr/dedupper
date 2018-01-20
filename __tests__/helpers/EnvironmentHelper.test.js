/** @flow */
import { default as Subject } from "../../src/helpers/EnvironmentHelper";

describe(Subject.name, () => {
  it("get home directory", () => {
    Object.defineProperty(process, "platform", {
      value: "win32"
    });
    expect(Subject.getHomeDir()).toBe(process.env.USERPROFILE);

    Object.defineProperty(process, "platform", {
      value: "unix"
    });
    Object.defineProperty(process.env, "HOME", {
      value: process.env.USERPROFILE
    });
    expect(Subject.getHomeDir()).toBe(process.env.USERPROFILE);
  });
});
