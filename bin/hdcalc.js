#!/usr/bin/env node
// @flow
const PHashService = require("./../dist/services/fs/contents/PHashService")
  .default;
const DHashService = require("./../dist/services/fs/contents/DHashService")
  .default;
const TestHelper = require("./../dist/helpers/TestHelper").default;

const { argv } = process;

if ((argv[2] || "").match(/^[0-9]+$/)) {
  console.log(PHashService.compare(argv[2], argv[3]));
  process.exit(0);
}

const pHashService = new PHashService(TestHelper.createDummyConfig());
const dHashService = new DHashService(TestHelper.createDummyConfig());

async function c() {
  console.log(
    "p-hash distance:",
    PHashService.compare(
      await pHashService.calculate(argv[2]),
      await pHashService.calculate(argv[3])
    )
  );

  console.log(
    "d-hash distance:",
    DHashService.compare(
      await dHashService.calculate(argv[2]),
      await dHashService.calculate(argv[3])
    )
  );
}
c();
