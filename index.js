#!/usr/bin/env node

// @flow
const App = require("./dist/App").default;

const app = new App();
app.run();
