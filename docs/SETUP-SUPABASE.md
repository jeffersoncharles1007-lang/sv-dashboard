# SV Dashboard - Setup para Supabase

## 1. Criar Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. New Project → Nome: "sv-dashboard"
3. Guarde o **Project ID** (xxxx-xxxx-xxxx-xxxx)
4. Guarde a **Database Password**

## 2. Aplicar o Schema

No Supabase Dashboard:
1. SQL Editor → New Query
2. Cole o conteúdo de `supabase/migrations/001_schema.sql`
3. Run

## 3. Obter Credentials

Em Settings → API:

```
Project ID: xxxx-xxxx-xxxx-xxxx
POSTGRES URL: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

## 4. Configurar Vercel

No projeto Vercel, adicionar environment variables:

```bash
# GHL
GHL_API_KEY=pit_...
GHL_LOCATION_ID=IBE8l3u7AtR6JuNOOagY

# Supabase (Connection Pooler - melhor para Next.js)
POSTGRES_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

## 5. Verificar Conexão

```bash
curl -X POST https://seu-dashboard.vercel.app/api/sync
```

Deve retornar: `{"success": true, "synced": {...}}`

## Estrutura das Tabelas

| Tabela | Descrição |
|--------|-----------|
| contacts | Contatos com campos de IA |
| opportunities | Oportunidades do GHL |
| conversations | Conversas sincronizadas |
| classification_logs | Histórico de classificações |
| sync_logs | Log de sincronizações |

## Campos do Contact (preenchidos pelo Agente)

| Campo | Descrição |
|-------|-----------|
| resultado_ultimo_contato | Classificação |
| data_ultimo_contato | Data última msg |
| lead_prioridade | alta/media/baixa |
| temperatura | quente/morno/frio/parou |
