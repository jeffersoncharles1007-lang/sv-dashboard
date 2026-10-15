# Fluxo — SV Dashboard

## User Flows e Telas

---

### Como a pessoa chega no app

- Link direto ( bookmark ou email)
- QR Code na parede do escritório

---

### Lista de telas

| Tela | Pra que serve |
|------|---------------|
| Dashboard | Visão geral com KPIs e gráficos |
| Filtros | Período, Região, Vendedor |

---

### Caminho principal

```
Dashboard (carrega) 
  → Vê KPIs (Receita, Conversão, Leads)
  → Vê Funil (pipeline)
  → Vê Gráficos (tendências)
  → Filtra por período (Opcional)
```

---

### Fluxo de dados

```
GHL (origem)
    ↓ cron 6h
Supabase (cache)
    ↓ leitura
Dashboard (exibe)
```

---

### Estados da tela

| Estado | O que aparece |
|--------|--------------|
| Carregando | Skeleton loaders |
| Com dados | Dashboard completo |
| Sem dados | "Nenhuma oportunidade encontrada" |
| Erro | "Erro ao carregar. Tente novamente." |

---

### Primeiro acesso

- Carrega dashboard com dados do mês atual
- Sem necessidade de login
- Filtros em "Este Mês" por padrão
