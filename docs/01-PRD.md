# PRD — SV Dashboard

## Product Requirements Document

---

### Nome do app e ideia em uma frase

**SV Dashboard** — Sistema de BI em tempo real para acompanhar pipeline de vendas, performance comercial e KPIs da SV Elétrica.

---

### Pra quem é

- **CEO/Proprietário** — visão executiva do negócio
- **Gerente Comercial** — acompanhamento de metas e conversão
- **Vendedores** — status do próprio pipeline
- **Equipe de Reativação** — leads parados e oportunidades frias

---

### O problema de hoje

Hoje o acompanhamento é feito manualmente:
- Planilhas atualizadas por vendedores
- Informações descentralizadas
- Atraso na tomada de decisão
- Falta de visibilidade em tempo real

---

### O que a primeira versão faz

1. **Dashboard executivo** com KPIs principais (Receita, Conversão, Leads, Ticket)
2. **Funil de pipeline** com estágios (Aguardando → Ganho/Perdido)
3. **Gráficos de evolução** (14 dias, 30 dias)
4. **Performance por vendedor**
5. **Fontes/Origens** das oportunidades
6. **Sincronização automática** com GHL via cron

---

### O que fica de fora da primeira versão

- **IA para análise** (JEV/JEV-like) — segunda fase
- **Alertas automáticos** (WhatsApp/Email)
- **App mobile nativo**
- **Relatórios em PDF exportáveis**
- **Comparativo entre períodos** (mês vs mês)
- **Budget/forecast**

---

### Como eu sei que deu certo

- Dashboard carrega em < 3 segundos
- Dados batem com o GHL em tempo real
- Usuários acessam diariamente
- Zero erros de sincronização por 30 dias

---

### Histórias de uso

| Como | Eu quero | Pra |
|-------|----------|-----|
| CEO | Ver receita total do mês | Saber se vou atingir a meta |
| Gerente | Ver taxa de conversão por vendedor | Identificar quem precisa de apoio |
| Vendedor | Ver meu pipeline | Saber o que priorizar |
| Reativação | Ver leads parados +30 dias | Decidir quem contatar |

---

### Dúvidas em aberto

- [ ] Autenticação? (inicialmente público)
- [ ] Quantos vendedores na base?
- [ ] Existe meta definida por vendedor?
