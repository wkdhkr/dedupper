#!/usr/bin/env node
// @flow
const EnvironmentHelper = require("./../dist/helpers/EnvironmentHelper")
  .default;
const FaceApiService = require("./../dist/services/deepLearning/faceApi/FaceApiService")
  .default;
const TestHelper = require("./../dist/helpers/TestHelper").default;

// eslint-disable-next-line flowtype/require-return-type
async function main() {
  const userConfig = EnvironmentHelper.loadUserConfig();
  const config = {
    ...TestHelper.createDummyConfig(),
    ...userConfig
  };

  const faceApiService = new FaceApiService(config);

  try {
    const results = await faceApiService.predict(process.argv[2]);
    results.forEach(result => {
      // eslint-disable-next-line no-unused-vars
      const { age, gender, landmarks, genderProbability, detection } = result;
      const { score, box } = detection;
      console.log({
        // landmarks,
        age,
        gender,
        genderProbability,
        score,
        box
      });
    });
    process.exit();
    // console.log(process._getActiveHandles());
    // console.log(process._getActiveRequests());
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

main();
