// @flow
/*
import im from "imagemagick-native";
import { promisify } from "util";

const identifyAsync = promisify(im.identify);

export default class ImageMagickNativeService {
  identify = async (targetPath: string) => {
    const result = await identifyAsync({
      srcData: targetPath
    });
    const width = Number(result.width);
    const height = Number(result.height);
    const ratio = width / height || 0;

    console.log(result);

    return {
      width,
      height,
      hash: "",
      ratio,
      damaged: false
    };
  };
}
*/
