import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    // Fetch contacts com situacao_comercial
    const contacts = await sql`SELECT * FROM contacts WHERE situacao_comercial IS NOT NULL AND situacao_comercial != ''`;

    // Agrupar por situacao_comercial
    const agrupado: Record<string, { count: number; contacts: Array<{ id: string; name: string; email: string }> }> = {};
    
    for (const c of contacts || []) {
      const situacao = c.situacao_comercial || 'Sem situação';
      if (!agrupado[situacao]) {
        agrupado[situacao] = { count: 0, contacts: [] };
      }
      agrupado[situacao].count++;
      agrupado[situacao].contacts.push({
        id: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sem nome',
        email: c.email || '',
      });
    }

    // Converter para array ordenável
    const resultado = Object.entries(agrupado)
      .map(([situacao, data]) => ({
        situacao,
        count: data.count,
        percentage: contacts?.length ? Math.round((data.count / contacts.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      total: contacts?.length || 0,
      breakdown: resultado,
    });

  } catch (error) {
    console.error('API /api/situacao error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
