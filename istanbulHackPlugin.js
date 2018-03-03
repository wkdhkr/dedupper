// @flow
// Restore old babylon behavior for istanbul.
// https://github.com/babel/babel/pull/6836
// https://github.com/istanbuljs/istanbuljs/issues/119
module.exports = () => ({
  visitor: {
    // $FlowFixMe
    Program(programPath) {
      programPath.traverse({
        ArrowFunctionExpression(path) {
          const { node } = path;
          node.expression = node.body.type !== "BlockStatement";
        }
      });
    }
  }
});
