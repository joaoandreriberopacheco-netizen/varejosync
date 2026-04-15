/**
 * Babel plugin that injects data-source-location attributes into JSX elements.
 * Used by the Flare debug mode to identify component source positions.
 */
module.exports = function sourceLocationBabelPlugin({ types: t }) {
  return {
    name: 'source-location-babel-plugin',
    visitor: {
      JSXOpeningElement(path, state) {
        const filename = state.filename || 'unknown';
        const { line, column } = path.node.loc ? path.node.loc.start : { line: 0, column: 0 };

        // Skip built-in HTML elements (lowercase) and fragments
        const nameNode = path.node.name;
        if (t.isJSXIdentifier(nameNode) && /^[a-z]/.test(nameNode.name)) return;
        if (t.isJSXMemberExpression(nameNode)) return;

        // Normalize path: strip leading /app_temp/ or similar prefixes
        const normalizedPath = filename.replace(/^.*\/src\//, 'src/');

        const locationValue = `${normalizedPath}:${line}:${column}`;

        // Check if attribute already exists
        const exists = path.node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name, { name: 'data-source-location' })
        );

        if (!exists) {
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-source-location'),
              t.stringLiteral(locationValue)
            )
          );
        }
      },
    },
  };
};