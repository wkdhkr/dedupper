/** @flow */
import { default as Subject } from "../../src/helpers/EnvironmentHelper";

describe(Subject.name, () => {
  it("get home directory", () => {
    Object.defineProperty(process, "platform", {
      value: "win32"
    });
    expect(Subject.getHomeDir()).toBe(process.env.USERPROFILE);
  });
});
