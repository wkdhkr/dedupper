#!/usr/bin/env node
// @flow
// $FlowFixMe
const { performance } = require("perf_hooks");
// $FlowFixMe
const EnvironmentHelper = require("../dist/helpers/EnvironmentHelper").default;
// $FlowFixMe
const FacePPService = require("../dist/services/deepLearning/facePP/FacePPService")
  .default;
// $FlowFixMe
const TestHelper = require("../dist/helpers/TestHelper").default;

// eslint-disable-next-line flowtype/require-return-type
async function main() {
  const userConfig = EnvironmentHelper.loadUserConfig();
  const config = {
    ...TestHelper.createDummyConfig(),
    ...userConfig
  };

  const service = new FacePPService(config);

  try {
    // await service.demo(process.argv[2]);
    const startTime = performance.now();
    const result = await service.demo(process.argv[2]);
    const endTime = performance.now();
    console.log(JSON.stringify(result, null, 2));
    console.log(`${endTime - startTime}ms`);
    process.exit();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

main();
