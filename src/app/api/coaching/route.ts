/**
 * API DE COACHING - SV ELÉTRICA
 * Retorna relatório de auditoria por vendedor
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';
import { USER_MAP } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedor') || null;

    // Query de coaching por vendedor
    const coachingQuery = sql`
      SELECT 
        vendedor_id,
        vendedor_nome,
        COUNT(*) as total_atendimentos,
        AVG(passo_acolhimento) * 100 as acolhimento_pct,
        AVG(passo_sondagem) * 100 as sondagem_pct,
        AVG(passo_necessidade) * 100 as necessidade_pct,
        AVG(passo_cvb) * 100 as cvb_pct,
        AVG(passo_fechamento) * 100 as fechamento_pct,
        AVG(passo_encerramento) * 100 as encerramento_pct,
        AVG(nota_total) as nota_media
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY vendedor_id, vendedor_nome
      ORDER BY nota_media DESC
    `;

    // Exemplos de atendimento (melhor e pior)
    const exemplosQuery = sql`
      SELECT 
        vendedor_nome,
        nota_total,
        observacao,
        proximo_passo,
        contact_name,
        data::text as data
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY nota_total DESC
      LIMIT 3
    `;

    const piorQuery = sql`
      SELECT 
        vendedor_nome,
        nota_total,
        observacao,
        proximo_passo,
        contact_name,
        data::text as data
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY nota_total ASC
      LIMIT 3
    `;

    // Clientes aguardando resposta
    const silencioQuery = sql`
      SELECT COUNT(*) as count
      FROM classification_logs
      WHERE classificacao = 'silencio'
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

    // Estatísticas gerais
    const statsQuery = sql`
      SELECT 
        COUNT(*) as total_auditado,
        AVG(nota_total) as nota_geral,
        COUNT(CASE WHEN nota_total >= 4 THEN 1 END) as acima_meta
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '7 days'
    `;

    const [coaching, melhores, piores, silencio, stats] = await Promise.all([
      coachingQuery,
      exemplosQuery,
      piorQuery,
      silencioQuery,
      statsQuery
    ]);

    // Calcular insights
    const insights = generateInsights(coaching, stats[0]);

    return NextResponse.json({
      success: true,
      stats: {
        totalAuditado: Number(stats[0]?.total_auditado || 0),
        notaGeral: Number(stats[0]?.nota_geral || 0).toFixed(1),
        acimaMeta: Number(stats[0]?.acima_meta || 0),
        clientesAguardando: Number(silencio[0]?.count || 0),
      },
      coaching: coaching.map((c: any) => ({
        vendedorId: c.vendedor_id,
        vendedorNome: c.vendedor_nome,
        totalAtendimentos: Number(c.total_atendimentos),
        notaMedia: Number(c.nota_media).toFixed(1),
        passos: {
          acolhimento: Math.round(Number(c.acolhimento_pct || 0)),
          sondagem: Math.round(Number(c.sondagem_pct || 0)),
          necessidade: Math.round(Number(c.necessidade_pct || 0)),
          cvb: Math.round(Number(c.cvb_pct || 0)),
          fechamento: Math.round(Number(c.fechamento_pct || 0)),
          encerramento: Math.round(Number(c.encerramento_pct || 0)),
        }
      })),
      exemplos: {
        melhores: melhores.map((m: any) => ({
          vendedor: m.vendedor_nome,
          nota: m.nota_total,
          cliente: m.contact_name,
          observacao: m.observacao,
          data: m.data
        })),
        piores: piores.map((p: any) => ({
          vendedor: p.vendedor_nome,
          nota: p.nota_total,
          cliente: p.contact_name,
          observacao: p.observacao,
          data: p.data
        }))
      },
      insights,
      recommendations: generateRecommendations(coaching),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Coaching API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateInsights(coaching: any[], stats: any): any[] {
  const insights = [];

  // Nota geral
  const notaGeral = Number(stats?.nota_geral || 0);
  if (notaGeral < 3) {
    insights.push({
      tipo: 'alerta',
      mensagem: `Nota geral de ${notaGeral.toFixed(1)}/6 está abaixo da meta. Treinamento urgente necessário.`
    });
  }

  // Passo mais fraco
  let passoMaisFracoPct = 100;
  let passoMaisFracoNome = '';
  let passoMaisFracoVendedor = '';
  
  for (const curr of coaching) {
    const passos = curr.passos;
    for (const [key, value] of Object.entries(passos)) {
      const numValue = Number(value) || 0;
      if (numValue < passoMaisFracoPct) {
        passoMaisFracoPct = numValue;
        passoMaisFracoNome = key;
        passoMaisFracoVendedor = curr.vendedorNome;
      }
    }
  }

  if (passoMaisFracoPct < 50) {
    insights.push({
      tipo: 'melhoria',
      mensagem: `Passo "${passoMaisFracoNome}" está com ${passoMaisFracoPct}% em ${passoMaisFracoVendedor}. Priorizar treinamento.`
    });
  }

  return insights;
}

function generateRecommendations(coaching: any[]): string[] {
  const recs: string[] = [];

  if (coaching.length === 0) return recs;

  const melhor = coaching.reduce((a: any, b: any) => 
    Number(a.notaMedia) > Number(b.notaMedia) ? a : b
  );

  const pior = coaching.reduce((a: any, b: any) => 
    Number(a.notaMedia) < Number(b.notaMedia) ? a : b
  );

  recs.push(`${melhor.vendedorNome} tem a melhor nota (${melhor.notaMedia}/6). Considerar usar como exemplo para a equipe.`);
  recs.push(`${pior.vendedorNome} precisa de atenção (${pior.notaMedia}/6). Agendar coaching individual.`);

  // CVB geralmente é fraco
  const cvbMedio = coaching.reduce((sum: number, c: any) => sum + c.passos.cvb, 0) / coaching.length;
  if (cvbMedio < 40) {
    recs.push('Apresentação de CVB (Característica + Vantagem + Benefício) está baixa em toda equipe. Workshop recomendado.');
  }

  // Sondagem
  const sondagemMedia = coaching.reduce((sum: number, c: any) => sum + c.passos.sondagem, 0) / coaching.length;
  if (sondagemMedia < 50) {
    recs.push('Sondagem precisa melhorar. Treinar vendedores a fazer mais perguntas abertas.');
  }

  return recs;
}
