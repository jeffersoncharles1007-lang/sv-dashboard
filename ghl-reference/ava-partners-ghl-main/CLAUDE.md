# Projeto: Claude Code + GoHighLevel (AVA Partners)

Este projeto conecta o **Claude Code** ao **GoHighLevel (GHL)** com um fluxo
**guiado por documento**: o usuário escreve um documento de implementação em
`specs/`, e você (Claude Code) implementa seguindo o documento.

## Como você deve trabalhar

Quando o usuário apontar para um documento em `specs/` (ex.: "implementa o
`specs/funil-boas-vindas.md`"):

1. **Leia o documento inteiro** antes de agir.
2. **Confira o contexto da conta** (pipelines, calendários, tags, custom fields
   reais). Se não souber, **puxe do GHL primeiro** (somente leitura) e confirme.
3. **Faça um plano curto** e mostre **antes** de executar qualquer escrita.
4. **Implemente passo a passo**, seguindo a ordem do documento.
5. **Valide** contra os "Critérios de aceite" e diga o que ficou pronto e o que faltou.

Se o documento estiver ambíguo, **pergunte** em vez de adivinhar.

## Conexão com o GHL

- **API oficial (MCP `gohighlevel`):** ferramentas `mcp__gohighlevel__*` para ler e
  escrever (contatos, conversas, oportunidades, calendários, campos). Se `/mcp` não
  listar `gohighlevel`, avise o usuário (ver `README.md`, passo 4).
- **API interna (motor em `engine/`):** para workflows, dashboards e pastas, que a
  API oficial não cobre. Usa o token do Firebase (`.env`). **É NÃO-OFICIAL.**

## Regras de segurança (IMPORTANTE)

O GHL é uma **conta real de produção**. Toda escrita é uma ação de verdade.

- **Confirme antes de qualquer escrita** (criar/atualizar/deletar contato, mover
  oportunidade, enviar mensagem, criar post/template). Mostre exatamente o que vai
  fazer e em quais registros.
- **Nunca envie mensagens/e-mails em massa** sem aprovação explícita do texto e da lista.
- **Crie workflows sempre em rascunho (`draft`)**; peça revisão antes de ativar.
- Em dúvida sobre destruir/sobrescrever dados, **pare e pergunte**.
- Prefira **começar em modo leitura** para mapear a conta antes de escrever.
- **Nunca imprima nem versione o token** (é o login inteiro da conta). Ver `SECURITY.md`.

## Lado código (apps/scripts que usam a API do GHL)

- Credenciais ficam em `.env` (nunca commitadas). Modelo em `.env.example`.
- API oficial: base `https://services.leadconnectorhq.com`, header
  `Authorization: Bearer <GHL_PIT_TOKEN>` e `Version: 2021-07-28`.
- Reaproveite o **motor** em `engine/` (DSL de workflow, deploy, estrutura).
- Escreva testes quando fizer sentido e diga como rodar.
