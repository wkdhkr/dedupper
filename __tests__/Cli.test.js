/** @flow */

import Subject from "../src/Cli";

describe(Subject.name, () => {
  let subject;
  beforeEach(() => {
    subject = new Subject();
  });
  it("parseArgs", async () => {
    expect(await subject.parseArgs()).toMatchObject({ pHash: true });
  });
});
