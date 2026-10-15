import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

// Vendedores known
const VENDEDORES = ['emily', 'katherine', 'eduardo-pereira', 'crisostomo', 'angelo'];

export async function GET() {
  try {
    // Buscar contacts com tags de vendedor
    const contacts = await sql`SELECT * FROM contacts`;

    // Buscar oportunidades para calcular performance
    const opportunities = await sql`SELECT * FROM opportunities`;

    // Agrupar por vendedor
    const desempenho: Record<string, {
      totalContacts: number;
      emNegociacao: number;
      ganhos: number;
      perdidos: number;
      valorTotal: number;
      valorGanho: number;
    }> = {};

    for (const v of VENDEDORES) {
      desempenho[v] = {
        totalContacts: 0,
        emNegociacao: 0,
        ganhos: 0,
        perdidos: 0,
        valorTotal: 0,
        valorGanho: 0,
      };
    }

    // Processar contacts por vendedor (via tags)
    for (const c of contacts || []) {
      const tags = (c.tags || []).map((t: string) => t.toLowerCase());
      
      for (const tag of tags) {
        for (const vendedor of VENDEDORES) {
          if (tag.includes(vendedor.toLowerCase())) {
            desempenho[vendedor].totalContacts++;
            
            if (c.situacao_comercial === 'Em Negociação') {
              desempenho[vendedor].emNegociacao++;
            }
            break;
          }
        }
      }
    }

    // Processar oportunidades por vendedor
    for (const opp of opportunities || []) {
      // Extrair vendedor das tags do contact relacionado
      const contact = contacts?.find((c: any) => c.id === opp.contact_id);
      if (!contact) continue;
      
      const tags = (contact.tags || []).map((t: string) => t.toLowerCase());
      
      for (const tag of tags) {
        for (const vendedor of VENDEDORES) {
          if (tag.includes(vendedor.toLowerCase())) {
            desempenho[vendedor].valorTotal += opp.monetary_value || 0;
            
            if (opp.status === 'won') {
              desempenho[vendedor].ganhos++;
              desempenho[vendedor].valorGanho += opp.monetary_value || 0;
            } else if (opp.status === 'lost') {
              desempenho[vendedor].perdidos++;
            }
            break;
          }
        }
      }
    }

    // Converter para array com ranking
    const resultado = Object.entries(desempenho)
      .map(([vendedor, data]) => ({
        vendedor,
        ...data,
        taxaConversao: data.ganhos + data.perdidos > 0 
          ? Math.round((data.ganhos / (data.ganhos + data.perdidos)) * 100) 
          : 0,
      }))
      .sort((a, b) => b.valorGanho - a.valorGanho);

    return NextResponse.json({
      vendedores: resultado,
    });

  } catch (error) {
    console.error('API /api/vendedores error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
