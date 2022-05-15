// @flow
import EnvironmentHelper from "./EnvironmentHelper";

export default class OpenCVHelper {
  static loadOpenCv: () => any = () => {
    if (EnvironmentHelper.isTest()) {
      // eslint-disable-next-line global-require
      return require("opencv4nodejs-prebuilt");
    }
    // eslint-disable-next-line global-require
    // return require("opencv4nodejs");
    // eslint-disable-next-line global-require
    return require("opencv4nodejs");
  };
}
