# Plano de Implementação — SV Dashboard

## Roadmap em Etapas

---

### Etapa 1: Setup e Deploy

**O que entra:**
- [x] Repositório GitHub criado
- [x] Projeto Next.js configurado
- [x] Deploy na Vercel funcionando
- [ ] Dominio customizado (futuro)

**O que sai:**
- App no ar com URL pública

**Como testar:**
- `vercel deploy --prod`
- Acessar URL e ver página em branco

---

### Etapa 2: API e Dados

**O que entra:**
- [ ] API route `/api/dashboard`
- [ ] Conexão com GHL (oportunidades)
- [ ] Cache no Supabase
- [ ] Script de sync cron

**O que sai:**
- Endpoint que retorna KPIs do período

**Como testar:**
- `curl /api/dashboard` retorna JSON com dados

---

### Etapa 3: Dashboard UI

**O que entra:**
- [ ] Layout base (header, grid)
- [ ] Cards de KPI (5 métricas)
- [ ] Gráfico de Funil
- [ ] Gráfico de Evolução
- [ ] Gráfico de Fontes
- [ ] Tabela de Vendedores

**O que sai:**
- Dashboard funcional com dados mockados

**Como testar:**
- Visualizar todos os componentes
- Trocar filtros
- Responsivo mobile

---

### Etapa 4: Integração Real

**O que entra:**
- [ ] API route busca do Supabase
- [ ] Script sync popula cache
- [ ] Dados reais no dashboard

**O que sai:**
- Dashboard com dados da SV Elétrica

**Como testar:**
- Dados batem com GHL
- Sync roda sem erro

---

### Etapa 5: Polish e Performance

**O que entra:**
- [ ] Loading states (skeletons)
- [ ] Error states (toasts)
- [ ] Empty states
- [ ] Otimização de carregamento
- [ ] Cache de assets

**O que sai:**
- App pronto para produção

**Como testar:**
- Lighthouse > 90
- Zero console errors
- Todos estados funcionando

---

### Etapa 6: Monitoramento

**O que entra:**
- [ ] Logs de erro (Sentry)
- [ ] Analytics (Vercel Analytics)
- [ ] Uptime monitor

**O que sai:**
- App observável em produção

**Como testar:**
- Simular erro e ver notificação
- Ver pageviews no analytics

---

## Ordem de execução

```
1 → 2 → 3 → 4 → 5 → 6
```

**Regra:** Testar cada etapa ANTES de seguir para a próxima.

---

## Status atual

| Etapa | Status |
|-------|--------|
| 1 - Setup | ✅ Concluído |
| 2 - API | 🔄 Em progresso |
| 3 - UI | ✅ Implementada (mock) |
| 4 - Integração | ⏳ Pendente |
| 5 - Polish | ⏳ Pendente |
| 6 - Monitoramento | ⏳ Pendente |

---

## Prioridades técnicas

1. **Performance** — dashboard carrega em < 3s
2. **Confiabilidade** — sync sem perder dados
3. **Manutenibilidade** — código legível
4. **Escalabilidade** — fácil adicionar métricas
