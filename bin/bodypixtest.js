// @flow
// $FlowFixMe
const { performance } = require("perf_hooks");
// $FlowFixMe
const EnvironmentHelper = require("../dist/helpers/EnvironmentHelper").default;
// $FlowFixMe
const Service = require("../dist/services/deepLearning/bodyPix/BodyPixService")
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

  const service = new Service(config);

  try {
    // await service.demo(process.argv[2]);
    const startTime = performance.now();
    const [ratio, results] = await service.demo(process.argv[2]);
    console.log(`ratio: ${ratio}`);
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
