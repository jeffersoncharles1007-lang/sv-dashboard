# SV Dashboard — Arquitetura Multi-Cliente

## Stack
- **Backend:** Next.js API Routes (TypeScript)
- **Database:** PostgreSQL (VPS)
- **AI:** OpenRouter (Claude/Haiku/JEV)
- **Cron:** node-cron (Vercel Cron ou VPS)

## Estrutura

```
sv-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sync/           # Sincroniza GHL → PostgreSQL
│   │   │   ├── agent/         # Agente de IA (classifica conversas)
│   │   │   ├── classify/       # Endpoint para classificar 1 conversa
│   │   │   ├── dashboard/      # Dados do dashboard
│   │   │   └── audit/         # Auditoria 6 passos
│   │   ├── page.tsx           # Dashboard principal
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── ghl.ts             # Cliente GHL API
│   │   ├── db.ts              # PostgreSQL client
│   │   ├── openrouter.ts      # Cliente OpenRouter
│   │   ├── classifier.ts       # Lógica de classificação
│   │   └── auditor.ts          # Lógica de auditoria 6 passos
│   └── types/
│       └── index.ts            # Tipos TypeScript
├── scripts/
│   ├── sync-all.ts             # Script sync completo
│   ├── run-agent.ts           # Script agente diário
│   └── run-audit.ts          # Script auditoria diária
├── supabase/
│   └── migrations/            # Schema do banco
└── package.json
```

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                      GHL (CRM)                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ 1. sync (contacts, opps, convs)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (banco)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │ contacts    │ │ opportunities│ │ conversations        │ │
│  │ (classific) │ │ (stages)    │ │ (messages)          │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   AGENTE IA  │  │   DASHBOARD   │  │   AUDITORIA   │
│ (classifica) │  │ (exibe KPIs)  │  │ (6 passos)    │
└───────────────┘  └───────────────┘  └───────────────┘
```

## Módulos Principais

### 1. Sync (src/app/api/sync/route.ts)
- Busca contacts, opportunities, conversations do GHL
- Salva no PostgreSQL
- Retorna estatísticas de sync

### 2. Agente IA (src/app/api/agent/route.ts)
- Para cada conversa sem classificação:
  - Lê mensagens
  - Classifica via OpenRouter (pergunta/reclamacao/intencao/silencio)
  - Atualiza contact no GHL (customFields + tags)
  - Registra log de classificação

### 3. Auditoria (src/app/api/audit/route.ts)
- Avalia conversas do dia
- Aplica 6 passos da técnica de venda
- Gera relatório

### 4. Dashboard (src/app/api/dashboard/route.ts)
- Lê do PostgreSQL
- Calcula KPIs:
  - Contatos feitos (primeiro contato por dia)
  - Conversas (conversas com mensagem)
  - Interessados (classificação = intenção compra)
  - Orçamentos (opps em estágio negociação)
  - Vendas ganhas/perdidas
  - Conversão por vendedor
  - Tempo médio no pipeline
  - Motivos de perda
  - Pipeline com mais potencial

## KPIs que o Dashboard mostra

| KPI | Fonte | Cálculo |
|-----|-------|---------|
| Contatos Feitos | conversations | COUNT DISTINCT contacts onde firstMessageDate = hoje |
| Conversas | conversations | COUNT conversas com mensagem real |
| Interessados | contacts | COUNT WHERE resultado_ultimo_contato = 'intencao_compra' |
| Orçamentos | opportunities | COUNT WHERE pipelineStage = 'negociação' |
| Vendas Ganhas | opportunities | COUNT WHERE status = 'won' |
| Vendas Perdidas | opportunities | COUNT WHERE status = 'lost' |
| Conversão Vendedor | contacts+opps | GROUP BY assignedTo, COUNT won/lost |
| Tempo Médio Pipeline | opportunities | AVG(updatedAt - createdAt) GROUP BY stage |
| Motivos Perda | contacts | COUNT BY tags LIKE 'perda%' |
| Pipeline Potencial | opportunities | SUM(monetaryValue) WHERE status = 'open' |

## Multi-Cliente (futuro)

```typescript
// Estrutura multi-tenant
interface Client {
  id: string;
  name: string;
  ghl_api_key: string;
  ghl_location_id: string;
  openrouter_key?: string;
  db_schema: string;  // Cada cliente = schema separado
}
```

## Cron Jobs (Vercel ou VPS)

```json
// vercel.json
{
  "crons": [
    { "path": "/api/sync", "schedule": "0 10 * * 1-6" },
    { "path": "/api/agent", "schedule": "0 19 * * 1-5" },
    { "path": "/api/audit", "schedule": "0 20 * * 1-5" }
  ]
}
```

## Prioridade de Implementação

1. **Fase 1:** Sync (trazer dados do GHL)
2. **Fase 2:** Agente IA (classificar conversas)
3. **Fase 3:** Dashboard (mostrar KPIs reais)
4. **Fase 4:** Auditoria (6 passos)
5. **Fase 5:** Multi-cliente
