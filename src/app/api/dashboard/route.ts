import { NextRequest, NextResponse } from 'next/server';
import { sql, getContacts, getOpportunities } from '@/lib/postgres';

interface KPIData {
  receitaPipeline: number;
  oportunidadesEmAndamento: number;
  taxaConversao: number;
  clientesEmSilencio: number;
}

function getPeriodDates(period: string, start?: string, end?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let previousStartDate: Date;
  let previousEndDate: Date;

  switch (period) {
    case 'week': {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayOffset);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(startDate.getDate() - 7);
      previousEndDate = new Date(startDate);
      previousEndDate.setHours(-1, 59, 59, 999);
      break;
    }
    case 'month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999);
      
      const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const prevYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      previousStartDate = new Date(prevYear, prevQuarter * 3, 1, 0, 0, 0, 0);
      previousEndDate = new Date(prevYear, prevQuarter * 3 + 3, 0, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      startDate = start ? new Date(start) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = end ? new Date(end) : now;
      endDate.setHours(23, 59, 59, 999);
      
      const diffMs = endDate.getTime() - startDate.getTime();
      previousEndDate = new Date(startDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - diffMs);
      break;
    }
    default: {
      startDate = new Date(0);
      endDate = new Date();
      previousStartDate = new Date(0);
      previousEndDate = new Date(0);
    }
  }

  return { startDate, endDate, previousStartDate, previousEndDate };
}

function calculateKPIs(opportunities: any[], contacts: any[], startDate: Date, endDate: Date): KPIData {
  const periodOpps = opportunities.filter((o: any) => {
    const created = new Date(o.created_at || 0);
    return created >= startDate && created <= endDate;
  });

  const totalFechados = opportunities.filter((o: any) => ['won', 'lost'].includes(o.status)).length;
  const totalGanhos = opportunities.filter((o: any) => o.status === 'won').length;
  
  const receitaPipeline = periodOpps
    .filter((o: any) => o.status === 'open')
    .reduce((sum: number, o: any) => sum + (o.monetary_value || 0), 0);
  
  const oportunidadesEmAndamento = periodOpps.filter((o: any) => o.status === 'open').length;
  
  const fechadosPeriodo = periodOpps.filter((o: any) => ['won', 'lost'].includes(o.status)).length;
  const ganhosPeriodo = periodOpps.filter((o: any) => o.status === 'won').length;
  const taxaConversao = fechadosPeriodo > 0 ? (ganhosPeriodo / fechadosPeriodo) * 100 : 0;

  const silencioTags = ['parou responder', 'silencio', 'silêncio', 'sem retorno'];
  const clientesEmSilencio = contacts.filter((c: any) => {
    const tags = (c.tags || []).map((t: string) => t.toLowerCase());
    return tags.some((t: string) => silencioTags.some((st: string) => t.includes(st))) ||
           c.resultado_ultimo_contato === 'silencio' ||
           c.resultado_ultimo_contato === 'silêncio';
  }).length;

  return {
    receitaPipeline,
    oportunidadesEmAndamento,
    taxaConversao: Math.round(taxaConversao),
    clientesEmSilencio,
  };
}

function calculateChange(current: number, previous: number): { value: number; percentage: number } {
  if (previous === 0) {
    return { value: current, percentage: current > 0 ? 100 : 0 };
  }
  const change = current - previous;
  const percentage = Math.round((change / previous) * 100);
  return { value: change, percentage };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const { startDate, endDate, previousStartDate, previousEndDate } = getPeriodDates(period, start, end);

    // Fetch all data from Postgres
    const [opportunities, contacts] = await Promise.all([
      getOpportunities(),
      getContacts(),
    ]);

    // Calcular KPIs do período atual
    const kpis = calculateKPIs(opportunities, contacts, startDate, endDate);
    
    // Calcular KPIs do período anterior
    const previousKPIs = calculateKPIs(opportunities, contacts, previousStartDate, previousEndDate);

    // Calcular comparativos
    const comparatives = {
      receitaPipeline: calculateChange(kpis.receitaPipeline, previousKPIs.receitaPipeline),
      oportunidadesEmAndamento: calculateChange(kpis.oportunidadesEmAndamento, previousKPIs.oportunidadesEmAndamento),
      taxaConversao: calculateChange(kpis.taxaConversao, previousKPIs.taxaConversao),
      clientesEmSilencio: {
        ...calculateChange(kpis.clientesEmSilencio, previousKPIs.clientesEmSilencio),
        betterWhen: 'lower',
      },
    };

    // ===== GRÁFICO 1: Funil de Situação =====
    const situacaoCount: Record<string, number> = {};
    for (const c of contacts) {
      const situacao = c.situacao_comercial || 'Não definido';
      situacaoCount[situacao] = (situacaoCount[situacao] || 0) + 1;
    }
    const funnelSituacao = Object.entries(situacaoCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // ===== GRÁFICO 2: Por que Perdeu (Pizza) =====
    const perdaTags = ['perda concorrencia', 'perda preco', 'perda preço', 'perda prazo', 'desistiu'];
    const motivosPerda: Record<string, number> = {};
    
    for (const c of contacts) {
      const tags = (c.tags || []).map((t: string) => t.toLowerCase());
      for (const tag of tags) {
        for (const motivo of perdaTags) {
          if (tag.includes(motivo.toLowerCase())) {
            motivosPerda[motivo] = (motivosPerda[motivo] || 0) + 1;
            break;
          }
        }
      }
    }
    const chartPerdas = Object.entries(motivosPerda)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // ===== GRÁFICO 3: Temperatura da Carteira =====
    const temperatura: Record<string, number> = {
      'Quente': 0,
      'Morno': 0,
      'Frio': 0,
      'Parou': 0,
    };
    
    for (const c of contacts) {
      const tags = (c.tags || []).map((t: string) => t.toLowerCase());
      if (tags.some((t: string) => t.includes('quente'))) temperatura['Quente']++;
      else if (tags.some((t: string) => t.includes('morno'))) temperatura['Morno']++;
      else if (tags.some((t: string) => t.includes('frio'))) temperatura['Frio']++;
      if (tags.some((t: string) => t.includes('parou responder'))) temperatura['Parou']++;
    }
    const chartTemperatura = Object.entries(temperatura)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);

    // ===== GRÁFICO 4: Performance por Vendedor =====
    const vendedores = ['emily', 'katherine', 'eduardo-pereira', 'crisostomo', 'angelo'];
    const desempenhoVendedores: Record<string, { ganhos: number; valor: number; count: number }> = {};
    
    for (const v of vendedores) {
      desempenhoVendedores[v] = { ganhos: 0, valor: 0, count: 0 };
    }
    
    for (const c of contacts) {
      const tags = (c.tags || []).map((t: string) => t.toLowerCase());
      for (const tag of tags) {
        for (const vendedor of vendedores) {
          if (tag.includes(vendedor.toLowerCase())) {
            desempenhoVendedores[vendedor].count++;
            break;
          }
        }
      }
    }
    
    for (const opp of opportunities) {
      const contact = contacts.find((c: any) => c.id === opp.contact_id);
      if (!contact) continue;
      
      const tags = (contact.tags || []).map((t: string) => t.toLowerCase());
      for (const tag of tags) {
        for (const vendedor of vendedores) {
          if (tag.includes(vendedor.toLowerCase())) {
            if (opp.status === 'won') {
              desempenhoVendedores[vendedor].ganhos++;
              desempenhoVendedores[vendedor].valor += opp.monetary_value || 0;
            }
            break;
          }
        }
      }
    }
    
    const chartVendedores = Object.entries(desempenhoVendedores)
      .map(([name, data]) => ({ 
        name, 
        ganhos: data.ganhos, 
        valor: data.valor,
        count: data.count,
      }))
      .sort((a, b) => b.valor - a.valor);

    // ===== TABELA 1: Ranking Vendedores =====
    const rankingVendedores = chartVendedores.map((v, i) => ({
      rank: i + 1,
      nome: v.name,
      ganhos: v.ganhos,
      valorTotal: v.valor,
      clientes: v.count,
      taxaConversao: v.count > 0 ? Math.round((v.ganhos / v.count) * 100) : 0,
    }));

    // ===== TABELA 2: Clientes em Silêncio (prioridade) =====
    const clientesSilencio = contacts
      .filter((c: any) => {
        const tags = (c.tags || []).map((t: string) => t.toLowerCase());
        return tags.some((t: string) => ['parou responder', 'silencio', 'silêncio', 'sem retorno'].some(st => t.includes(st))) ||
               c.resultado_ultimo_contato === 'silencio' ||
               c.resultado_ultimo_contato === 'silêncio';
      })
      .map((c: any) => ({
        id: c.id,
        nome: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sem nome',
        email: c.email || '',
        telefone: c.phone || '',
        prioridade: c.lead_prioridade || 'media',
        situacao: c.situacao_comercial || 'Não definido',
        tags: c.tags || [],
      }))
      .sort((a: any, b: any) => {
        const p: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
        return (p[a.prioridade] ?? 1) - (p[b.prioridade] ?? 1);
      })
      .slice(0, 20);

    // ===== TABELA 3: Detalhamento de Perdas =====
    const totalFechadosGeral = opportunities.filter((o: any) => ['won', 'lost'].includes(o.status)).length;
    const detalhamentoPerdas = Object.entries(motivosPerda)
      .map(([motivo, count]) => ({
        motivo,
        count,
        percentage: totalFechadosGeral > 0 ? Math.round((count / totalFechadosGeral) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      kpis,
      kpisPrevious: previousKPIs,
      comparatives,
      period: {
        current: { start: startDate.toISOString(), end: endDate.toISOString() },
        previous: { start: previousStartDate.toISOString(), end: previousEndDate.toISOString() },
      },
      charts: {
        funnelSituacao,
        perdas: chartPerdas,
        temperatura: chartTemperatura,
        vendedores: chartVendedores,
      },
      tables: {
        rankingVendedores,
        clientesSilencio,
        detalhamentoPerdas,
      },
      meta: {
        totalContacts: contacts.length,
        totalOpportunities: opportunities.length,
        totalGanhos: opportunities.filter((o: any) => o.status === 'won').length,
        totalPerdidos: opportunities.filter((o: any) => o.status === 'lost').length,
        lastSync: opportunities[0]?.last_synced_at || null,
        periodSelected: period,
      },
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
