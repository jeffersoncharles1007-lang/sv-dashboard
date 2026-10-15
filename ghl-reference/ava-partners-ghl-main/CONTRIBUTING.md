# Contribuindo

Obrigado por querer ajudar! Este é um projeto educacional do **AVA Partners Program**.

## Antes de tudo
- Leia o [SECURITY.md](SECURITY.md). **Nunca** cole tokens, `token-id`, refresh tokens
  ou IDs de conta reais em issues, PRs, prints ou commits.
- Confirme que o `.env` está fora do commit (`git status`).

## Como contribuir
1. Abra uma **issue** descrevendo o bug/ideia antes de um PR grande.
2. Faça um fork, crie uma branch (`feat/minha-ideia`).
3. Mantenha o estilo do código (Python: stdlib, sem dependências pesadas; comentários em PT-BR).
4. Teste na **sua própria** subconta de teste — nunca em conta de cliente.
5. Abra o PR explicando o que mudou e como testou.

## O que é bem-vindo
- Novos nós de workflow (`engine/wf_nodes.py`) e gatilhos (`engine/wf_deploy.py`).
- Novos tipos de widget/dashboard (`engine/ghl_dashboard.py`).
- Exemplos em `examples/` e specs em `specs/`.
- Melhorias de documentação e segurança.

## O que evitar
- Qualquer coisa que incentive uso na conta de terceiros/cliente.
- Recursos que dependam de dados sensíveis versionados.

## Código de conduta
Seja gentil e respeitoso. Assédio não é tolerado.
