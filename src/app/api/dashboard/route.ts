/**
 * DASHBOARD API - SV ELÉTRICA
 * 
 * KPIs Reais:
 * - Contatos feitos (primeiro contato por dia)
 * - Conversas (conversas que aconteceram)
 * - Interessados (classificação = intenção compra)
 * - Orçamentos (opps em estágio negociação)
 * - Vendas ganhas / perdidas
 * - Conversão por vendedor
 * - Tempo médio no pipeline
 * - Motivos de perda
 * - Pipeline com mais potencial
 * 
 * Filtros: período, pipeline
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql, getContacts, getOpportunities, getConversations } from '@/lib/postgres';
import { PIPELINE_NAMES, STAGE_NAMES, USER_MAP } from '@/lib/constants';

// ============================================
// TYPES
// ============================================

interface KPIData {
  contatosFeitos: number;
  conversas: number;
  interessados: number;
  perguntas: number;
  reclamacoes: number;
  encerramentos: number;
  silencios: number;
  orcamentos: number;
  emAtendimento: number;
  vendasGanhas: number;
  vendasPerdidas: number;
  valorGanho: number;
  receitaPipeline: number;
  ticketMedio: number;
}

interface PeriodDates {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

// ============================================
// HELPERS
// ============================================

function getPeriodDates(period: string): PeriodDates {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();
  const previousStartDate = new Date();
  const previousEndDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      previousStartDate.setDate(now.getDate() - 1);
      previousStartDate.setHours(0, 0, 0, 0);
      previousEndDate.setDate(now.getDate() - 1);
      previousEndDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate.setDate(now.getDate() + mondayOffset);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      previousStartDate.setDate(startDate.getDate() - 7);
      previousEndDate.setDate(startDate.getDate() - 1);
      previousEndDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      previousStartDate.setMonth(now.getMonth() - 1);
      previousStartDate.setDate(1);
      previousStartDate.setHours(0, 0, 0, 0);
      previousEndDate.setDate(0);
      previousEndDate.setHours(23, 59, 59, 999);
      break;
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate.setMonth(currentQuarter * 3, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(currentQuarter * 3 + 3, 0);
      endDate.setHours(23, 59, 59, 999);
      const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const prevYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      previousStartDate.setFullYear(prevYear, prevQuarter * 3, 1);
      previousEndDate.setMonth(prevQuarter * 3 + 3, 0);
      break;
    default:
      startDate.setFullYear(2020, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      previousStartDate.setFullYear(2020, 0, 1);
      previousEndDate.setFullYear(2020, 0, 1);
  }

  return { startDate, endDate, previousStartDate, previousEndDate };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    today: 'Hoje',
    week: 'Esta Semana',
    month: 'Este Mês',
    quarter: 'Este Trimestre',
    all: 'Todo Período',
  };
  return labels[period] || period;
}

function calculateChange(current: number, previous: number): { value: number; percentage: number } {
  if (previous === 0) {
    return { value: current, percentage: current > 0 ? 100 : 0 };
  }
  const change = current - previous;
  const percentage = Math.round((change / previous) * 100);
  return { value: change, percentage };
}

// ============================================
// CALCULATE KPIs
// ============================================

function calculateKPIs(
  contacts: any[],
  opportunities: any[],
  conversations: any[],
  period: PeriodDates,
  pipelineFilter: string
): KPIData {
  let filteredOpps = opportunities;
  if (pipelineFilter && pipelineFilter !== 'all') {
    filteredOpps = opportunities.filter((o: any) => o.pipeline_id === pipelineFilter);
  }

  const periodOpps = filteredOpps.filter((o: any) => {
    if (!o.created_at) return false;
    const created = new Date(o.created_at);
    return created >= period.startDate && created <= period.endDate;
  });

  const contatosFeitos = contacts.filter((c: any) => {
    if (!c.created_at) return false;
    const created = new Date(c.created_at);
    return created >= period.startDate && created <= period.endDate;
  }).length;

  const conversas = conversations.filter((conv: any) => {
    if (!conv.last_message_date) return false;
    const msgDate = new Date(conv.last_message_date);
    return msgDate >= period.startDate && msgDate <= period.endDate;
  }).length;

  const contatosComClass = contacts.filter((c: any) => c.resultado_ultimo_contato);
  const interessados = contatosComClass.filter((c: any) => c.resultado_ultimo_contato === 'intencao_compra').length;
  const perguntas = contatosComClass.filter((c: any) => c.resultado_ultimo_contato === 'pergunta').length;
  const reclamacoes = contatosComClass.filter((c: any) => c.resultado_ultimo_contato === 'reclamacao').length;
  const encerramentos = contatosComClass.filter((c: any) => c.resultado_ultimo_contato === 'encerramento').length;
  const silencios = contatosComClass.filter((c: any) => c.resultado_ultimo_contato === 'silencio').length;

  const orcamentos = filteredOpps.filter((o: any) => o.pipeline_stage_id === '8321615c-2a8a-4636-b6a3-599aad08c1a9').length;
  const emAtendimento = filteredOpps.filter((o: any) => o.pipeline_stage_id === 'c2503848-5cb1-41b7-abea-8e6ca33538ef').length;

  const vendasGanhas = filteredOpps.filter((o: any) => o.status === 'won').length;
  const vendasPerdidas = filteredOpps.filter((o: any) => o.status === 'lost').length;
  
  // Garantir que monetary_value é número
  const valorGanho = filteredOpps
    .filter((o: any) => o.status === 'won')
    .reduce((sum: number, o: any) => sum + (Number(o.monetary_value) || 0), 0);

  const receitaPipeline = filteredOpps
    .filter((o: any) => o.status === 'open')
    .reduce((sum: number, o: any) => sum + (Number(o.monetary_value) || 0), 0);

  const ticketMedio = vendasGanhas > 0 ? valorGanho / vendasGanhas : 0;

  return {
    contatosFeitos, conversas, interessados, perguntas, reclamacoes, encerramentos,
    silencios, orcamentos, emAtendimento, vendasGanhas, vendasPerdidas,
    valorGanho, receitaPipeline, ticketMedio,
  };
}

// ============================================
// ANALYSES
// ============================================

function calculateConversionByVendor(opportunities: any[]): any[] {
  const vendedorStats: Record<string, any> = {};

  for (const opp of opportunities) {
    const vendedor = opp.assigned_to || 'unknown';
    const nome = USER_MAP[vendedor] || vendedor;

    if (!vendedorStats[vendedor]) {
      vendedorStats[vendedor] = { nome, ganhos: 0, perdidos: 0, emAberto: 0, valorGanho: 0, taxaConversao: 0 };
    }

    if (opp.status === 'won') {
      vendedorStats[vendedor].ganhos++;
      vendedorStats[vendedor].valorGanho += Number(opp.monetary_value) || 0;
    } else if (opp.status === 'lost') {
      vendedorStats[vendedor].perdidos++;
    } else if (opp.status === 'open') {
      vendedorStats[vendedor].emAberto++;
    }
  }

  for (const v of Object.values(vendedorStats)) {
    const total = v.ganhos + v.perdidos;
    v.taxaConversao = total > 0 ? Math.round((v.ganhos / total) * 100) : 0;
    v.valorGanho = Number(v.valorGanho) || 0;
  }

  return Object.values(vendedorStats).sort((a: any, b: any) => b.valorGanho - a.valorGanho);
}

function calculatePipelinePotential(opportunities: any[]): any[] {
  const pipelineStats: Record<string, any> = {};

  for (const opp of opportunities) {
    const pipelineId = opp.pipeline_id || 'unknown';
    const nome = PIPELINE_NAMES[pipelineId] || pipelineId;

    if (!pipelineStats[pipelineId]) {
      pipelineStats[pipelineId] = { id: pipelineId, nome, total: 0, abertos: 0, ganhos: 0, perdidos: 0, receita: 0 };
    }

    pipelineStats[pipelineId].total++;
    if (opp.status === 'open') {
      pipelineStats[pipelineId].abertos++;
      pipelineStats[pipelineId].receita += Number(opp.monetary_value) || 0;
    } else if (opp.status === 'won') {
      pipelineStats[pipelineId].ganhos++;
    } else if (opp.status === 'lost') {
      pipelineStats[pipelineId].perdidos++;
    }
  }

  return Object.values(pipelineStats).sort((a: any, b: any) => b.receita - a.receita);
}

function calculateLossReasons(contacts: any[]): any[] {
  const reasons: Record<string, number> = {
    'concorrencia': 0, 'preco': 0, 'prazo_pagamento': 0, 'prazo_entrega': 0,
    'sem_interesse': 0, 'sem_resposta': 0, 'outros': 0,
  };

  for (const contact of contacts) {
    const tags = (contact.tags || []).map((t: string) => t.toLowerCase());
    
    if (tags.some((t: string) => t.includes('perda concorrencia'))) reasons['concorrencia']++;
    else if (tags.some((t: string) => t.includes('perda preco') || t.includes('perda preço'))) reasons['preco']++;
    else if (tags.some((t: string) => t.includes('perda prazo pagamento'))) reasons['prazo_pagamento']++;
    else if (tags.some((t: string) => t.includes('perda prazo entrega'))) reasons['prazo_entrega']++;
    else if (tags.some((t: string) => t.includes('perda sem interesse'))) reasons['sem_interesse']++;
    else if (tags.some((t: string) => t.includes('perda sem resposta'))) reasons['sem_resposta']++;
    else if (tags.some((t: string) => t.includes('perda'))) reasons['outros']++;
  }

  const total = Object.values(reasons).reduce((a, b) => a + b, 0);

  return Object.entries(reasons)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({
      motivo: name.replace('_', ' '),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateAvgTimeInPipeline(opportunities: any[]): any[] {
  const stageTimes: Record<string, any> = {};

  for (const opp of opportunities) {
    if (opp.status !== 'open' || !opp.created_at || !opp.updated_at) continue;
    
    const created = new Date(opp.created_at);
    const updated = new Date(opp.updated_at);
    const days = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    const stageId = opp.pipeline_stage_id || 'unknown';
    if (!stageTimes[stageId]) stageTimes[stageId] = { totalDays: 0, count: 0 };
    stageTimes[stageId].totalDays += days;
    stageTimes[stageId].count++;
  }

  return Object.entries(stageTimes).map(([stageId, data]: [string, any]) => ({
    stage: STAGE_NAMES[stageId] || stageId,
    avgDays: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
    count: data.count,
  })).sort((a: any, b: any) => b.avgDays - a.avgDays);
}

// ============================================
// MAIN API
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const pipeline = searchParams.get('pipeline') || 'all';

    const periodDates = getPeriodDates(period);

    const [contacts, opportunities, conversations] = await Promise.all([
      getContacts(),
      getOpportunities(),
      getConversations(),
    ]);

    const kpis = calculateKPIs(contacts, opportunities, conversations, periodDates, pipeline);
    
    const previousKPIs = calculateKPIs(contacts, opportunities, conversations, {
      startDate: periodDates.previousStartDate,
      endDate: periodDates.previousEndDate,
      previousStartDate: new Date(0),
      previousEndDate: new Date(0),
    }, pipeline);

    const totalFechados = kpis.vendasGanhas + kpis.vendasPerdidas;
    const prevTotalFechados = previousKPIs.vendasGanhas + previousKPIs.vendasPerdidas;
    const taxaConversao = totalFechados > 0 ? Math.round((kpis.vendasGanhas / totalFechados) * 100) : 0;
    const prevTaxaConversao = prevTotalFechados > 0 ? Math.round((previousKPIs.vendasGanhas / prevTotalFechados) * 100) : 0;

    const changes = {
      contatosFeitos: calculateChange(kpis.contatosFeitos, previousKPIs.contatosFeitos),
      conversas: calculateChange(kpis.conversas, previousKPIs.conversas),
      interessados: calculateChange(kpis.interessados, previousKPIs.interessados),
      vendasGanhas: calculateChange(kpis.vendasGanhas, previousKPIs.vendasGanhas),
      valorGanho: calculateChange(kpis.valorGanho, previousKPIs.valorGanho),
      taxaConversao: calculateChange(taxaConversao, prevTaxaConversao),
    };

    const conversionByVendor = calculateConversionByVendor(opportunities);
    const pipelinePotential = calculatePipelinePotential(opportunities);
    const lossReasons = calculateLossReasons(contacts);
    const avgTimeInPipeline = calculateAvgTimeInPipeline(opportunities);

    return NextResponse.json({
      success: true,
      period: {
        current: { start: periodDates.startDate.toISOString(), end: periodDates.endDate.toISOString() },
        previous: { start: periodDates.previousStartDate.toISOString(), end: periodDates.previousEndDate.toISOString() },
        label: getPeriodLabel(period),
      },
      pipeline: {
        selected: pipeline,
        pipelines: pipelinePotential,
      },
      kpis: {
        ...kpis,
        valorGanhoFormatted: formatCurrency(kpis.valorGanho),
        receitaPipelineFormatted: formatCurrency(kpis.receitaPipeline),
        ticketMedioFormatted: formatCurrency(kpis.ticketMedio),
        taxaConversao,
      },
      changes,
      analyses: {
        conversionByVendor,
        pipelinePotential,
        lossReasons,
        avgTimeInPipeline,
      },
      meta: {
        totalContacts: contacts.length,
        totalOpportunities: opportunities.length,
        totalConversations: conversations.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
