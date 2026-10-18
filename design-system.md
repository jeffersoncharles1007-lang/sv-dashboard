# Design System - SV ELÉTRICA Dashboard

## Paleta de Cores
```css
:root {
  /* Primária */
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --primary-light: #3b82f6;
  
  /* Status semântico */
  --success: #22c55e;
  --success-light: #86efac;
  --warning: #eab308;
  --warning-light: #fde047;
  --danger: #ef4444;
  --danger-light: #fca5a5;
  
  /* Neutros */
  --bg-dark: #0f172a;
  --bg-card: #1e293b;
  --bg-card-hover: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border: #334155;
  
  /* Acentos */
  --accent-blue: #0ea5e9;
  --accent-purple: #a855f7;
  --accent-orange: #f97316;
}
```

## Tipografia
- **H1:** Inter Bold 28px
- **H2:** Inter Semibold 22px
- **H3:** Inter Medium 18px
- **Body:** Inter Regular 14px
- **Caption:** Inter Regular 12px
- **Numbers:** Tabular figures para alinhamento

## Componentes

### KPI Card
```
┌─────────────────────────────────────┐
│ Título                    ▲ +12.5% │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ R$ 1.2M                         │
│ vs Meta: R$ 1.5M                │
└─────────────────────────────────────┘
```

### Tabela
```
│ Coluna 1  │ Coluna 2  │ Coluna 3 │
│───────────│───────────│───────────│
│ Valor     │ ▲ +5%    │ ████████░│
│ Valor     │ ▼ -2%    │ ██████░░░│
```

## Layout
- Sidebar: 240px
- Canvas: 1920×1080 (sem scroll horizontal)
- Grid: 12 colunas
- Gaps: 16px entre cards

## Regras de Negócio
- Verde: ≥70% da meta
- Amarelo: 40-69%
- Vermelho: <40%
- Sempre mostrar: atual vs meta ou período anterior
