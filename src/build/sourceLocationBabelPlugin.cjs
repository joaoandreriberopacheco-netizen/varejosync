/**
 * Babel plugin: injeta data-source-location em elementos JSX.
 * Usado pelo Modo Flare para localizar posições no código fonte.
 */
function sourceLocationBabelPlugin({ types: t }) {
  return {
    name: "source-location-babel-plugin",
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const filename = state.filename || "";
        const loc = nodePath.node.loc;
        if (!loc) return;
        if (!filename.includes("/src/")) return;
        const hasAttr = nodePath.node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name, { name: "data-source-location" })
        );
        if (hasAttr) return;
        const relPath = filename.replace(/.*\/src\//, "src/");
        const value = relPath + ":" + loc.start.line + ":" + loc.start.column;
        nodePath.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("data-source-location"),
            t.stringLiteral(value)
          )
        );
      },
    },
  };
}
module.exports = sourceLocationBabelPlugin;