function toPosixPath(input) {
  return String(input || "").replace(/\\/g, "/");
}

module.exports = function sourceLocationBabelPlugin() {
  return {
    name: "inject-data-source-location",
    visitor: {
      JSXOpeningElement(path, state) {
        const attrs = path.node.attributes || [];
        const hasSource = attrs.some(
          (attr) =>
            attr &&
            attr.type === "JSXAttribute" &&
            attr.name &&
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "data-source-location"
        );
        if (hasSource) return;

        const loc = path.node.loc && path.node.loc.start;
        const line = loc && Number.isFinite(loc.line) ? loc.line : 1;
        const column = loc && Number.isFinite(loc.column) ? loc.column : 0;
        const filename = toPosixPath(
          state?.file?.opts?.filename || state?.filename || "unknown"
        );
        const value = `${filename}:${line}:${column}`;

        attrs.unshift({
          type: "JSXAttribute",
          name: { type: "JSXIdentifier", name: "data-source-location" },
          value: { type: "StringLiteral", value },
        });
      },
    },
  };
};
