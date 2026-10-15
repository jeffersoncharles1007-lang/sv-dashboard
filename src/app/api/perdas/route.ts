import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    // Buscar contacts com tags de perda
    const contacts = await sql`SELECT id, first_name, last_name, email, tags FROM contacts`;

    // Motivos de perda (tags)
    const perdaTags = [
      'perda concorrencia',
      'perda_preco',
      'perda preço',
      'perda prazo pagamento',
      'perda prazo',
      'perda qualidade',
      'perda especificação',
      'desistiu',
      'sem retorno',
      'orcamento recusado',
    ];

    // Agrupar por motivo de perda
    const motivos: Record<string, number> = {};
    let semMotivo = 0;

    for (const c of contacts || []) {
      const tags = (c.tags || []).map((t: string) => t.toLowerCase());
      
      let encontrouPerda = false;
      for (const tag of tags) {
        for (const motivo of perdaTags) {
          if (tag.includes(motivo.toLowerCase()) || tag === motivo.toLowerCase()) {
            motivos[motivo] = (motivos[motivo] || 0) + 1;
            encontrouPerda = true;
            break;
          }
        }
        if (encontrouPerda) break;
      }
      
      if (!encontrouPerda && tags.some((t: string) => t.includes('perda') || t.includes('lost'))) {
        motivos['Outros'] = (motivos['Outros'] || 0) + 1;
      }
    }

    // Converter para array ordenável
    const resultado = Object.entries(motivos)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count);

    const total = resultado.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      total,
      breakdown: resultado,
    });

  } catch (error) {
    console.error('API /api/perdas error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
