---
name: ghl-autopilot
description: >
  Automatiza uma conta GoHighLevel de ponta a ponta com o Claude Code, guiado por um
  documento: conecta na conta (token do Firebase + MCP oficial), mapeia a conta, e
  implementa sozinho workflows, pipelines, custom fields, calendários e DASHBOARDS via
  API. Use SEMPRE que o usuário quiser automatizar/configurar o GoHighLevel — criar
  workflow, funil, automação, pipeline, custom field, calendário ou dashboard no GHL,
  "implementar um spec", conectar o Claude ao GHL, pegar o token/refresh token do GHL,
  ou apenas mencionar GoHighLevel, GHL, HighLevel ou LeadConnector — mesmo que não peça
  a skill pelo nome. Feita pela AVA Partners.
---

# GHL Autopilot — automatize o GoHighLevel guiado por documento

Esta skill ensina você (Claude Code) a fazer no GoHighLevel exatamente o que a AVA
Partners fez neste projeto: o usuário escreve um **documento de spec** em português e
você **implementa sozinho** — do zero à automação rodando, incluindo dashboards.

> ⚠️ **Conta real de produção.** Toda escrita é uma ação de verdade. Siga as **Regras de
> segurança** abaixo à risca. Use só na conta do próprio usuário. Ver `SECURITY.md`.

## Como o GHL funciona (o modelo mental)

O GHL tem **duas APIs** e você usa as duas:

| API | Base | Auth | Faz |
|---|---|---|---|
| **Oficial** | `services.leadconnectorhq.com` | PIT (`pit-…`) via MCP | contatos, pipelines, custom fields, calendários |
| **Interna** (não-oficial) | `backend.leadconnectorhq.com` | token do Firebase (`token-id`) | workflows, dashboards, pastas |

O **motor** deste repo (`engine/`) encapsula as duas. Você monta a automação chamando o
motor — não precisa reescrever chamadas HTTP.

## O fluxo (siga nesta ordem)

### 0. Pré-requisitos
- O usuário está dentro do repo `ava-partners-ghl` com o Claude Code.
- Existe um `.env` (copiado de `.env.example`). Se não existir, peça pra ele criar.

### 1. Conectar → **precisa do humano**
A parte avançada (workflows/dashboards) exige o **token do Firebase**, que só o humano
consegue pegar (é a sessão do navegador dele). Peça a ele:
1. Instalar a **extensão** em `extension/` e clicar em **Copiar refresh token**.
2. Colar em `GHL_FIREBASE_REFRESH_TOKEN=` no `.env` (ou usar o companion).
3. Para a API oficial, conectar o MCP com o PIT (comando em `references/conectar.md`).

Detalhes passo a passo: leia **`references/conectar.md`** e `docs/get-firebase-token.md`.
Se `GHL_FIREBASE_REFRESH_TOKEN` estiver vazio, **pare e peça o token** — não invente.

**Se a extensão não pegar o token (popup em "—"):** provavelmente a pessoa usa um
**domínio white-label** próprio. Ajude-a a configurar — leia e siga
**`references/configurar-whitelabel.md`** (você pode editar o `manifest.json` dela). Esse é
um momento comum e esperado.

### 2. Mapear a conta (LEITURA primeiro)
Antes de escrever qualquer coisa, descubra o que já existe: pipelines + estágios (e seus
IDs), tags, custom fields. Use o MCP (`mcp__gohighlevel__*`) ou o motor
(`StructureBuilder.list_*`). Isso evita duplicar e te dá os **IDs reais** que os
workflows/dashboards precisam. Se algo do spec não existir (ex.: um pipeline), você vai
criá-lo neste passo.

### 3. Ler o spec e fazer um plano → **precisa do humano (aprovação)**
- Leia o documento em `specs/` **inteiro**.
- Confira contra o contexto real da conta (passo 2).
- **Mostre um plano curto e ESPERE aprovação** antes de qualquer escrita. Nunca saia
  criando/movendo/enviando sem o "ok" do usuário. Se o spec estiver ambíguo, **pergunte**.

### 4. Implementar via motor
Implemente passo a passo, na ordem do spec, usando o motor. Guia completo com exemplos:
leia **`references/engine.md`**. Resumo:
- **Workflow:** monte a DSL (`engine/wf_nodes.py`), compile e suba com um gatilho
  (`engine/wf_deploy.py`). **Sempre em rascunho.**
- **Pipeline / custom field / custom value / calendário:** `StructureBuilder`
  (`engine/ghl_structure.py`).
- **Dashboard ("Painel de controle"):** `DashboardBuilder` (`engine/ghl_dashboard.py`) —
  seções + cards de KPI com layout automático.
- Exemplos rodáveis prontos: `examples/funil_boas_vindas.py` e `examples/dashboard_kpis.py`.

### 5. Validar
Cheque cada item dos **Critérios de aceite** do spec e diga ao usuário o que ficou pronto
e o que faltou. Dê o link do workflow/dashboard pra ele revisar.

## Quando você VAI precisar do humano (não tente adivinhar)

Esses são os pontos onde a AVA precisou do humano — trate como parte normal do fluxo:

1. **Pegar o token do Firebase.** É a sessão do navegador dele; só ele pega (via extensão).
   Se o token expirar/falhar, peça um novo.
2. **Aprovar o plano antes de escrever.** Toda ação de escrita é real — confirme antes.
3. **Descobrir schemas escondidos.** Alguns recursos internos (ex.: headers do serviço de
   reporting, lista de pastas de campo, formato de widget) não vêm em nenhum GET
   documentado. Quando bater nessa parede: peça ao humano pra **abrir a aba Network do
   navegador** (ou usar o **modo desenvolvedor** da extensão), reproduzir a ação no CRM, e
   **colar a requisição (URL + headers + corpo)**. Foi assim que a AVA descobriu o que está
   em `references/api-interna.md`. Não fique adivinhando endpoint no escuro por muito tempo —
   caçe um pouco e, se não achar, peça a captura.
4. **Confirmar dados da conta.** Nomes/valores específicos (tags de canal, nomes de
   pipeline, opções de custom field) — confirme com o humano se o spec não deixar claro.

## Regras de segurança (INEGOCIÁVEIS)

- **Confirme antes de qualquer escrita** (criar/atualizar/deletar contato, mover
  oportunidade, enviar mensagem, criar post/template). Mostre exatamente o que e onde.
- **Workflows sempre em rascunho (`draft`).** O humano revisa e ativa.
- **Nunca dispare mensagens/e-mails em massa** sem aprovação do texto e da lista.
- **Só a própria conta do usuário.** Nunca a conta de um cliente. O token é o login inteiro.
- **Nunca imprima nem versione o token.** Ele não vai pra log, print nem git.
- Em dúvida sobre destruir/sobrescrever dados: **pare e pergunte.**
- Prefira **começar em leitura** (mapear) antes de escrever.

## Arquivos de referência (leia sob demanda)

- **`references/conectar.md`** — pegar o token do Firebase (extensão) + conectar o MCP oficial.
- **`references/configurar-whitelabel.md`** — quando a extensão não pega o token (domínio white-label): como configurar o domínio da pessoa.
- **`references/engine.md`** — usar o motor: workflows, estrutura e dashboards, com exemplos.
- **`references/api-interna.md`** — cheatsheet dos endpoints/schemas internos (conhecimento
  obtido por engenharia reversa: headers do reporting, modelo de grafo de workflow,
  filtros de dashboard, gatilhos, canais). Consulte quando for montar algo avançado ou
  quando um endpoint der erro estranho.
