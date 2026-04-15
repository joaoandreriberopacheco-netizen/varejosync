/**
 * Babel plugin that injects data-source-location attributes into JSX elements.
 * This enables the Modo Flare inspection system to locate source code positions.
 */

const path = require('path');

function sourceLocationBabelPlugin({ types: t }) {
  return {
    name: 'source-location-babel-plugin',
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const filename = state.filename || '';
        const loc = nodePath.node.loc;
        if (!loc) return;

        // Only annotate elements in src/ directory
        if (!filename.includes('/src/')) return;

        // Skip elements that already have the attribute
        const hasAttr = nodePath.node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name, { name: 'data-source-location' })
        );
        if (hasAttr) return;

        // Build relative path from project root
        const relPath = filename.replace(/.*\/src\//, 'src/');
        const value = `${relPath}:${loc.start.line}:${loc.start.column}`;

        nodePath.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-source-location'),
            t.stringLiteral(value)
          )
        );
      },
    },
  };
}

module.exports = sourceLocationBabelPlugin;