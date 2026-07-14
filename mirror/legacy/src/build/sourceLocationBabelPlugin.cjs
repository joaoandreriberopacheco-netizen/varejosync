/**
 * Babel plugin that injects `data-source-location` attributes into JSX elements.
 * Used by Flare Mode to map UI elements back to source file locations.
 */
module.exports = function sourceLocationBabelPlugin({ types: t }) {
  const normalizeToSrcPath = (value) => {
    const normalized = String(value || '').replace(/\\/g, '/');
    const marker = '/src/';
    const idx = normalized.lastIndexOf(marker);
    if (idx !== -1) return `src/${normalized.slice(idx + marker.length)}`;
    if (normalized.startsWith('src/')) return normalized;
    return normalized;
  };

  return {
    name: 'source-location-babel-plugin',
    visitor: {
      JSXOpeningElement(path, state) {
        const filename = state.filename || '';
        const loc = path.node.loc;
        if (!loc) return;

        // Skip self-closing elements that are already annotated
        const existingAttr = path.node.attributes.find(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name, { name: 'data-source-location' })
        );
        if (existingAttr) return;

        const relPath = normalizeToSrcPath(filename);
        if (!relPath.startsWith('src/')) return;

        const value = `${relPath}:${loc.start.line}:${loc.start.column}`;

        path.node.attributes.push(
          t.jSXAttribute(
            t.jSXIdentifier('data-source-location'),
            t.stringLiteral(value)
          )
        );
      },
    },
  };
};