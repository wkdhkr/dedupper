#!/usr/bin/env node
// @flow
// $FlowFixMe
const { performance } = require("perf_hooks");
// $FlowFixMe
const EnvironmentHelper = require("../dist/helpers/EnvironmentHelper").default;
// $FlowFixMe
const CocoSsdService = require("../dist/services/deepLearning/CocoSsdService")
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

  const service = new CocoSsdService(config);

  try {
    // await service.predict(process.argv[2]);
    const startTime = performance.now();
    const results = await service.demo(process.argv[2]);
    const endTime = performance.now();
    results.forEach(result => {
      console.log(result);
    });
    console.log(`${endTime - startTime}ms`);
    process.exit();
    // console.log(process._getActiveHandles());
    // console.log(process._getActiveRequests());
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

main();
