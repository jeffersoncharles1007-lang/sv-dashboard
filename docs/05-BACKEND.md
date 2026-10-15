# Esquema do Back-end — SV Dashboard

## Database Schema

---

### O que o app guarda

| Dado | Onde | Tabela |
|------|------|--------|
| Oportunidades | GHL (origem) | - |
| Cache de opps | Supabase | `opportunities_cache` |
| Logs de sync | Supabase | `sync_logs` |
| Métricas calculadas | Supabase | `metrics_daily` |

---

### Tabelas (Supabase)

```sql
-- Cache de oportunidades do GHL
CREATE TABLE opportunities_cache (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE,
  name TEXT,
  status TEXT,
  stage_id TEXT,
  pipeline_id TEXT,
  contact_id TEXT,
  owner_id TEXT,
  value NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de sincronização
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type TEXT, -- 'full', 'incremental'
  records_synced INT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  status TEXT, -- 'success', 'error'
  error_message TEXT
);

-- Métricas diarias calculadas
CREATE TABLE metrics_daily (
  date DATE PRIMARY KEY,
  total_opportunities INT,
  total_value NUMERIC,
  won_count INT,
  lost_count INT,
  conversion_rate NUMERIC,
  avg_cycle_time NUMERIC
);
```

---

### Ligações

```
opportunities_cache (many) → contacts (GHL)
opportunities_cache (many) → users/owners (GHL)
metrics_daily (1) → sync_logs (many)
```

---

### Quem é cada dado

| Dado | Dono |
|------|------|
| Opportunities | GHL (read-only cache) |
| Sync logs | Sistema |
| Métricas | Sistema |

---

### Login

| Campo | Tipo |
|-------|------|
| Cadastro | N/A (v1 pública) |
| Entrar | N/A |
| Recuperar senha | N/A |

---

### RLS (Row Level Security)

```sql
-- Policies para leitura pública (v1)
ALTER TABLE opportunities_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON opportunities_cache FOR SELECT USING (true);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON sync_logs FOR SELECT USING (true);
```

---

### O que se apaga e quando

| Dado | Quando |
|-------|---------|
| Cache antigo | A cada sync (upsert) |
| Logs > 90 dias | Cron semanal |
| Métricas > 1 ano | Cron mensal |
