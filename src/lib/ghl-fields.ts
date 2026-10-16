// Custom Fields do GHL - SV Elétrica

// ============================================
// CONTACTS (Custom Fields)
// ============================================
export const CONTACT_CUSTOM_FIELDS = {
  RESULTADO_ULTIMO_CONTATO: 'Kc4ENLzVzFPLEPfouWBp',  // resultado da classificação
  LEAD_PRIORIDADE: 'viaIw2ZnxFhTimCocmyL',             // alta/media/baixa
  SEGMENTO_CLIENTE: 'jYnC5s730WJdWlKCBp7o',          // segmento
  SITUACAO_COMERCIAL: 'xkTH0u3d6OujXX9JnIbV',        // situação comercial
  // Adicionar mais conforme identificados
};

// ============================================
// OPPORTUNITIES (Custom Fields)
// ============================================
export const OPPORTUNITY_CUSTOM_FIELDS = {
  VENDEDOR_RESPONSAVEL: '0HUwIKTy9aeoqW6xVyjH',    // nome do vendedor
  DATA: 'T509ROKnt2K9zr5YFF0M',                    // data
  NUMERO_ORCAMENTO: 'h6cWuMpOa0ZtTAthwpZJ',        // número do orçamento
  DESCONTO: 'K0imTUt36nEJqHNhPqD8',                // desconto em %
  PRAZO_ENTREGA: 'bPxoUsWdqDvs6PLW0jLM',           // prazo entrega
  LOJA: 'g0yIxvhGtwU3ADYVudDM',                    // SV/Bonfim/Mozart
  QUANTIDADE_ITENS: 'h12Mr36aCIL2P2I7LSAq',        // qtd itens
  VALOR_ORIGINAL: 'neGaWo0AC3LheMRq8hJI',         // valor original
  VALOR_FINAL: 'w8dKSanw278kR62E4m2t',            // valor final
};

// ============================================
// TAGS DE TEMPERATURA
// ============================================
export const TEMPERATURE_TAGS = {
  QUENTE: 'qfLbiw7S900MmqmmsLJX',
  MORNO: 'aCI120fxP59pepdClL9s',
  FRIO: '5DvqBjxDfTQi6m8dNM4w',
};

// ============================================
// PIPELINES
// ============================================
export const PIPELINES = {
  ORCAMENTOS: 'ihc0DHSDb8kcRJU3kWk8',
  CARTEIRA: 'x5xVu9xKc1eZxVkra6M7',
  PROSPECCAO: 'qpbN1f6IZqWaF8gQeS7E',
  INATIVOS: '22IBbwWcepqRSz6ZBKqM',
};

export const PIPELINE_NAMES: Record<string, string> = {
  'ihc0DHSDb8kcRJU3kWk8': 'Orçamentos em Aberto',
  'x5xVu9xKc1eZxVkra6M7': 'Carteira / Cliente Ativo',
  'qpbN1f6IZqWaF8gQeS7E': 'Prospecção Ativa',
  '22IBbwWcepqRSz6ZBKqM': 'Inativos',
};

// ============================================
// ESTÁGIOS DO PIPELINE
// ============================================
export const STAGES = {
  // Pipeline de Orçamentos
  AGUARDANDO: '014ca794-95b8-407f-8510-78604bb94918',
  EM_NEGOCIACAO: 'a0c6b9d3-5e8f-4a7c-b2d1-8f3e9c0a4b5d',
  GANHO: 'd7e8f9a0-b1c2-d3e4-f5a6-b7c8d9e0f1a2',
  PERDIDO: 'e1f2a3b4-c5d6-e7f8-a9b0-c1d2e3f4a5b6',
  
  // Pipeline Carteira
  NOVOS: 'new-customers',
  EM_ATENDIMENTO: 'c2503848-5cb1-41b7-abea-8e6ca33538ef',
};

export const STAGE_NAMES: Record<string, string> = {
  '014ca794-95b8-407f-8510-78604bb94918': 'Aguardando',
  'a0c6b9d3-5e8f-4a7c-b2d1-8f3e9c0a4b5d': 'Em Negociação',
  'd7e8f9a0-b1c2-d3e4-f5a6-b7c8d9e0f1a2': 'Ganho',
  'e1f2a3b4-c5d6-e7f8-a9b0-c1d2e3f4a5b6': 'Perdido',
  'c2503848-5cb1-41b7-abea-8e6ca33538ef': 'Em Atendimento',
  'new-customers': 'Novos',
};

// ============================================
// VENDEDORES
// ============================================
export const USER_MAP: Record<string, string> = {
  'AdjNLpTP9xlcDTUHUE3H': 'Eduardo Crisostomo',
  'NrrD7gUsTc2UPdPWrzrr': 'Katherine Camara',
  'MrrP8gVsUc3VQePWsqrr': 'Emily Viana',
  'PrsQ9hWtVd4WRfPXtss': 'Rafael Virginio',
  'QstR0iXuWe5XsfQYutt': 'Ângelo Carioca',
  'RtuS1jYvWf6YTgZRvvu': 'Bonsucesso',
  'SuvT2kZwXg7ZUhASwwwx': 'Raiane',
};
