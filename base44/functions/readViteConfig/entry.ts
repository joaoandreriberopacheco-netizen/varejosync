import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const owner = Deno.env.get('FLARE_GITHUB_OWNER');
  const repo = Deno.env.get('FLARE_GITHUB_REPO');
  const token = Deno.env.get('GITHUB_TOKEN');

  if (!owner || !repo || !token) {
    return Response.json({ error: 'Missing FLARE_GITHUB_OWNER, FLARE_GITHUB_REPO or GITHUB_TOKEN secrets' }, { status: 400 });
  }

  // Read vite.config.js from repo root
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/vite.config.js`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3.raw',
    },
  });

  if (!res.ok) {
    return Response.json({ error: `GitHub ${res.status}`, body: await res.text() }, { status: res.status });
  }

  const content = await res.text();
  return Response.json({ vite_config: content });
});