// @flow

module.exports = {
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 8
  },
  env: {
    jest: true,
    node: true,
    es6: true
  },
  plugins: ["node", "prettier", "flowtype", "import"],
  extends: [
    "airbnb-base",
    "plugin:flowtype/recommended",
    "plugin:import/errors",
    "prettier",
    "prettier/flowtype"
  ],
  rules: {
    "prettier/prettier": "error",
    // "node/no-unsupported-features": ["error", { version: 8 }],
    /*
    "linebreak-style": [
      "error",
      process.env.NODE_ENV === "prod" ? "unix" : "windows"
    ],
    */
    "flowtype/require-valid-file-annotation": [2, "always"],
    "flowtype/require-return-type": [
      1,
      "always",
      {
        excludeArrowFunctions: true
      }
    ]
  }
};
