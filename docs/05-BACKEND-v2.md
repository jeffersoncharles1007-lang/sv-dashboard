# Back-end — SV Dashboard v2

---

### Tabelas Supabase

```sql
-- Contacts com Custom Fields
contacts (
  id TEXT,
  ghl_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  situacao_comercial TEXT,        -- custom field
  resultado_ultimo_contato TEXT,  -- custom field
  lead_prioridade TEXT,           -- custom field
  segmento_cliente TEXT,          -- custom field
  tags TEXT[],                   -- array de tags
  last_synced_at TIMESTAMPTZ
)

-- Oportunidades
opportunities (
  id TEXT,
  ghl_id TEXT,
  name TEXT,
  monetary_value NUMERIC,
  pipeline_stage_id TEXT,
  status TEXT,  -- open, won, lost
  contact_id TEXT,
  last_synced_at TIMESTAMPTZ
)

-- Métricas da Auditoria (extraídas do texto)
audit_metrics (
  id SERIAL PRIMARY KEY,
  data_analise DATE,
  vendedor TEXT,
  nota_total NUMERIC,      -- 0-6
  acolhimento NUMERIC,     -- %
  sondagem NUMERIC,        -- %
  identificou NUMERIC,      -- %
  cvb NUMERIC,             -- %
  gatilho NUMERIC,         -- %
  encerrou NUMERIC         -- %
)
```

---

### RLS

- Leitura pública para dashboard
- Escrita via service role (scripts de sync)

---

### Sync Scripts

1. `sync_contacts.py` - Busca contacts + custom fields + tags
2. `sync_opportunities.py` - Busca opportunities
3. `parse_auditoria.py` - Extrai métricas do texto da IA
