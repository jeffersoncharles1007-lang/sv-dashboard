# SV Elétrica Dashboard

Dashboard de métricas para SV Elétrica integrado com GoHighLevel (CRM) via API REST.

## Stack

- **Frontend**: Next.js 15 + React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Gráficos**: Recharts
- **Backend**: Next.js API Routes
- **Banco de Dados**: Supabase (PostgreSQL)
- **Testes**: Playwright

## Configuração

### 1. Variáveis de Ambiente

Criar `.env.local` com as credenciais:

```env
# GHL API
GHL_API_KEY=pit-...
GHL_LOCATION_ID=IBE8l3u7AtR6JuNOOagY

# Pipeline IDs
PIPELINE_ORCAMENTOS=ihc0DHSDb8kcRJU3kWk8
PIPELINE_CARTEIRA=x5xVu9xKc1eZxVkra6M7
PIPELINE_INATIVOS=22IBbwWcepqRSz6ZBKqM
PIPELINE_PROSPECCAO=qpbN1f6IZqWaF8gQeS7E

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 2. Setup Supabase

1. Criar projeto em https://supabase.com
2. Executar `supabase/migrations/001_schema.sql` no SQL Editor
3. Copiar as credenciais para `.env.local`

### 3. Instalar Dependências

```bash
npm install
```

### 4. Rodar Localmente

```bash
npm run dev
```

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard` | Retorna métricas calculadas |
| POST | `/api/sync` | Sincroniza dados do GHL → Supabase |

## Funcionalidades

### KPIs
- Contatos criados hoje
- Conversas do dia
- Interessados (em negociação)
- Orçamentos criados
- Fechamentos (ganhos)
- Perdidos

### Abas
- **Visão CEO**: Overview + gráficos de pipeline
- **Visão Gerente**: Funil completo + tabela vendedores
- **Visão Vendedor**: Performance individual

### Gráficos
- Funil de vendas (pipeline Orçamentos)
- Distribuição por pipeline
- Origem dos leads (por pipeline)
- Performance por vendedor

## Deploy Vercel

```bash
npm install -g vercel
vercel
```

## Testes

```bash
# Rodar testes E2E
npx playwright test

# Abrir UI de testes
npx playwright test --ui
```

## Estrutura do Projeto

```
dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dashboard/route.ts  # GET métricas
│   │   │   └── sync/route.ts       # POST sincronização
│   │   └── page.tsx                # Dashboard principal
│   ├── components/
│   │   ├── charts.tsx              # Componentes de gráfico
│   │   ├── funnel-table.tsx         # Tabela de funil
│   │   ├── kpi-card.tsx            # Cards de KPI
│   │   └── vendor-table.tsx        # Tabela de vendedores
│   └── lib/
│       ├── constants.ts             # IDs e configurações
│       ├── ghl.ts                   # Integração GHL API
│       ├── metrics.ts               # Cálculos de métricas
│       └── supabase.ts              # Cliente Supabase
├── supabase/
│   └── migrations/
│       └── 001_schema.sql           # Schema do banco
├── tests/
│   └── dashboard.spec.ts            # Testes E2E
├── .env.local                      # Variáveis locais
└── package.json
```

## Cron Job (Opcional)

Para sincronização automática, configurar no Vercel:

```bash
vercel env add CRON_SECRET
# Adicionar no vercel.json:
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "0 */6 * * *"
  }]
}
```
