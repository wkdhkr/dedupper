#!/usr/bin/env node

// @flow
const PHashService = require("./../dist/services/fs/contents/PHashService")
  .default;

const { argv } = process;

console.log(PHashService.compare(argv[2], argv[3]));
