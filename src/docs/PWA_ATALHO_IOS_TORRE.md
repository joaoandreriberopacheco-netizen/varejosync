# Atalho iOS para Torre de Controle

## Objetivo

Usar a Torre de Controle no iOS sem depender de Web Share Target, com base em conteúdo copiado e/ou seleção manual de arquivo.

## Passos no app Atalhos (iOS)

1. Criar atalho com ação para **obter texto/URL** da partilha ou da área de transferência.
2. Abrir URL:
   - `/AnexoCompartilhado?destino=torre&clipboard=1`
3. No app P38, tocar em **Colar da área de transferência**.

## Comportamento por plataforma

- **iOS (PWA):**
  - Melhor fluxo: `clipboard.readText()` (texto/URL) + botão **Selecionar arquivo**.
  - Colagem de binário via clipboard pode variar por versão/permissões.

- **Desktop/Android:**
  - **Selecionar arquivo** via input nativo.
  - **Colar** tenta `clipboard.read()` para PDF/imagem e fallback para `readText()`.

## Observações

- Se a permissão de clipboard estiver bloqueada, a Torre exibe mensagem e mantém o utilizador na mesma etapa.
- O share target nativo (manifest + service worker) continua ativo para navegadores/plataformas compatíveis.
