import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLUGIN_CONTENT = [
  '/**',
  ' * Babel plugin: injeta data-source-location em elementos JSX.',
  ' * Usado pelo Modo Flare para localizar posicoes no codigo fonte.',
  ' */',
  'function sourceLocationBabelPlugin({ types: t }) {',
  '  return {',
  '    name: "source-location-babel-plugin",',
  '    visitor: {',
  '      JSXOpeningElement(nodePath, state) {',
  '        const filename = state.filename || "";',
  '        const loc = nodePath.node.loc;',
  '        if (!loc) return;',
  '        if (!filename.includes("/src/")) return;',
  '        const hasAttr = nodePath.node.attributes.some(',
  '          (attr) =>',
  '            t.isJSXAttribute(attr) &&',
  '            t.isJSXIdentifier(attr.name, { name: "data-source-location" })',
  '        );',
  '        if (hasAttr) return;',
  '        const relPath = filename.replace(/.*\\/src\\//, "src/");',
  '        const value = relPath + ":" + loc.start.line + ":" + loc.start.column;',
  '        nodePath.node.attributes.push(',
  '          t.jsxAttribute(',
  '            t.jsxIdentifier("data-source-location"),',
  '            t.stringLiteral(value)',
  '          )',
  '        );',
  '      },',
  '    },',
  '  };',
  '}',
  'module.exports = sourceLocationBabelPlugin;',
].join('\n');

async function getFileSha(owner, repo, path, token) {
  const url = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path;
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github.v3+json' },
  });
  if (res.status === 404) return null;
  const data = await res.json();
  return data.sha || null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accessToken = Deno.env.get('GITHUB_TOKEN');
  const owner = Deno.env.get('FLARE_GITHUB_OWNER');
  const repo = Deno.env.get('FLARE_GITHUB_REPO');
  const branch = Deno.env.get('FLARE_GITHUB_BRANCH') || 'main';

  if (!owner || !repo) {
    return Response.json({ error: 'Missing FLARE_GITHUB_OWNER or FLARE_GITHUB_REPO' }, { status: 400 });
  }

  const filePath = 'build/sourceLocationBabelPlugin.cjs';
  const sha = await getFileSha(owner, repo, filePath, accessToken);

  const encoder = new TextEncoder();
  const bytes = encoder.encode(PLUGIN_CONTENT);
  const contentB64 = btoa(String.fromCharCode(...bytes));

  const body = {
    message: 'chore: add sourceLocationBabelPlugin.cjs (required by vite.config.js)',
    content: contentB64,
    branch,
  };
  if (sha) body.sha = sha;

  const url = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + filePath;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return Response.json({ error: 'GitHub API error', details: data }, { status: res.status });
  }

  return Response.json({
    ok: true,
    action: sha ? 'updated' : 'created',
    path: filePath,
    commit: data.commit?.sha,
    message: 'File committed to GitHub. Sync will pull it to platform automatically.',
  });
});