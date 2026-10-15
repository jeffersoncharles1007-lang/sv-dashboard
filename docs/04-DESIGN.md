# Briefing de Design — SV Dashboard

## Design System

---

### Pra quem e 3 palavras que descrevem o visual

**Público:** Gestores e vendedores (B2B)
**Visual:** Profissional, limpo, data-driven

---

### Apps de referência

| App | O que copiar | O que evitar |
|-----|-------------|-------------|
| Stripe Dashboard | Clareza de dados | Complexidade |
| Notion | Layout limpo | Cores saturadas |
| Linear | Performance percebida | Funcionalidade densa |

---

### Cores com código

| Elemento | Cor | Hex |
|----------|-----|-----|
| Primária | Azul corporativo | `#2563EB` |
| Fundo | Cinza claro | `#F8FAFC` |
| Cards | Branco | `#FFFFFF` |
| Texto principal | Cinza escuro | `#1E293B` |
| Texto secundário | Cinza médio | `#64748B` |
| Sucesso | Verde | `#16A34A` |
| Erro | Vermelho | `#DC2626` |
| Alerta | Amarelo | `#D97706` |

**Cores de status (pipeline):**
| Status | Cor |
|--------|-----|
| Aguardando | `#94A3B8` (cinza) |
| Em Atendimento | `#3B82F6` (azul) |
| Em Negociação | `#F59E0B` (amarelo) |
| Ganho | `#22C55E` (verde) |
| Perdido | `#EF4444` (vermelho) |

---

### Tipografia

| Elemento | Fonte | Tamanho |
|----------|-------|---------|
| Títulos | Inter Bold | 24px |
| Subtítulos | Inter Semibold | 18px |
| Corpo | Inter Regular | 14px |
| Labels | Inter Medium | 12px |
| Números | Inter (tabular) | 32px (KPIs) |

---

### Componentes

| Componente | Especificação |
|------------|--------------|
| Cards | Fundo branco, border 1px `#E2E8F0`, radius 8px |
| Botões primários | Fundo azul `#2563EB`, texto branco, radius 6px |
| Botões secundários | Fundo transparente, border azul, radius 6px |
| Inputs | Border `#CBD5E1`, focus ring azul |
| Tabelas | Header cinza `#F1F5F9`, linhas alternadas |

---

### Espaçamento

- Grid: 12 colunas
- Gap entre cards: 16px
- Padding interno cards: 24px
- Cantos: arredondados (8px cards, 6px botões)

---

### Acessibilidade

- Contraste mínimo: 4.5:1
- Áreas clicáveis: mínimo 44px
- Focus visible em todos os elementos interativos

---

### Estados

| Estado | Como mostrar |
|--------|--------------|
| Carregando | Skeleton com shimmer |
| Sucesso | Toast "Dados atualizados" |
| Erro | Toast vermelho + retry |
| Vazio | Ilustração + mensagem |
| Offline | Banner amarelo "Sem conexão" |
