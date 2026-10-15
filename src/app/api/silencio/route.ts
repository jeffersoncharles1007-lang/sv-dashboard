import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    // Buscar contacts que estão em silêncio
    const contacts = await sql`
      SELECT * FROM contacts 
      WHERE resultado_ultimo_contato = 'silencio' OR resultado_ultimo_contato = 'silêncio'
    `;

    // Também buscar todos os contacts para filtrar por tags
    const allContacts = await sql`SELECT * FROM contacts`;

    // Filtrar por tags de silêncio
    const silencioTags = ['parou responder', 'silencio', 'silêncio', 'sem retorno', 'sem resposta'];
    const silencioPorTag = (allContacts || []).filter((c: any) => {
      const tags = (c.tags || []).map((t: string) => t.toLowerCase());
      return tags.some((t: string) => 
        silencioTags.some(st => t.includes(st) || t === st)
      );
    });

    // Combinar e dedup
    const todosSilencio = new Map();
    
    for (const c of contacts || []) {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sem nome';
      todosSilencio.set(c.id, {
        id: c.id,
        name,
        email: c.email || '',
        phone: c.phone || '',
        motivo: c.resultado_ultimo_contato || 'Tag silêncio',
        prioridade: c.lead_prioridade || 'media',
        situacao: c.situacao_comercial || 'Não definido',
        lastSynced: c.last_synced_at,
      });
    }
    
    for (const c of silencioPorTag) {
      if (!todosSilencio.has(c.id)) {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sem nome';
        todosSilencio.set(c.id, {
          id: c.id,
          name,
          email: c.email || '',
          phone: c.phone || '',
          motivo: 'Tag: ' + ((c.tags || []).find((t: string) => 
            silencioTags.some(st => t.toLowerCase().includes(st))
          ) || 'silêncio'),
          prioridade: c.lead_prioridade || 'media',
          situacao: c.situacao_comercial || 'Não definido',
          lastSynced: c.last_synced_at,
        });
      }
    }

    // Converter para array e ordenar por prioridade
    const prioridadeOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
    const resultado = Array.from(todosSilencio.values())
      .sort((a, b) => {
        const pA = prioridadeOrder[a.prioridade as keyof typeof prioridadeOrder] ?? 1;
        const pB = prioridadeOrder[b.prioridade as keyof typeof prioridadeOrder] ?? 1;
        return pA - pB;
      });

    return NextResponse.json({
      total: resultado.length,
      clientes: resultado,
    });

  } catch (error) {
    console.error('API /api/silencio error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
