/**
 * API PIPELINE DETAIL - SV ELÉTRICA
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    // Funil por estágio
    const funilQuery = await sql`
      SELECT 
        CASE 
          WHEN pipeline_id = 'ihc0DHSDb8kcRJU3kWk8' THEN 'Orçamentos'
          WHEN pipeline_id = 'x5xVu9xKc1eZxVkra6M7' THEN 'Carteira'
          WHEN pipeline_id = '22IBbwWcepqRSz6ZBKqM' THEN 'Inativos'
          ELSE 'Prospecção'
        END as estagio,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor_total), 0) as valor
      FROM opportunities
      WHERE status = 'open'
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY pipeline_id
      ORDER BY COUNT(*) DESC
    `;

    const coresEstagio: Record<string, string> = {
      'Prospecção': '#f97316',
      'Orçamentos': '#3b82f6',
      'Carteira': '#22c55e',
      'Inativos': '#64748b'
    };

    // Oportunidades frias (sem contato > 14 dias)
    const friosQuery = await sql`
      SELECT 
        o.name as nome,
        o.valor_total as valor,
        CURRENT_DATE - DATE(o.last_stage_change) as dias,
        COALESCE(o.assigned_to_name, 'Não atribuído') as vendedor
      FROM opportunities o
      WHERE o.status = 'open'
        AND o.last_stage_change < CURRENT_DATE - INTERVAL '14 days'
        AND o.valor_total > 5000
      ORDER BY o.valor_total DESC
      LIMIT 20
    `;

    // Alertas
    const alertas = [];
    
    const friosCount = friosQuery.length;
    if (friosCount > 0) {
      alertas.push({
        tipo: 'frios',
        mensagem: `${friosCount} oportunidades frias`,
        quantidade: friosCount
      });
    }

    const orcamentosQuery = await sql`
      SELECT COUNT(*) as count
      FROM opportunities
      WHERE pipeline_id = 'ihc0DHSDb8kcRJU3kWk8'
        AND status = 'open'
        AND valor_total > 50000
    `;
    
    if (Number(orcamentosQuery[0]?.count || 0) > 0) {
      alertas.push({
        tipo: 'grandes_orcamentos',
        mensagem: 'Grandes orçamentos pendentes',
        quantidade: Number(orcamentosQuery[0]?.count || 0)
      });
    }

    return NextResponse.json({
      funil: funilQuery.map((f: any) => ({
        estagio: f.estagio,
        quantidade: Number(f.quantidade),
        valor: Number(f.valor),
        cor: coresEstagio[f.estagio] || '#64748b'
      })),
      alertas,
      frios: friosQuery.map((f: any) => ({
        nome: f.nome || 'Sem nome',
        valor: Number(f.valor),
        dias: Number(f.dias),
        vendedor: f.vendedor
      }))
    });

  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
