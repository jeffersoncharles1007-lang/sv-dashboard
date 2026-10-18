/**
 * API DASHBOARD FULL - SV ELÉTRICA
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const pipeline = searchParams.get('pipeline') || 'all';

    // KPIs principais
    const kpisQuery = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'open' THEN monetary_value ELSE 0 END), 0) as receita_pipeline,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as vendas_ganhas,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as vendas_perdidas,
        ROUND(
          CASE 
            WHEN COUNT(CASE WHEN status IN ('won', 'lost') THEN 1 END) > 0 
            THEN COUNT(CASE WHEN status = 'won' THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status IN ('won', 'lost') THEN 1 END), 0) * 100
            ELSE 0 
          END, 1
        ) as taxa_conversao,
        COALESCE(
          ROUND(AVG(CASE WHEN status = 'won' THEN monetary_value END)::numeric, 2),
          0
        ) as ticket_medio
      FROM opportunities
    `;

    // Pipeline por status
    const pipelineQuery = await sql`
      SELECT 
        CASE 
          WHEN pipeline_id = 'ihc0DHSDb8kcRJU3kWk8' THEN 'Orçamentos'
          WHEN pipeline_id = 'x5xVu9xKc1eZxVkra6M7' THEN 'Carteira'
          WHEN pipeline_id = '22IBbwWcepqRSz6ZBKqM' THEN 'Inativos'
          ELSE 'Prospecção'
        END as name,
        COUNT(*) as value
      FROM opportunities
      GROUP BY pipeline_id
    `;

    // Ranking de vendedores
    const rankingQuery = await sql`
      SELECT 
        COALESCE(assigned_to, 'Não atribuído') as nome,
        COUNT(*) as quantidade,
        COALESCE(SUM(monetary_value), 0) as valor
      FROM opportunities
      WHERE status = 'won'
      GROUP BY assigned_to
      ORDER BY valor DESC
      LIMIT 10
    `;

    const kpis = kpisQuery[0] || {
      receita_pipeline: 0,
      vendas_ganhas: 0,
      vendas_perdidas: 0,
      taxa_conversao: 0,
      ticket_medio: 0
    };

    // Vendas mensais (mock baseado no período)
    const mesesMap: Record<string, string[]> = {
      '7d': ['Hoje'],
      '30d': ['Out'],
      '90d': ['Ago', 'Set', 'Out'],
      'mes': ['Out'],
      'ano': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    };
    const meses = mesesMap[period] || ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const vendasMensais = meses.map((mes, i) => ({
      mes,
      valor: Math.floor(Math.random() * 50000) + 10000,
      meta: 50000
    }));

    const pipelineColors: Record<string, string> = {
      'Orçamentos': '#3b82f6',
      'Carteira': '#22c55e',
      'Prospecção': '#f97316',
      'Inativos': '#64748b'
    };

    return NextResponse.json({
      kpis: {
        receitaPipeline: Number(kpis.receita_pipeline) || 0,
        metaReceita: 500000,
        vendasGanhas: Number(kpis.vendas_ganhas) || 0,
        vendasPerdidas: Number(kpis.vendas_perdidas) || 0,
        taxaConversao: Number(kpis.taxa_conversao) || 0,
        metaConversao: 15,
        ticketMedio: Number(kpis.ticket_medio) || 0
      },
      vendasMensais,
      pipelineStatus: pipelineQuery.map((p: any) => ({
        name: p.name,
        value: Number(p.value),
        color: pipelineColors[p.name] || '#64748b'
      })),
      rankingVendedores: rankingQuery.map((v: any) => ({
        nome: v.nome,
        valor: Number(v.valor),
        meta: 30000
      })),
      filters: { period, pipeline, vendedor: 'all' },
      ultimoSync: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({
      kpis: {
        receitaPipeline: 0,
        metaReceita: 500000,
        vendasGanhas: 0,
        vendasPerdidas: 0,
        taxaConversao: 0,
        metaConversao: 15,
        ticketMedio: 0
      },
      vendasMensais: [],
      pipelineStatus: [],
      rankingVendedores: [],
      filters: { period: '30d', pipeline: 'all', vendedor: 'all' },
      ultimoSync: new Date().toISOString(),
      error: String(error)
    }, { status: 500 });
  }
}
