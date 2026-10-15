# Fluxo — SV Dashboard v2

---

### Como chega no dashboard

- Link direto ou bookmark
- QR Code na parede do escritório

---

### Telas

| Tela | Conteúdo |
|------|----------|
| **Dashboard** | 4 KPIs + 4 gráficos + 3 tabelas |
| **Filtros** | Período, Vendedor, Segmento |

---

### Fluxo principal

```
Dashboard carrega
    ↓
Mostra KPIs principais (Receita, Oportunidades, Conversão, Silêncio)
    ↓
Mostra gráficos (Funil, Perdas, Temperatura, Vendedores)
    ↓
Mostra tabelas (Ranking, Ação Prioritária, Perdas)
```

---

### Estados

| Estado | O que aparece |
|--------|--------------|
| Carregando | Skeleton |
| Com dados | Dashboard completo |
| Sem dados | "Sincronize os dados" |
| Erro | "Tente novamente" |
