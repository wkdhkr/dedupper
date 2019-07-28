#!/usr/bin/env node
// @flow
// $FlowFixMe
const ImageMagickService = require("../dist/services/fs/contents/ImageMagickService")
  .default;
// $FlowFixMe
const PHashService = require("../dist/services/fs/contents/PHashService")
  .default;
// $FlowFixMe
const DHashService = require("../dist/services/fs/contents/DHashService")
  .default;
// $FlowFixMe
const TestHelper = require("../dist/helpers/TestHelper").default;

const { argv } = process;

if ((argv[2] || "").match(/^[0-9]+$/)) {
  console.log(PHashService.compare(argv[2], argv[3]));
  process.exit(0);
}

const pHashService = new PHashService(TestHelper.createDummyConfig());
const dHashService = new DHashService(TestHelper.createDummyConfig());

// eslint-disable-next-line flowtype/require-return-type
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

  const is = new ImageMagickService();
  const [as, bs] = await Promise.all([
    is.statistic(argv[2]),
    is.statistic(argv[3])
  ]);

  console.log(
    `entropy difference: ${as.entropy} - ${bs.entropy} = ${as.entropy -
      bs.entropy}`
  );

  console.log(
    `quality difference: ${as.quality} - ${bs.quality} = ${Number(
      as.quality - bs.quality
    )}`
  );
  console.log(
    `mean difference: ${as.mean} - ${bs.mean} = ${as.mean - bs.mean}`
  );
}
c();
