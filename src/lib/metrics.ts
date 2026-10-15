import { Opportunity, Contact, Conversation } from './ghl';
import { 
  STAGE_GANHO, 
  STAGE_PERDIDO, 
  STAGE_AGUARDANDO, 
  STAGE_ATENDIMENTO, 
  STAGE_NEGOCIACAO,
  PIPELINE_ORCAMENTOS,
  STAGE_NAMES,
  USER_MAP
} from './constants';

export interface DailyKPIs {
  contactsToday: number;
  conversationsToday: number;
  interestedToday: number;
  budgetsCreatedToday: number;
  wonToday: number;
  lostToday: number;
}

export interface PipelineFunnel {
  stage: string;
  count: number;
  value: number;
}

export interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  totalOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  totalValue: number;
  wonValue: number;
  conversionRate: number;
}

export interface LeadSource {
  source: string;
  count: number;
  value: number;
}

export interface Pipeline {
  name: string;
  count: number;
}

export function calculatePipelineFunnel(opportunities: Opportunity[]): PipelineFunnel[] {
  const pipelineOpp = opportunities.filter(o => o.pipelineId === PIPELINE_ORCAMENTOS);
  
  const stages = [
    { id: STAGE_AGUARDANDO, name: 'Aguardando' },
    { id: STAGE_ATENDIMENTO, name: 'Em Atendimento' },
    { id: STAGE_NEGOCIACAO, name: 'Em Negociação' },
    { id: STAGE_GANHO, name: 'Ganho' },
    { id: STAGE_PERDIDO, name: 'Perdido' },
  ];
  
  return stages.map(stage => {
    const stageOpps = pipelineOpp.filter(o => o.pipelineStageId === stage.id);
    return {
      stage: stage.name,
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
    };
  });
}

export function calculateVendorPerformance(opportunities: Opportunity[]): VendorPerformance[] {
  const vendorMap: Record<string, VendorPerformance> = {};
  
  for (const opp of opportunities) {
    const vendorId = opp.assignedTo || 'unassigned';
    if (!vendorMap[vendorId]) {
      vendorMap[vendorId] = {
        vendorId,
        vendorName: opp.assignedTo ? getVendorName(opp.assignedTo) : 'Sem atribuição',
        totalOpportunities: 0,
        wonOpportunities: 0,
        lostOpportunities: 0,
        totalValue: 0,
        wonValue: 0,
        conversionRate: 0,
      };
    }
    
    const v = vendorMap[vendorId];
    v.totalOpportunities++;
    v.totalValue += opp.monetaryValue || 0;
    
    if (opp.pipelineStageId === STAGE_GANHO || opp.status === 'won') {
      v.wonOpportunities++;
      v.wonValue += opp.monetaryValue || 0;
    } else if (opp.pipelineStageId === STAGE_PERDIDO || opp.status === 'lost') {
      v.lostOpportunities++;
    }
  }
  
  // Calculate conversion rates
  for (const v of Object.values(vendorMap)) {
    const closed = v.wonOpportunities + v.lostOpportunities;
    v.conversionRate = closed > 0 ? (v.wonOpportunities / closed) * 100 : 0;
  }
  
  return Object.values(vendorMap).sort((a, b) => b.totalValue - a.totalValue);
}

function getVendorName(userId: string): string {
  return USER_MAP[userId] || userId;
}

export function calculateLeadSources(opportunities: Opportunity[]): LeadSource[] {
  // Source is 100% empty in GHL SV, so we use pipeline as proxy
  const sourceMap: Record<string, LeadSource> = {};
  
  const pipelineNames: Record<string, string> = {
    'ihc0DHSDb8kcRJU3kWk8': 'Orçamentos',
    'x5xVu9xKc1eZxVkra6M7': 'Carteira',
    '22IBbwWcepqRSz6ZBKqM': 'Inativos',
    'qpbN1f6IZqWaF8gQeS7E': 'Prospecção',
  };
  
  for (const opp of opportunities) {
    const source = pipelineNames[opp.pipelineId] || 'Outro';
    if (!sourceMap[source]) {
      sourceMap[source] = { source, count: 0, value: 0 };
    }
    sourceMap[source].count++;
    sourceMap[source].value += opp.monetaryValue || 0;
  }
  
  return Object.values(sourceMap).sort((a, b) => b.count - a.count);
}

export function calculatePipelines(opportunities: Opportunity[]): Pipeline[] {
  const pipelineMap: Record<string, number> = {};
  
  const pipelineNames: Record<string, string> = {
    'ihc0DHSDb8kcRJU3kWk8': 'Orçamentos em Aberto',
    'x5xVu9xKc1eZxVkra6M7': 'Carteira',
    '22IBbwWcepqRSz6ZBKqM': 'Inativos',
    'qpbN1f6IZqWaF8gQeS7E': 'Prospecção Ativa',
  };
  
  for (const opp of opportunities) {
    const name = pipelineNames[opp.pipelineId] || 'Outro';
    pipelineMap[name] = (pipelineMap[name] || 0) + 1;
  }
  
  return Object.entries(pipelineMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
