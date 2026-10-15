# Conectar o Claude Code ao GoHighLevel

Duas conexões. A **oficial** (MCP) cobre contatos/pipelines/campos/calendário. A
**interna** (token do Firebase no `.env`) cobre workflows e dashboards.

## A. Token do Firebase (para o motor / API interna) — precisa do humano

O token é a **sessão do navegador** do usuário. Só ele consegue pegar. Peça a ele:

1. **Instalar a extensão** (uma vez):
   - Chrome → `chrome://extensions` → ligar **Modo do desenvolvedor**.
   - **Carregar sem compactação** → selecionar a pasta `extension/`.
2. **Abrir o GHL logado** (`app.gohighlevel.com` ou domínio white-label) e clicar em
   qualquer coisa / recarregar (pra gerar tráfego).
3. **Clicar no ícone da extensão** → copiar o **refresh token** ⭐ (a extensão captura só
   ele; o `token-id` o motor gera sozinho). Se ficar em "—" mesmo recarregando a página, é
   provável **white-label** → ajude a configurar: `references/configurar-whitelabel.md`.
4. **Colar no `.env`** em `GHL_FIREBASE_REFRESH_TOKEN=` — ou clicar **Enviar token pro
   CLI** com o companion rodando:
   ```bash
   python extension/companion_token_server.py   # Ctrl-C ao terminar
   ```

O `refresh token` é de longa duração; o motor renova o `token-id` (~1h) sozinho. Se o
motor reclamar que o token falhou, o refresh foi revogado → peça um novo (repita acima).

Guia detalhado que já existe no repo: `docs/get-firebase-token.md`.

## B. MCP oficial (para contatos/pipelines/campos/calendário)

1. O usuário cria o PIT: GHL → **Settings → Private Integrations → Create New
   Integration** → copia o `pit-…` e o **Location ID**.
2. Conecta o MCP (uma vez), na raiz do repo:
   ```bash
   claude mcp add --transport http gohighlevel \
     "https://services.leadconnectorhq.com/mcp/" \
     -H "Authorization: Bearer SEU_PIT" -H "locationId: SEU_LOCATION_ID"
   ```
3. Confirme com `/mcp` — deve listar **gohighlevel**. As ferramentas ficam disponíveis
   como `mcp__gohighlevel__*` (contatos, conversas, oportunidades, calendários, campos).

## Onde cada credencial é usada

- `.env` → `GHL_FIREBASE_REFRESH_TOKEN` alimenta o **motor** (`engine/`), API interna.
- `.env` → `GHL_PIT_TOKEN` + `GHL_LOCATION_ID` são usados pelo `StructureBuilder` (API
  oficial de custom fields/values/calendários) e pelo MCP.
- **Nunca** versione o `.env` nem imprima os tokens.
