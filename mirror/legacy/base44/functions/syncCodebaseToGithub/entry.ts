import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get GitHub access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    // Parse payload to get repo info
    const bodyText = await req.text();
    const payload = bodyText ? JSON.parse(bodyText) : {};
    const { owner = 'quarter-master-ai', repo = 'app' } = payload;

    // Create comprehensive codebase snapshot
    const snapshot = {
      timestamp: new Date().toISOString(),
      project: 'Quarter Master ERP System',
      description: 'Comprehensive ERP system for supply chain, sales, and financial management',
      structure: {
        pages: {
          description: 'Main application routes and page components',
          count: 'Multiple (Home, PDV, Compras, Financeiro, etc)',
          purpose: 'Top-level page components rendered via React Router'
        },
        components: {
          description: 'Reusable UI and business logic components',
          structure: {
            ui: 'Button, Dialog, Input, Card, Tabs, etc (shadcn/ui based)',
            layout: 'Sidebar, BottomNav, MobileUserMenu, etc',
            domain: 'Specific business components (PDV, Compras, Financeiro modules)',
            forms: 'Form dialogs and input handlers'
          }
        },
        entities: {
          description: 'Data schemas for business entities',
          keyEntities: [
            'Produto, Terceiro, PedidoVenda, PedidoCompra',
            'LancamentoFinanceiro, ContasFinanceiras, FormasDePagamento',
            'Estoque, MovimentacaoEstoque, TurnosCaixa',
            'Veiculo, AgendaLogistica, EventosLogisticos',
            'Tarefa, Campanha, ConferenciaEstoque'
          ]
        },
        functions: {
          description: 'Deno backend functions for business logic',
          categories: [
            'Geração de relatórios (PDF, Excel)',
            'Importação de dados (Produtos, Pedidos)',
            'Processamento de vendas e caixa',
            'Sincronização de estoque',
            'Automação de aprovações financeiras',
            'Validação e auditoria'
          ]
        }
      },
      technicalStack: {
        frontend: 'React 18 + Vite, React Router, TailwindCSS, shadcn/ui',
        backend: 'Deno runtime, Base44 SDK, TypeScript',
        styling: 'Glacial Design System (minimalist, gray/white palette)',
        database: 'Base44 Entity Storage (PostgreSQL-compatible)',
        integrations: 'GitHub (authorized), Google Drive'
      },
      designPrinciples: {
        glacialMode: 'Minimalist UI: no visible borders, subtle shadows, gray/white palette',
        mobileFocused: 'Progressive enhancement from mobile → desktop',
        modular: 'Small, focused components (< 50 lines each)',
        responsive: 'Breakpoints: mobile, tablet, desktop'
      },
      cursorOptimization: {
        purpose: 'Enable Cursor AI to understand codebase structure for better prompts',
        benefits: [
          'Context-aware code generation',
          'Consistent refactoring across modules',
          'Impact analysis for changes',
          'Architecture-aware suggestions'
        ],
        updateFrequency: 'On-demand via webhook or scheduled sync'
      }
    };

    // Prepare GitHub API call to create/update file
    const snapshotContent = JSON.stringify(snapshot, null, 2);
    const encodedContent = btoa(snapshotContent); // Base64 encode

    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const filePath = 'CODEBASE_SNAPSHOT.json';
    const url = `${baseUrl}/${filePath}`;

    // Get current file SHA if exists (for updates)
    let sha = null;
    try {
      const existingRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (existingRes.ok) {
        const existing = await existingRes.json();
        sha = existing.sha;
      }
    } catch (e) {
      // File doesn't exist yet, which is fine
    }

    // Create or update file
    const updatePayload = {
      message: `[snapshot] Update codebase context for Cursor AI (${new Date().toISOString().split('T')[0]})`,
      content: encodedContent,
      branch: 'main'
    };

    if (sha) {
      updatePayload.sha = sha;
    }

    const githubRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!githubRes.ok) {
      const error = await githubRes.text();
      throw new Error(`GitHub API error: ${githubRes.status} - ${error}`);
    }

    const result = await githubRes.json();

    return Response.json({
      success: true,
      message: 'Codebase snapshot synced to GitHub',
      file: {
        path: filePath,
        url: result.content.html_url,
        commit: result.commit.sha
      },
      snapshot: {
        timestamp: snapshot.timestamp,
        entities: snapshot.structure.entities.keyEntities.length,
        designMode: 'Glacial (minimalist)'
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});