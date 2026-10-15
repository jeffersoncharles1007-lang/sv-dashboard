# SV Dashboard — Briefing de Projeto

## 1. INFORMAÇÕES DO PROJETO

**Objetivo:** Dashboard executivo SV Elétrica — pipeline, oportunidades, conversão e performance comercial.

**Público:** Gestores comerciais, equipe de vendas, proprietários.

**Modalidade:** Analítico (histórico) + Operacional (pipeline).

**Stack:** Next.js 16 + React + TypeScript + Tailwind CSS + Shadcn UI + Recharts.

**Dados:**
- GHL Location ID: `IBE8l3u7AtR6JuNOOagY`
- Pipeline Orçamentos ID: `ihc0DHSDb8kcRJU3kWk8`
- Stages: Aguardando, Atendimento, Negociação, Ganho, Perdido
- Cache: Supabase

---

## 2. DIRETRIZES DE DESIGN

### Hierarquia (Pirâmide Invertida)
1. KPIs principais (topo)
2. Gráficos analíticos (meio)
3. Tabelas detalhadas (base)

### KPIs
1. Receita Total (ganhos)
2. % Conversão (ganho/perda)
3. Novos Leads
4. Ticket Médio
5. Tempo Médio no Pipeline

### Gráficos
- Funil de pipeline
- Evolução de oportunidades
- Distribuição por source
- Performance por vendedor

---

## 3. ESTRUTURA

```
src/
├── app/page.tsx          # Dashboard
├── app/api/dashboard/   # API
├── components/           # UI
└── lib/                 # GHL + Supabase
```

---

## 4. ENV VARS (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://nbaztyaazzdmbqulxmaw.supabase.co
SUPABASE_ANON_KEY=<chave>
GHL_API_KEY=<pit-...>
GHL_LOCATION_ID=IBE8l3u7AtR6JuNOOagY
PIPELINE_ORCAMENTOS=ihc0DHSDb8kcRJU3kWk8
STAGE_AGUARDANDO=014ca794-95b8-407f-8510-78604bb94918
STAGE_ATENDIMENTO=c2503848-5cb1-41b7-abea-8e6ca33538ef
STAGE_NEGOCIACAO=8321615c-2a8a-4636-b6a3-599aad08c1a9
STAGE_GANHO=da5ddb01-81cf-45aa-b2de-0a01aca75ee9
STAGE_PERDIDO=984aebec-ca6c-4023-b6a4-d676c813b685
```

---

## 5. REGRAS

- Código limpo, tipado
- Responsivo (mobile + desktop)
- Acessível (WCAG AA)
- Performance < 3s
- Deploy via GitHub → Vercel
