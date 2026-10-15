# PRD — SV Dashboard v2

## Product Requirements Document

---

### Nome do app e ideia em uma frase

**SV Dashboard** — Painel de gestão comercial que responde as perguntas que o dono da SV Elétrica faz todo dia.

---

### As 7 perguntas que o dashboard responde

| # | Pergunta em português | Onde está | Como mostrar |
|---|---------------------|-----------|--------------|
| 1 | "Vou bater a meta?" | `monetary_value` | Valor em pipeline + % meta |
| 2 | "Tenho volume suficiente?" | Cobertura | Oportunidades abertas × ticket |
| 3 | "Quantos avancei?" | `situacao_comercial` | Gráfico: Em Negociação, Aguardando, etc |
| 4 | "Quantos NÃO avançaram?" | `resultado_ultimo_contato` | Contador: silêncio, reclamação |
| 5 | "Por que perdi?" | Tags motivo perda | Pizza: preço, concorrência, etc |
| 6 | "Quem está mal?" | Tags temperatura + vendedores | Ranking de performance |
| 7 | "Quem preciso acionar?" | `silencio` + `parou responder` | Lista prioritária |

---

### Dados do GHL disponíveis

**Custom Fields (Contacts):**
- `contactsituacao_comercial`: Em Negociação, Aguardando Pagamento, Carteira Ativa, Inativo
- `contactresultado_ultimo_contato`: pergunta, reclamacao, intencao_compra, encerramento, silencio
- `contactlead_prioridade`: alta, media, baixa
- `segmento_do_cliente`: perfil construtora, perfil revenda, etc

**Tags:**
- Temperatura: quente, morno, frio, parou responder
- Estado: em atendimento, aguardando resposta, orcamento enviado, orcamento parado
- Motivo Perda: perda concorrencia, perda preco, perda prazo pagamento, etc
- Vendedor: emily, katherine, eduardo-pereira, crisostomo, angelo

**Opportunities:**
- monetary_value: valor do orçamento
- pipeline_stage_id: estágio atual
- status: open, won, lost

---

### O que a primeira versão mostra

**TOPO - 4 KPIs principais:**
1. Receita em Pipeline (R$)
2. Oportunidades em Andamento
3. Taxa de Conversão (Ganhos / Total)
4. Clientes em Silêncio (precisam ser acionados)

**MEIO - 4 gráficos:**
1. Funil de Situação (Em Negociação → Ganha)
2. Motivos de Perda (pizza)
3. Temperatura da Carteira (quente/morno/frio)
4. Performance por Vendedor

**BASE - Tabelas:**
1. Ranking de Vendedores
2. Clientes que Precisam de AÇÃO (silêncio + parou responder)
3. Detalhamento de Perda

---

### O que fica de fora

- Gráfico histórico (precisa dados de meses anteriores)
- Previsão/Forecast
- Comparativo com meses anteriores

---

### Métricas da Auditoria (salvas diariamente)

A IA de Auditoria já analiza conversas. Vamos salvar estruturado:
- Nota por vendedor (0-6)
- % por passo (acolhimento, sondagem, identificou, CVB, gatilho, encerrou)
- Data da análise
- Tendência (melhorando/piorando)

---

### Como sei que funcionou

- Dashboard carrega em < 3s
- Dados batem com o GHL
- Cliente consegue responder as 7 perguntas em < 30 segundos
