# TRD — SV Dashboard v2

## Technical Requirements Document

---

### Onde roda

- **Web** (Desktop e Mobile)
- URL: Vercel (mesmo projeto)

---

### Dados (GHL → Supabase)

| Tabela | Origem | Campos principais |
|--------|--------|-------------------|
| `contacts` | GHL Custom Fields | situacao_comercial, resultado_ultimo_contato, lead_prioridade, segmento_cliente, tags |
| `opportunities` | GHL | monetary_value, pipeline_stage_id, status |
| `audit_metrics` | IA Auditoria (texto) | nota_vendedor, passos_json, data_analise |

---

### Integrações

| Serviço | Para que |
|--------|---------|
| GHL API | Buscar contacts com Custom Fields + Tags |
| GHL API | Buscar opportunities |
| IA Auditoria | Extrair métricas estruturadas |

---

### Cron/Sync

| O que | Quando | Como |
|-------|--------|------|
| Sync Contacts | A cada 6h | Script Python → Supabase |
| Sync Opportunities | A cada 6h | Script Python → Supabase |
| Parse Auditoria | Diariamente 19h | Extrair métricas do texto |

---

### API Routes

| Endpoint | Retorna |
|----------|---------|
| `GET /api/dashboard` | KPIs principais + gráficos |
| `GET /api/situacao` | Clientes por situação comercial |
| `GET /api/perdas` | Motivos de perda |
| `GET /api/vendedores` | Performance por vendedor |
| `GET /api/silencio` | Clientes em silêncio (ação prioritária) |
| `GET /api/auditoria` | Métricas da auditoria |

---

### Autenticação

- **v1:** Sem autenticação (dashboard público)
- **Futuro:** Login com Google/SSO
