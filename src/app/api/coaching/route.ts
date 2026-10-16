/**
 * API DE COACHING - SV ELÉTRICA
 * Retorna relatório de auditoria por vendedor
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    // Query principal
    const coachingResult = await sql`
      SELECT 
        COALESCE(vendedor_nome, 'Desconhecido') as vendedor_nome,
        COUNT(*) as total_atendimentos,
        ROUND(AVG(passo_acolhimento) * 100) as acolhimento,
        ROUND(AVG(passo_sondagem) * 100) as sondagem,
        ROUND(AVG(passo_necessidade) * 100) as necessidade,
        ROUND(AVG(passo_cvb) * 100) as cvb,
        ROUND(AVG(passo_fechamento) * 100) as fechamento,
        ROUND(AVG(passo_encerramento) * 100) as encerramento,
        ROUND(AVG(nota_total)::numeric, 1) as nota_media
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY vendedor_nome
      ORDER BY nota_media DESC NULLS LAST
    `;

    // Stats gerais
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total,
        ROUND(AVG(nota_total)::numeric, 1) as nota_geral,
        COUNT(CASE WHEN nota_total >= 4 THEN 1 END) as acima_meta
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
    `;

    // Silêncios
    const silencioResult = await sql`
      SELECT COUNT(*) as count FROM classification_logs
      WHERE classificacao = 'silencio'
    `;

    // Exemplos melhores
    const melhoresResult = await sql`
      SELECT 
        vendedor_nome,
        nota_total,
        observacao,
        contact_name
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
      AND observacao IS NOT NULL
      ORDER BY nota_total DESC
      LIMIT 3
    `;

    // Exemplos piores
    const pioresResult = await sql`
      SELECT 
        vendedor_nome,
        nota_total,
        observacao,
        contact_name
      FROM atendimento_audit
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
      AND observacao IS NOT NULL
      ORDER BY nota_total ASC
      LIMIT 3
    `;

    const stats = statsResult[0] || { total: 0, nota_geral: 0, acima_meta: 0 };

    return NextResponse.json({
      success: true,
      stats: {
        totalAuditado: Number(stats.total) || 0,
        notaGeral: String(stats.nota_geral) || '0',
        acimaMeta: Number(stats.acima_meta) || 0,
        clientesAguardando: Number(silencioResult[0]?.count) || 0,
      },
      coaching: coachingResult.map((c: any) => ({
        vendedorNome: c.vendedor_nome,
        totalAtendimentos: Number(c.total_atendimentos),
        notaMedia: String(c.nota_media),
        passos: {
          acolhimento: Number(c.acolhimento) || 0,
          sondagem: Number(c.sondagem) || 0,
          necessidade: Number(c.necessidade) || 0,
          cvb: Number(c.cvb) || 0,
          fechamento: Number(c.fechamento) || 0,
          encerramento: Number(c.encerramento) || 0,
        }
      })),
      exemplos: {
        melhores: melhoresResult.map((m: any) => ({
          vendedor: m.vendedor_nome,
          nota: m.nota_total,
          cliente: m.contact_name,
          observacao: m.observacao,
        })),
        piores: pioresResult.map((p: any) => ({
          vendedor: p.vendedor_nome,
          nota: p.nota_total,
          cliente: p.contact_name,
          observacao: p.observacao,
        }))
      },
      recommendations: generateRecommendations(coachingResult),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Coaching API error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

function generateRecommendations(coaching: any[]): string[] {
  const recs: string[] = [];
  
  if (!coaching || coaching.length === 0) {
    return ['Nenhum dado de coaching disponível'];
  }

  // Melhor e pior
  const melhor = coaching[0];
  const pior = coaching[coaching.length - 1];
  
  recs.push(`${melhor?.vendedor_nome || 'Vendedor'} tem a melhor nota (${melhor?.nota_media || 0}/6).`);
  recs.push(`${pior?.vendedor_nome || 'Vendedor'} precisa de atenção (${pior?.nota_media || 0}/6).`);

  // CVB baixo
  const cvbMedio = coaching.reduce((sum: number, c: any) => sum + Number(c.cvb || 0), 0) / coaching.length;
  if (cvbMedio < 40) {
    recs.push('CVB (Característica + Vantagem + Benefício) está baixo. Workshop recomendado.');
  }

  // Sondagem baixa
  const sondagemMedia = coaching.reduce((sum: number, c: any) => sum + Number(c.sondagem || 0), 0) / coaching.length;
  if (sondagemMedia < 50) {
    recs.push('Sondagem precisa melhorar em toda equipe.');
  }

  return recs;
}
