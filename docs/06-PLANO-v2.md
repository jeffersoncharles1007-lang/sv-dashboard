# Plano — SV Dashboard v2

---

## Etapa 1: Schema

- [ ] Criar/atualizar tabela `contacts` com Custom Fields
- [ ] Criar tabela `audit_metrics`
- [ ] Configurar RLS

---

## Etapa 2: Sync

- [ ] Script sync contacts + custom fields + tags
- [ ] Script sync opportunities
- [ ] Script parse auditoria (extrair métricas)

---

## Etapa 3: API

- [ ] `GET /api/dashboard` - KPIs principais
- [ ] `GET /api/situacao` - Por situação comercial
- [ ] `GET /api/perdas` - Motivos de perda
- [ ] `GET /api/vendedores` - Performance
- [ ] `GET /api/silencio` - Clientes em silêncio

---

## Etapa 4: Dashboard UI

- [ ] Layout: 4 KPIs + 4 gráficos + 3 tabelas
- [ ] Filtros: período, vendedor, segmento
- [ ] Design em português
- [ ] Estados: loading, error, empty

---

## Etapa 5: Deploy

- [ ] Git push
- [ ] Vercel deploy
- [ ] Teste em produção

---

## Prioridade

1. Sync com Custom Fields (dados)
2. API com KPIs corretos
3. UI simples mas funcional
4. Deploy
