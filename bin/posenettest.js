#!/usr/bin/env node
// @flow
// $FlowFixMe
const { performance } = require("perf_hooks");
// $FlowFixMe
const EnvironmentHelper = require("../dist/helpers/EnvironmentHelper").default;
// $FlowFixMe
const PoseNetService = require("../dist/services/deepLearning/poseNet/PoseNetService")
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

  const poseNetService = new PoseNetService(config);

  try {
    const startTime = performance.now();
    const results = await poseNetService.demo(process.argv[2]);
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
