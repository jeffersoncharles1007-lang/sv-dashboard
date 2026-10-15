<div align="center">
  <img src="extension/assets/logo.png" alt="AVA Partners Program" width="260" />

  <h1>Claude Code + GoHighLevel</h1>
  <p><b>Você escreve o que quer em português. O Claude Code constrói no seu GHL — sozinho.</b></p>
  <p>Automação, pipelines, campos, calendários e <b>dashboards</b> criados via API, a partir de um documento.</p>
</div>

---

> ⚠️ **Leia o [SECURITY.md](SECURITY.md) antes de começar.** Este projeto mexe em contas
> reais de GoHighLevel e parte dele usa uma **API não-oficial**. Use **só na sua própria conta**.

### ⚖️ Aviso legal
- **Não afiliado.** Este projeto **não** é afiliado, associado, autorizado nem endossado
  pela HighLevel, Inc. "GoHighLevel" e "HighLevel" são marcas da HighLevel, Inc.
- **API interna = não-oficial.** A parte de workflows/dashboards usa endpoints internos
  obtidos por **engenharia reversa**, sem SLA, que podem mudar/quebrar a qualquer momento
  e cujo uso **pode violar os Termos de Serviço do GoHighLevel**.
- **Por sua conta e risco**, apenas na **sua própria conta**. Sem garantias (ver [LICENSE](LICENSE)).

## 🎯 O que é isto

Um "starter kit" que transforma o **Claude Code** no seu dev de GoHighLevel. Em vez de
clicar mil vezes na tela, você:

1. Escreve um **documento** (`specs/`) dizendo o que quer.
2. Pede: *"implementa o `specs/meu-funil.md`"*.
3. O Claude lê, faz um plano, **confirma com você** e constrói no GHL.

Ele fala **duas línguas** com o GHL:

| | Faz | API |
|---|---|---|
| ✅ **Oficial** (token `pit-`) | contatos, pipelines, campos, calendários | suportada |
| ⚠️ **Interna** (token Firebase) | workflows, dashboards, pastas | não-oficial |

## 🚀 Começar (setup único)

### 1. Pré-requisitos
- [Claude Code](https://claude.com/claude-code) instalado.
- Python 3.9+ (o "motor" só usa biblioteca padrão — sem instalar nada).
- Uma conta GoHighLevel de agência (**a sua**).

### 2. Pegar as credenciais
- **Token oficial (`pit-`):** GHL → *Settings → Private Integrations → Create New
  Integration* → marque os escopos → copie o `pit-...` e o **Location ID**.
- **Token do Firebase (avançado):** instale a **extensão** em [`extension/`](extension/)
  (passo a passo no README de lá) e clique em **Copiar refresh token**.

### 3. Configurar
```bash
cp .env.example .env      # e preencha com seus tokens (o .env NÃO vai pro git)
```

### 4. Conectar o Claude Code (MCP oficial)
```bash
claude mcp add --transport http gohighlevel \
  "https://services.leadconnectorhq.com/mcp/" \
  -H "Authorization: Bearer SEU_PIT_TOKEN" \
  -H "locationId: SEU_LOCATION_ID"
```
Dentro do Claude Code, rode `/mcp` — deve aparecer **gohighlevel** conectado.

### 5. Construir a partir de um documento
```
implementa o specs/exemplo-funil-boas-vindas.md
```
O Claude vai te mostrar um plano e **pedir aprovação** antes de qualquer escrita.

## 🗂️ Estrutura

```
ava-partners-ghl/
├── CLAUDE.md          # regras que o Claude segue toda sessão (o "cérebro")
├── .claude/skills/    # 🧩 skill "ghl-autopilot" — ensina o Claude a fazer tudo sozinho
├── specs/             # seus documentos de implementação (+ template e exemplo)
├── engine/            # o motor: estrutura, workflows e dashboards via API (Python, stdlib)
├── examples/          # scripts de exemplo usando o motor
├── extension/         # extensão Chrome que pega o token do Firebase (com a logo AVA)
├── docs/              # guia de como pegar o token do Firebase
├── .env.example       # modelo de credenciais (copie para .env)
└── SECURITY.md        # leitura obrigatória
```

> 🧩 **A skill `ghl-autopilot` já vem pronta no repo.** Ao abrir o Claude Code aqui, ela
> ensina o Claude a conectar e implementar sozinho — é só pedir "implementa o `specs/…`".

## 🧠 Como o motor funciona (rápido)
- `engine/wf_nodes.py` — uma **DSL**: você monta uma lista de passos (sms, wait,
  if/else com ramos reais, find/create/update opportunity, tags…) e um compilador
  vira o grafo que o GHL entende.
- `engine/wf_deploy.py` — cria pasta + workflow + gatilho e sobe tudo (modo avançado).
- `engine/ghl_structure.py` — pipelines, custom fields, custom values, calendários.
- `engine/ghl_dashboard.py` — dashboards ("Painel de controle"): seções + cards de KPI.
- `engine/ghl_internal_client.py` — autenticação Firebase (renova o token sozinho).

Veja [`engine/README.md`](engine/README.md) e exemplos rodáveis em [`examples/`](examples/)
(`funil_boas_vindas.py` e `dashboard_kpis.py`).

## 🔒 Segurança (resumo)
- O `.env` **nunca** vai pro git. O token do Firebase é o seu login inteiro.
- Workflows sempre em **rascunho**; nada de **mensagem em massa** sem aprovar.
- API interna = **não-oficial**, sem SLA. Use só na **sua** conta. Detalhes: [SECURITY.md](SECURITY.md).

---

<div align="center">

## 🚀 Aprenda a fazer do zero

Este repositório é o **starter**. O **AVA Partners Program** é o meu treinamento de
automação de GoHighLevel com IA, onde eu ensino passo a passo a construir tudo isso.

**👉 Link na descrição / no comentário fixado.**

<sub>Feito por Junior Braga · AVA Partners Program · Não afiliado à HighLevel, Inc.</sub>

</div>
