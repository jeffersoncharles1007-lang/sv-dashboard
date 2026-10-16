/**
 * BACKFILL DO AGENTE - SV ELÉTRICA
 * 
 * Classifica conversas de um período específico
 * Útil para preencher dados históricos
 */

import { NextResponse } from 'next/server';
import { sql, logClassification } from '@/lib/postgres';
import ghl from '@/lib/ghl-unified';

// Configuração API kpalabz
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'sk-kpa-05e4a8413c78de7308568ec219b86e3820038e9c2f8e5c9db3bc8ca4ef2742c7';
const API_BASE = 'https://api.kpalabz.com/v1';

interface ClassificationResult {
  resultado: 'pergunta' | 'reclamacao' | 'intencao_compra' | 'encerramento' | 'silencio';
  temperatura: 'quente' | 'morno' | 'frio';
  prioridade: 'alta' | 'media' | 'baixa';
  observacao: string;
  proximoPasso: string;
}

// ============================================
// CLASSIFICAÇÃO VIA IA
// ============================================

async function classifyWithAI(conversationId: string, messages: any[], contactName: string): Promise<ClassificationResult> {
  const msgList = messages.slice(-10).map((m: any, i: number) => {
    const dir = m.direction === 'inbound' ? 'CLIENTE' : 'VENDEDOR';
    return `[${i + 1}] ${dir}: ${m.body || m.text || ''}`;
  }).join('\n');

  const prompt = `Você é um assistente de análise de conversas comerciais para a SV Elétrica (distribuidora de material elétrico em Fortaleza/CE).

Analise a seguinte conversa e classifique:

CLIENTE: ${contactName || 'Desconhecido'}

CONVERSA:
${msgList}

Responda APENAS com JSON válido (sem markdown, sem texto extra):
{
  "resultado": "pergunta|reclamacao|intencao_compra|encerramento|silencio",
  "temperatura": "quente|morno|frio",
  "prioridade": "alta|media|baixa",
  "observacao": "Resumo breve do que aconteceu (max 200 chars)",
  "proximoPasso": "O que fazer a seguir (max 100 chars)"
}

REGRAS:
- pergunta: cliente fez pergunta, quer saber algo
- reclamacao: cliente reclamou de algo (atraso, erro, problema)
- intencao_compra: cliente demonstrou intenção de comprar ("vou buscar", "manda orçamento", "fechado")
- encerramento: conversa terminou sem intenção clara (ok, obrigado, emoji)
- silencio: vendedor mandou mensagem mas cliente não respondeu

- quente: urgência, obra em andamento, pedido recorrente
- morno: interesse moderado, sem pressa
- frio: sem interesse aparente, apenas pesquisando

- alta: obra em andamento, cliente recorrente, pedido urgente
- media: interesse normal
- baixa: apenas pesquisando, sem urgência`;

  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    
    return {
      resultado: result.resultado || 'silencio',
      temperatura: result.temperatura || 'morno',
      prioridade: result.prioridade || 'media',
      observacao: result.observacao || '',
      proximoPasso: result.proximoPasso || '',
    };
  } catch (error) {
    console.error('AI error:', error);
    return classifyByKeywords(messages);
  }
}

// Fallback: classificação por keywords
function classifyByKeywords(messages: any[]): ClassificationResult {
  const lastClientMsg = [...messages].reverse().find((m: any) => m.direction === 'inbound');
  const lastClientText = (lastClientMsg?.body || lastClientMsg?.text || '').toLowerCase();

  let resultado: ClassificationResult['resultado'] = 'silencio';
  let temperatura: ClassificationResult['temperatura'] = 'morno';
  let prioridade: ClassificationResult['prioridade'] = 'media';

  if (/\b(vou|manda|fechado|aprovado|quanto|preço|orçamento|pix|buscar|retirar)\b/.test(lastClientText)) {
    resultado = 'intencao_compra';
    temperatura = 'quente';
    prioridade = 'alta';
  } else if (/\b(demora|errado|atraso|não recebi|problema|reclam)\b/.test(lastClientText)) {
    resultado = 'reclamacao';
    temperatura = 'quente';
    prioridade = 'alta';
  } else if (/\b(quanto|tem|posso|preciso|queria|como|qual|onde|pode)\b/.test(lastClientText)) {
    resultado = 'pergunta';
  } else if (/\b(ok|obrigado|obrigada|valeu|flw|até|tchau|abs)\b/.test(lastClientText)) {
    resultado = 'encerramento';
  } else if (!lastClientMsg) {
    resultado = 'silencio';
    temperatura = 'frio';
  }

  return {
    resultado,
    temperatura,
    prioridade,
    observacao: `Classificação por keywords: ${resultado}`,
    proximoPasso: resultado === 'silencio' ? 'Aguardar retorno ou remarcar contato' : 'Aguardar próximo contato',
  };
}

// ============================================
// BUSCAR MENSAGENS
// ============================================

async function getConversationMessages(conversationId: string): Promise<any[]> {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_BASE = 'https://services.leadconnectorhq.com';
  
  try {
    const url = `${GHL_BASE}/conversations/${conversationId}/messages`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) return [];
    
    const data = await res.json();
    const messages = data.messages?.messages || [];
    
    return messages.filter((m: any) => {
      const body = m.body || '';
      return body && 
        !body.includes('AD MESSAGE') &&
        !body.includes('Mensagem apagada') &&
        !body.includes('Source: adm') &&
        !body.includes('Mensagem de áudio');
    }).map((m: any) => ({
      direction: m.direction,
      body: m.body,
      text: m.body,
      date: m.createdAt,
    }));
  } catch {
    return [];
  }
}

// ============================================
// ATUALIZAR GHL
// ============================================

async function updateGHLContact(contactId: string, classification: ClassificationResult): Promise<void> {
  try {
    // Atualizar custom fields
    await ghl.updateContactFields(contactId, [
      { id: 'Kc4ENLzVzFPLEPfouWBp', field_value: classification.resultado },
      { id: 'viaIw2ZnxFhTimCocmyL', field_value: classification.prioridade },
    ]);

    // Atualizar temperatura via tags
    const tempTags: Record<string, string> = {
      'quente': 'qfLbiw7S900MmqmmsLJX',
      'morno': 'aCI120fxP59pepdClL9s',
      'frio': '5DvqBjxDfTQi6m8dNM4w',
    };

    // Remover tags antigas e adicionar nova
    for (const tagId of Object.values(tempTags)) {
      try { await ghl.removeContactTag(contactId, tagId); } catch {}
    }
    await ghl.addContactTags(contactId, [tempTags[classification.temperatura]]);

  } catch (error) {
    console.error('Error updating GHL:', error);
    throw error;
  }
}

// ============================================
// API ENDPOINT
// ============================================

export async function POST(request: Request) {
  const startTime = Date.now();
  const results = {
    processed: 0,
    success: 0,
    errors: [] as string[],
    byDate: {} as Record<string, number>,
  };

  try {
    // Parsear datas do request
    const body = await request.json().catch(() => ({}));
    const startDate = body.startDate ? new Date(body.startDate) : new Date('2024-10-01');
    const endDate = body.endDate ? new Date(body.endDate) : new Date();
    
    // Ajustar endDate para fim do dia
    endDate.setHours(23, 59, 59, 999);

    console.log(`[BACKFILL] Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Buscar conversas do período no banco
    const conversations = await sql`
      SELECT 
        c.id, c.ghl_id, c.contact_id, c.contact_name, 
        c.assigned_to, c.last_message, c.last_message_date,
        c.last_synced_at
      FROM conversations c
      WHERE (c.last_message_date BETWEEN ${startDate} AND ${endDate})
         OR (c.last_synced_at BETWEEN ${startDate} AND ${endDate})
      ORDER BY c.last_message_date DESC
      LIMIT 500
    `;

    console.log(`[BACKFILL] Found ${conversations.length} conversations`);

    for (const conv of conversations) {
      try {
        // Verificar se já foi classificado recentemente
        const existingClass = await sql`
          SELECT id FROM classification_logs 
          WHERE contact_id = ${conv.contact_id || conv.id}
          AND created_at > ${startDate}
          LIMIT 1
        `;
        
        if (existingClass.length > 0) {
          console.log(`[BACKFILL] Skipping ${conv.id} - already classified`);
          continue;
        }

        // 1. Buscar mensagens
        const messages = await getConversationMessages(conv.id);
        
        if (messages.length === 0) {
          console.log(`[BACKFILL] No messages for ${conv.id}`);
          continue;
        }

        // 2. Classificar via IA
        const classification = await classifyWithAI(conv.id, messages, conv.contact_name);
        
        // 3. Atualizar GHL
        if (conv.contact_id) {
          await updateGHLContact(conv.contact_id, classification);
        }

        // 4. Registrar log
        await logClassification(
          conv.contact_id || conv.id,
          conv.id,
          classification.resultado,
          classification.temperatura,
          classification.prioridade,
          messages[messages.length - 1]?.body || ''
        );

        // 5. Contar por data
        const msgDate = new Date(conv.last_message_date || conv.last_synced_at);
        const dateKey = msgDate.toISOString().split('T')[0];
        results.byDate[dateKey] = (results.byDate[dateKey] || 0) + 1;

        results.success++;
        console.log(`[BACKFILL] ${conv.id} → ${classification.resultado} (${classification.temperatura})`);

      } catch (error) {
        const msg = `Error ${conv.id}: ${error}`;
        console.error(`[BACKFILL] ${msg}`);
        results.errors.push(msg);
      }
      results.processed++;
    }

    const duration = Date.now() - startTime;
    console.log(`[BACKFILL] Complete: ${results.success}/${results.processed} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      ...results,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[BACKFILL] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...results,
    }, { status: 500 });
  }
}

// GET: Status do backfill
export async function GET() {
  try {
    // Estatísticas por dia
    const stats = await sql`
      SELECT 
        DATE(created_at) as data,
        classificacao,
        COUNT(*) as count
      FROM classification_logs
      WHERE created_at > '2024-10-01'
      GROUP BY DATE(created_at), classificacao
      ORDER BY data DESC
      LIMIT 100
    `;

    // Total por classificação
    const totals = await sql`
      SELECT 
        classificacao,
        COUNT(*) as count
      FROM classification_logs
      WHERE created_at > '2024-10-01'
      GROUP BY classificacao
    `;

    return NextResponse.json({
      stats,
      totals,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
