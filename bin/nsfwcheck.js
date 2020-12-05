#!/usr/bin/env node
// @flow

const concat = require("concat-stream");
const fs = require("fs-extra");
const FormData = require("form-data");
const axios = require("axios");

const { argv } = process;
if (!argv[2]) {
  console.log("usage: nsfwcheck [file path]");
  process.exit(0);
}

// eslint-disable-next-line flowtype/require-return-type
function main() {
  const form = new FormData();
  form.append("image", fs.createReadStream(argv[2]));
  form.pipe(
    concat({ encoding: "buffer" }, async data => {
      console.log(
        JSON.stringify(
          (
            await axios.post("http://localhost:5000/image", data, {
              headers: form.getHeaders()
            })
          ).data,
          null,
          2
        )
      );
    })
  );
}

main();
