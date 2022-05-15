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
    "plugin:node/recommended",
    "airbnb-base",
    "plugin:flowtype/recommended",
    "plugin:import/errors",
    "prettier",
    "prettier/flowtype"
  ],
  rules: {
    "node/shebang": 0,
    "max-classes-per-file": 0,
    "no-console": 0,
    'prettier/prettier': [
      'error',
      {
        'endOfLine': 'auto',
      }
    ],
    "node/no-unpublished-require": 0,
    "node/no-unsupported-features/es-syntax": 0,
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
    ],
    complexity: ["error", { max: 8 }],
    // use for of. ignore airbnb rule.
    "no-restricted-syntax": [
      "error",
      {
        selector: "ForInStatement",
        message:
          "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array."
      },
      /*
      {
        selector: 'ForOfStatement',
        message: 'iterators/generators require regenerator-runtime, which is too heavyweight for this guide to allow them. Separately, loops should be avoided in favor of array iterations.',
      },
      */
      {
        selector: "LabeledStatement",
        message:
          "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand."
      },
      {
        selector: "WithStatement",
        message:
          "`with` is disallowed in strict mode because it makes code impossible to predict and optimize."
      }
    ]
  }
};
