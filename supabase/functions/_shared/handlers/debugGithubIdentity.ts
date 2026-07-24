// Port automático de base44/functions/debugGithubIdentity/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only.' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    // Quem sou eu?
    const meResp = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const me = await meResp.json();

    // Listar repos
    const reposResp = await fetch('https://api.github.com/user/repos?per_page=20&sort=updated', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const repos = await reposResp.json();

    // Env vars configuradas
    const owner  = Deno.env.get('FLARE_GITHUB_OWNER');
    const repo   = Deno.env.get('FLARE_GITHUB_REPO');
    const branch = Deno.env.get('FLARE_GITHUB_BRANCH');

    return Response.json({
      github_login: me.login,
      github_name: me.name,
      env_owner: owner,
      env_repo: repo,
      env_branch: branch,
      repos: Array.isArray(repos) ? repos.map(r => r.full_name) : repos,
    });

  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
