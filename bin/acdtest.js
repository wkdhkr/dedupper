// @flow
// $FlowFixMe
const Service = require("../dist/services/amazon/ACDService").default;
// $FlowFixMe
const EnvironmentHelper = require("../dist/helpers/EnvironmentHelper").default;
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
    await service.init();
    await service.demo();
    process.exit();
  } catch (e) {
    console.log(e);
    setTimeout(() => process.exit(1), 1000);
  }
}

main();
