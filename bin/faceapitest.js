#!/usr/bin/env node
// @flow
// $FlowFixMe
const { performance } = require("perf_hooks");
// $FlowFixMe
const EnvironmentHelper = require("../dist/helpers/EnvironmentHelper").default;
// $FlowFixMe
const FaceApiService = require("../dist/services/deepLearning/faceApi/FaceApiService")
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

  const faceApiService = new FaceApiService(config);

  try {
    const startTime = performance.now();
    const results = await faceApiService.demo(process.argv[2]);
    const endTime = performance.now();
    results.forEach(result => {
      const {
        // descriptor,
        age,
        gender,
        // eslint-disable-next-line no-unused-vars
        landmarks,
        genderProbability,
        detection
      } = result;
      const { score, box } = detection;
      console.log({
        // descriptor,
        // landmarks,
        age,
        gender,
        genderProbability,
        score,
        box
      });
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
