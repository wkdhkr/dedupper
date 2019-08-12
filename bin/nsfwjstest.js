#!/usr/bin/env node
// @flow
// $FlowFixMe
const { performance } = require("perf_hooks");
// $FlowFixMe
const EnvironmentHelper = require("../dist/helpers/EnvironmentHelper").default;
// $FlowFixMe
const NsfwJsService = require("../dist/services/deepLearning/NsfwJsService")
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

  const service = new NsfwJsService(config);

  try {
    await service.predict(process.argv[2]);
    const startTime = performance.now();
    // performance check
    /*
    const result = (await Promise.all([
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2]),
      await service.predict(process.argv[2])
    ]))[0];
    */
    const result = await service.predict(process.argv[2]);
    const endTime = performance.now();
    console.log(result);
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
