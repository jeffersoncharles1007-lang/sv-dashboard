/**
 * API VENDAS DETAIL - SV ELÉTRICA
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    // Tendência de vendas (últimos 30 dias)
    const tendenciaQuery = await sql`
      SELECT 
        DATE(monetization_attribution_date) as data,
        SUM(valor_total) as valor,
        SUM(SUM(valor_total)) OVER (ORDER BY DATE(monetization_attribution_date)) as acumulado
      FROM opportunities
      WHERE status = 'won'
        AND monetization_attribution_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(monetization_attribution_date)
      ORDER BY data
    `;

    // Oportunidades em aberto
    const oportunidadesQuery = await sql`
      SELECT 
        o.name as nome,
        o.valor_total as valor,
        CASE 
          WHEN o.pipeline_id = 'ihc0DHSDb8kcRJU3kWk8' THEN 'Orçamento'
          WHEN o.pipeline_id = 'x5xVu9xKc1eZxVkra6M7' THEN 'Carteira'
          ELSE 'Prospecção'
        END as estagio,
        COALESCE(o.assigned_to_name, 'Não atribuído') as vendedor,
        CURRENT_DATE - DATE(o.created_at) as dias
      FROM opportunities o
      WHERE o.status = 'open'
      ORDER BY o.valor_total DESC
      LIMIT 50
    `;

    // Stats
    const statsQuery = await sql`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(valor_total), 0) as valor_total,
        COUNT(CASE WHEN pipeline_id = 'ihc0DHSDb8kcRJU3kWk8' THEN 1 END) as em_negociacao,
        COALESCE(
          ROUND(AVG(CURRENT_DATE - DATE(created_at))::numeric, 0),
          0
        ) as prazo_medio
      FROM opportunities
      WHERE status = 'open'
    `;

    const stats = statsQuery[0] || { total: 0, valor_total: 0, em_negociacao: 0, prazo_medio: 0 };

    return NextResponse.json({
      tendencia: tendenciaQuery.map((t: any) => ({
        data: new Date(t.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        valor: Number(t.valor),
        acumulado: Number(t.acumulado)
      })),
      oportunidades: oportunidadesQuery.map((o: any) => ({
        nome: o.nome || 'Sem nome',
        valor: Number(o.valor),
        estagio: o.estagio,
        vendedor: o.vendedor,
        dias: Number(o.dias)
      })),
      stats: {
        totalOportunidades: Number(stats.total),
        valorTotal: Number(stats.valor_total),
        emNegociacao: Number(stats.em_negociacao),
        prazoMedio: Number(stats.prazo_medio)
      }
    });

  } catch (error) {
    console.error('Vendas API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
