// User mapping: User ID → Name
export const USER_MAP: Record<string, string> = {
  'NrrD7gUsTc2UPdPWrzrr': 'Emily Viana',
  'wNcIP7X71dHTw8tEzEOs': 'Katherine Camara',
  'vjSjEYAOaQLJ99e8gFRc': 'Eduardo Crisóstomo',
  'AdjNLpTP9xlcDTUHUE3H': 'Ângelo Carioca Costa',
  'IRaCtYyKa36apjEd6tzj': 'Mercia Almeida',
  'd1ZZZvBgo0XwjfWtduTk': 'Eduardo Pereira',
};

export const PIPELINE_NAMES: Record<string, string> = {
  'ihc0DHSDb8kcRJU3kWk8': 'Orçamentos em Aberto',
  'x5xVu9xKc1eZxVkra6M7': 'Carteira / Cliente Ativo',
  '22IBbwWcepqRSz6ZBKqM': 'Inativos',
  'qpbN1f6IZqWaF8gQeS7E': 'Prospecção Ativa',
};

// Pipeline de orçamentos principal
export const PIPELINE_ORCAMENTOS = 'ihc0DHSDb8kcRJU3kWk8';

// Stages IDs
export const STAGE_AGUARDANDO = '014ca794-95b8-407f-8510-78604bb94918';
export const STAGE_ATENDIMENTO = 'c2503848-5cb1-41b7-abea-8e6ca33538ef';
export const STAGE_NEGOCIACAO = '8321615c-2a8a-4636-b6a3-599aad08c1a9';
export const STAGE_GANHO = 'da5ddb01-81cf-45aa-b2de-0a01aca75ee9';
export const STAGE_PERDIDO = '984aebec-ca6c-4023-b6a4-d676c813b685';

export const STAGE_NAMES: Record<string, string> = {
  [STAGE_AGUARDANDO]: 'Aguardando',
  [STAGE_ATENDIMENTO]: 'Em Atendimento',
  [STAGE_NEGOCIACAO]: 'Em Negociação',
  [STAGE_GANHO]: 'Ganho',
  [STAGE_PERDIDO]: 'Perdido',
};

export const STAGE_ORDER = [
  STAGE_AGUARDANDO,
  STAGE_ATENDIMENTO,
  STAGE_NEGOCIACAO,
  STAGE_GANHO,
  STAGE_PERDIDO,
];

export const LOCATION_ID = 'IBE8l3u7AtR6JuNOOagY';
export const API_BASE = 'https://services.leadconnectorhq.com';

// OpenRouter (para Agente IA)
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
