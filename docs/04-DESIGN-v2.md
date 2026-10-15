# Briefing de Design — SV Dashboard v2

---

### Visual: Profissional, claro, em português

**Público:** Dono de distribuidora de material elétrico
**Tom:** Direto, sem enrolação, números grandes

---

### Cores

| Elemento | Cor | Hex |
|----------|-----|-----|
| Fundo | Cinza claro | `#F8FAFC` |
| Cards | Branco | `#FFFFFF` |
| Positivo | Verde | `#16A34A` |
| Negativo | Vermelho | `#DC2626` |
| Atenção | Amarelo | `#D97706` |
| Texto principal | Cinza escuro | `#1E293B` |

---

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  📊 SV DASHBOARD                    [Sincronizar]         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │Receita  │ │Oportunid│ │Conversao│ │Silêncio │         │
│  │ R$ XX   │ │   XX    │ │   XX%   │ │   XX    │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐                │
│  │ Funil Situação   │  │ Por que Perdeu? │                │
│  │ [barras]         │  │ [pizza]          │                │
│  └───────────────────┘  └───────────────────┘                │
│  ┌───────────────────┐  ┌───────────────────┐                │
│  │ Temperatura      │  │ Vendedores       │                │
│  │ 🔥❄️🌡️            │  │ [ranking]        │                │
│  └───────────────────┘  └───────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ PRECISAM DE AÇÃO                                       │
│  [Lista de clientes em silêncio]                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Tipografia

| Elemento | Fonte | Tamanho |
|----------|-------|---------|
| Título KPI | Inter Bold | 32px |
| Label | Inter Medium | 12px |
| Texto | Inter Regular | 14px |

---

### Estados

| Estado | Visual |
|--------|--------|
| Carregando | Skeleton com animação |
| Sucesso | Toast verde "Dados atualizados" |
| Erro | Toast vermelho + retry |
| Vazio | "Sem dados" + ícone |
