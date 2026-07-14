/**
 * API HTTP local (dev): GET /pending | GET /export — usa as mesmas env vars que flare:list.
 * Porta: FLARE_API_PORT (default 3844). Token só no processo local, não exposto ao browser.
 */
import http from 'http';
import { join } from 'path';
import { URL } from 'url';
import {
  DEFAULT_EXPORT_REL,
  fetchPendingTargetFlares,
  getFlareEnv,
  REPO_ROOT,
  tryFlareClient,
  writeFlareExportFile,
} from './flare-sdk.mjs';

const PORT = Number(process.env.FLARE_API_PORT || 3844);

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    if (url.pathname === '/health') {
      const { appId, token } = getFlareEnv();
      json(res, 200, { ok: true, hasCredentials: Boolean(appId && token) });
      return;
    }

    if (url.pathname !== '/pending' && url.pathname !== '/export') {
      json(res, 404, { error: 'Not found', hint: 'GET /pending | GET /export | GET /health' });
      return;
    }

    const base44 = tryFlareClient();
    if (!base44) {
      json(res, 503, {
        error: 'Credenciais em falta',
        hint: 'Defina VITE_BASE44_APP_ID e BASE44_ACCESS_TOKEN no ambiente do processo.',
      });
      return;
    }
    const items = await fetchPendingTargetFlares(base44);

    if (url.pathname === '/export') {
      const written = writeFlareExportFile(items, join(REPO_ROOT, DEFAULT_EXPORT_REL));
      json(res, 200, {
        exportedAt: new Date().toISOString(),
        count: items.length,
        path: written,
        items,
      });
      return;
    }

    json(res, 200, {
      exportedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (e) {
    json(res, 500, { error: String(e?.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[flare-api] http://127.0.0.1:${PORT}/pending | /export | /health`);
});
