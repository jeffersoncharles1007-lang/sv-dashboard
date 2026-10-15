'use client';

import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Opportunity } from '@/lib/ghl';
import { 
  STAGE_GANHO, 
  STAGE_PERDIDO, 
  STAGE_AGUARDANDO, 
  STAGE_ATENDIMENTO, 
  STAGE_NEGOCIACAO,
  PIPELINE_ORCAMENTOS 
} from './constants';

export interface ExecutiveKPIs {
  receitaTotal: number;
  conversaoRate: number;
  novosLeads: number;
  ticketMedio: number;
  tempoPipelineMedio: number;
  // Detalhes adicionais
  totalGanhos: number;
  totalPerdidos: number;
  totalOportunidades: number;
  leadsPipeline: number;
}

export function calculateExecutiveKPIs(
  opportunities: Opportunity[],
  pipelineId: string = PIPELINE_ORCAMENTOS
): ExecutiveKPIs {
  // Filtrar apenas oportunidades do pipeline de orçamentos
  const pipelineOpps = opportunities.filter(o => o.pipelineId === pipelineId);
  
  // Ganhos e Perdas
  const ganhos = pipelineOpps.filter(o => o.pipelineStageId === STAGE_GANHO || o.status === 'won');
  const perdas = pipelineOpps.filter(o => o.pipelineStageId === STAGE_PERDIDO || o.status === 'lost');
  const emPipeline = pipelineOpps.filter(o => 
    ![STAGE_GANHO, STAGE_PERDIDO].includes(o.pipelineStageId)
  );
  
  // 1. Receita Total (soma dos ganhos)
  const receitaTotal = ganhos.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
  
  // 2. % Conversão (ganhos / (ganhos + perdas))
  const totalFechados = ganhos.length + perdas.length;
  const conversaoRate = totalFechados > 0 ? (ganhos.length / totalFechados) * 100 : 0;
  
  // 3. Novos Leads (criados nos últimos 7 dias)
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const novosLeads = pipelineOpps.filter(o => new Date(o.createdAt) >= seteDiasAtras).length;
  
  // 4. Ticket Médio (receita / quantidade de ganhos)
  const ticketMedio = ganhos.length > 0 ? receitaTotal / ganhos.length : 0;
  
  // 5. Tempo Médio no Pipeline (dias desde criação até ganho ou média atual)
  const tempos: number[] = [];
  const now = new Date();
  
  for (const opp of emPipeline) {
    const created = new Date(opp.createdAt);
    tempos.push(differenceInDays(now, created));
  }
  
  for (const opp of ganhos) {
    const created = new Date(opp.createdAt);
    const updated = new Date(opp.updatedAt);
    tempos.push(differenceInDays(updated, created));
  }
  
  const tempoPipelineMedio = tempos.length > 0 
    ? tempos.reduce((a, b) => a + b, 0) / tempos.length 
    : 0;
  
  return {
    receitaTotal,
    conversaoRate,
    novosLeads,
    ticketMedio,
    tempoPipelineMedio: Math.round(tempoPipelineMedio),
    totalGanhos: ganhos.length,
    totalPerdidos: perdas.length,
    totalOportunidades: pipelineOpps.length,
    leadsPipeline: emPipeline.length,
  };
}

// KPIs de tendência (comparar períodos)
export interface TrendKPIs {
  receitaTrend: number;
  leadsTrend: number;
  conversaoTrend: number;
  ticketTrend: number;
  tempoTrend: number;
}

export function calculateTrends(
  opportunities: Opportunity[],
  pipelineId: string = PIPELINE_ORCAMENTOS
): TrendKPIs {
  const now = new Date();
  const seteDiasAtras = new Date(now);
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const catorzeDiasAtras = new Date(now);
  catorzeDiasAtras.setDate(catorzeDiasAtras.getDate() - 14);
  
  const pipelineOpps = opportunities.filter(o => o.pipelineId === pipelineId);
  
  // Período atual (últimos 7 dias)
  const currentPeriod = pipelineOpps.filter(o => {
    const created = new Date(o.createdAt);
    return created >= seteDiasAtras;
  });
  
  // Período anterior (7-14 dias atrás)
  const previousPeriod = pipelineOpps.filter(o => {
    const created = new Date(o.createdAt);
    return created >= catorzeDiasAtras && created < seteDiasAtras;
  });
  
  // Ganhos no período
  const currentGanhados = currentPeriod.filter(o => o.pipelineStageId === STAGE_GANHO).length;
  const previousGanhados = previousPeriod.filter(o => o.pipelineStageId === STAGE_GANHO).length;
  
  // Perdas no período
  const currentPerdidos = currentPeriod.filter(o => o.pipelineStageId === STAGE_PERDIDO).length;
  const previousPerdidos = previousPeriod.filter(o => o.pipelineStageId === STAGE_PERDIDO).length;
  
  // Receita atual
  const currentReceita = currentPeriod
    .filter(o => o.pipelineStageId === STAGE_GANHO)
    .reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
  const previousReceita = previousPeriod
    .filter(o => o.pipelineStageId === STAGE_GANHO)
    .reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
  
  // Ticket médio
  const currentTicket = currentGanhados > 0 ? currentReceita / currentGanhados : 0;
  const previousTicket = previousGanhados > 0 ? previousReceita / previousGanhados : 0;
  
  // Conversão
  const currentFechados = currentGanhados + currentPerdidos;
  const previousFechados = previousGanhados + previousPerdidos;
  const currentConv = currentFechados > 0 ? (currentGanhados / currentFechados) * 100 : 0;
  const previousConv = previousFechados > 0 ? (previousGanhados / previousFechados) * 100 : 0;
  
  return {
    receitaTrend: calculateTrendPercent(currentReceita, previousReceita),
    leadsTrend: calculateTrendPercent(currentPeriod.length, previousPeriod.length),
    conversaoTrend: currentConv - previousConv,
    ticketTrend: calculateTrendPercent(currentTicket, previousTicket),
    tempoTrend: 0, // Simplificado
  };
}

function calculateTrendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Dados para gráfico de evolução temporal
export interface EvolutionDataPoint {
  date: string;
  created: number;
  won: number;
  lost: number;
  value: number;
}

export function getEvolutionData(
  opportunities: Opportunity[],
  pipelineId: string = PIPELINE_ORCAMENTOS,
  days: number = 30
): EvolutionDataPoint[] {
  const data: EvolutionDataPoint[] = [];
  const pipelineOpps = opportunities.filter(o => o.pipelineId === pipelineId);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const created = pipelineOpps.filter(o => {
      const createdDate = new Date(o.createdAt);
      return createdDate >= dayStart && createdDate <= dayEnd;
    });
    
    const won = created.filter(o => o.pipelineStageId === STAGE_GANHO).length;
    const lost = created.filter(o => o.pipelineStageId === STAGE_PERDIDO).length;
    const value = created
      .filter(o => o.pipelineStageId === STAGE_GANHO)
      .reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
    
    data.push({
      date: format(date, 'dd/MM'),
      created: created.length,
      won,
      lost,
      value,
    });
  }
  
  return data;
}
