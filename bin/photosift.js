#!/usr/bin/env node
// @flow

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const EnvironmentHelper = require("./../dist/helpers/EnvironmentHelper")
  .default;

const { argv } = process;
if (!argv[2]) {
  console.log("usage: photosift [file path]");
  process.exit(0);
}

function replaceTargetFolder(settingsPath, targetPath) {
  const xmlString = fs.readFileSync(settingsPath, "utf-8");
  fs.writeFileSync(
    settingsPath,
    xmlString.replace(
      /<TargetFolder>.*<\/TargetFolder>/,
      `<TargetFolder>${path.resolve(targetPath)}</TargetFolder>`
    )
  );
}

// eslint-disable-next-line flowtype/require-return-type
async function main() {
  const userConfig = EnvironmentHelper.loadUserConfig();
  const { photoSiftDirPath } = userConfig;
  const photoSiftExecPath = path.join(photoSiftDirPath, "PhotoSift.exe");
  const photoSiftSettingsPath = path.join(photoSiftDirPath, "Settings.xml");
  replaceTargetFolder(photoSiftSettingsPath, argv[2]);

  const command = [photoSiftExecPath, `"${argv[2]}"`].join(" ");
  console.log(command);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`[ERROR] ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });
}

main();
