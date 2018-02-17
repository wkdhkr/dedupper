#!/usr/bin/env node
// @flow
const concat = require("concat-stream");
const fs = require("fs-extra");
const FormData = require("form-data");
const axios = require("axios");
// const http = require("http");
// const https = require("https");

const { argv } = process;
if (!argv[2]) {
  console.log("usage: facecheck [file path]");
  process.exit(0);
}

// eslint-disable-next-line flowtype/require-return-type
function createReadStream(url) {
  // if (url.startsWith("http://")) {
  //   return new Promise(r => http.request(url, response => r(response)));
  // }
  // if (url.startsWith("https://")) {
  //   return new Promise(r => https.request(url, response => r(response)));
  // }
  return Promise.resolve(fs.createReadStream(url));
}

// eslint-disable-next-line flowtype/require-return-type
function main2(postData) {
  const form = new FormData();
  form.append("no_data", 1);
  form.append("data_set", JSON.stringify(postData));
  form.pipe(
    concat({ encoding: "buffer" }, async data => {
      const { data: res } = await axios.post(
        "http://localhost:5002/face/predict",
        data,
        {
          headers: form.getHeaders()
        }
      );
      console.log(JSON.stringify(res, null, 2));
    })
  );
}

// eslint-disable-next-line flowtype/require-return-type
async function main() {
  const form = new FormData();
  // form.append("no_data", 1);
  if (argv[3]) {
    form.append("image", await createReadStream(argv[3]));
    form.append("original", 1);
    argv[2].split("+").forEach(c => form.append("class", c));
  } else {
    form.append("image", await createReadStream(argv[2]));
  }
  form.pipe(
    concat({ encoding: "buffer" }, async data => {
      const { data: res } = await axios.post(
        "http://localhost:5001/face/detect",
        data,
        {
          headers: form.getHeaders()
        }
      );
      // console.log(JSON.stringify(res, null, 2));
      main2(res);
    })
  );
}

main();
