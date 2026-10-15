# TRD — SV Dashboard

## Technical Requirements Document

---

### Onde roda

- **Web** (Desktop e Mobile)
- URL: `https://dashboard-*.vercel.app`

---

### Banco de dados

| Dados | Onde | Acesso |
|-------|------|--------|
| Oportunidades | GHL (CRM) | API REST |
| Cache local | Supabase | Anon key (leitura) |
| Sync logs | Supabase | Service role |

**Supabase Project:** `nbaztyaazzdmbqulxmaw.supabase.co`

---

### Login

**Primeira versão:** Sem autenticação (dashboard público)

**Futuras versões:**
- Google Workspace ( SSO)
- Cargos: Admin, Gerente, Vendedor

---

### Hospedagem

**Frontend:** Vercel (Hobby)
- Deploy automático via GitHub
- CDN global
- SSL automático

---

### Integrações

| Serviço | Pra que serve | Quem guarda a chave |
|---------|--------------|---------------------|
| GHL | Oportunidades, Contacts | Vercel ENV |
| Supabase | Cache, Logs | Vercel ENV |
| API SV (ERP) | Dados fiscais, NF | Futura |

---

### Dados sensíveis

- [ ] CNPJ de clientes (anonimizar?)
- [ ] Valores de propostas (não expor publicamente)
- [ ] Emails de clientes

**Decisão:** Primeira versão sem autenticação = dados visíveis para quem tem o link.

---

### Escolhas e porquês

| Escolha | Motivo | Descartado |
|---------|--------|-----------|
| Next.js | SSR, API routes | React SPA |
| Vercel | Deploy zero config | Railway, Render |
| Sem Auth v1 | Simplicidade | Clerk, NextAuth |
| Supabase cache | Leitura rápida | GHL direto |
| shadcn/ui | Componentes acessíveis | Chakra, MUI |
