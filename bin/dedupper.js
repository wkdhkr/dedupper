#!/usr/bin/env node

// @flow
const App = require("./../dist/App").default;

process.on("unhandledRejection", console.dir);
const app = new App();
app.run();
