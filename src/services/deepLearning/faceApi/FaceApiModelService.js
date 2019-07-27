// @flow
import axios from "axios";
import path from "path";
import FileService from "../../fs/FileService";
import DeepLearningHelper from "../../../helpers/DeepLearningHelper";
import type { Config } from "../../../types";
import type { FaceApiModelName } from "../../../types/DeepLearningTypes";

export default class FaceApiModelService {
  config: Config;

  fs: FileService;

  constructor(config: Config) {
    this.config = config;
    this.fs = new FileService(config);
  }

  async prepare(name: FaceApiModelName): Promise<string> {
    await this.download(name);
    return this.getPathByName(name);
  }

  async download(name: FaceApiModelName): Promise<void> {
    const urls = this.getModelUrlsByName(name);
    if (DeepLearningHelper.isFaceApiModelDownloaded(name)) {
      return;
    }
    await Promise.all(
      urls.map(async url => {
        const outputPath = path.join(
          this.config.deepLearningConfig.faceApiModelBasePath,
          name,
          path.basename(url)
        );
        if (
          !this.config.resetFaceApiModel &&
          (await this.fs.pathExists(outputPath))
        ) {
          return Promise.resolve();
        }
        const { data } = await axios.get(url, {
          responseType: "arraybuffer",
          dataType: "binary"
        });
        await this.fs.prepareDir(path.dirname(outputPath));
        return this.fs.write(outputPath, data);
      })
    );
    DeepLearningHelper.setFaceApiModelDownloadState(name, true);
  }

  getPathByName(name: FaceApiModelName): string {
    return path.join(this.config.deepLearningConfig.faceApiModelBasePath, name);
  }

  getModelUrlsByName(name: FaceApiModelName): string[] {
    return this.config.deepLearningConfig.faceApiModelUrlsByName[name];
  }
}
