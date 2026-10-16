/**
 * AGENTE DE IA - SV ELÉTRICA
 * 
 * Função: Classifica conversas via OpenRouter
 * - Lê mensagens da conversa
 * - Classifica: pergunta, reclamacao, intencao_compra, encerramento, silencio
 * - Atualiza contact no GHL (customFields + tags)
 * - Registra log de classificação
 */

import { NextResponse } from 'next/server';
import { sql, logClassification } from '@/lib/postgres';
import ghl from '@/lib/ghl-unified';
import { OPENROUTER_API_KEY } from '@/lib/constants';

// Configuração OpenRouter
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ClassificationResult {
  resultado: 'pergunta' | 'reclamacao' | 'intencao_compra' | 'encerramento' | 'silencio';
  temperatura: 'quente' | 'morno' | 'frio';
  prioridade: 'alta' | 'media' | 'baixa';
  observacao: string;
  proximoPasso: string;
}

// ============================================
// OPENROUTER API
// ============================================

async function classifyWithAI(conversationId: string, messages: any[], contactName: string): Promise<ClassificationResult> {
  // Preparar mensagens para o prompt
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

- quente: urgência, obra em andamento, pedido recorrente,擬想买
- morno: interesse moderado, sem pressa
- frio: sem interesse aparente, apenas pesquisando

- alta: obra em andamento, cliente recorrente, pedido urgente
- media: interesse normal
- baixa: apenas pesquisando, sem urgência`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sv-dashboard.vercel.app',
        'X-Title': 'SV Dashboard Agent',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku-20240307',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Parse JSON da resposta
    const result = JSON.parse(content);
    
    return {
      resultado: result.resultado || 'silencio',
      temperatura: result.temperatura || 'morno',
      prioridade: result.prioridade || 'media',
      observacao: result.observacao || '',
      proximoPasso: result.proximoPasso || '',
    };
  } catch (error) {
    console.error('AI classification error:', error);
    // Fallback: classificação simples por keywords
    return classifyByKeywords(messages);
  }
}

// Fallback: classificação por palavras-chave
function classifyByKeywords(messages: any[]): ClassificationResult {
  const allText = messages.map((m: any) => (m.body || m.text || '').toLowerCase()).join(' ');
  
  // Verificar última mensagem do cliente
  const lastClientMsg = [...messages].reverse().find((m: any) => m.direction === 'inbound');
  const lastClientText = (lastClientMsg?.body || lastClientMsg?.text || '').toLowerCase();

  let resultado: ClassificationResult['resultado'] = 'silencio';
  let temperatura: ClassificationResult['temperatura'] = 'morno';
  let prioridade: ClassificationResult['prioridade'] = 'media';

  // Intenção de compra
  if (/\b(vou|manda|fechado|aprovado|quanto|preço|orçamento|pix|transferência|buscar|retirar)\b/.test(lastClientText)) {
    resultado = 'intencao_compra';
    temperatura = 'quente';
    prioridade = 'alta';
  }
  // Reclamação
  else if (/\b(demora|errado|atraso|não recebi|problema|reclam|insatisfeito)\b/.test(lastClientText)) {
    resultado = 'reclamacao';
    temperatura = 'quente';
    prioridade = 'alta';
  }
  // Pergunta
  else if (/\b(quanto|tem|posso|preciso|queria|como|qual|onde|pode)\b/.test(lastClientText)) {
    resultado = 'pergunta';
  }
  // Encerramento
  else if (/\b(ok|obrigado|obrigada|valeu|flw|até|tchau|abs)\b/.test(lastClientText)) {
    resultado = 'encerramento';
  }
  // Silêncio (vendedor falou mas cliente não respondeu)
  else if (lastClientMsg === undefined) {
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
// BUSCAR MENSAGENS DA CONVERSA
// ============================================

async function getConversationMessages(conversationId: string): Promise<any[]> {
  const API_BASE = 'https://services.leadconnectorhq.com';
  const headers = {
    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  };

  try {
    const url = `${API_BASE}/conversations/${conversationId}/messages`;
    const res = await fetch(url, { headers });
    
    if (!res.ok) return [];
    
    const data = await res.json();
    const messages = data.messages?.messages || [];
    
    // Filtrar mensagens reais
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
      { id: 'Kc4ENLzVzFPLEPfouWBp', field_value: classification.resultado }, // Resultado Ultimo Contato
      { id: 'viaIw2ZnxFhTimCocmyL', field_value: classification.prioridade }, // Lead Prioridade
    ]);

    // Atualizar temperatura via tags
    const tempTags: Record<string, string> = {
      'quente': 'qfLbiw7S900MmqmmsLJX',
      'morno': 'aCI120fxP59pepdClL9s',
      'frio': '5DvqBjxDfTQi6m8dNM4w',
    };

    // Remover tags de temperatura antigas e adicionar nova
    const oldTempTags = Object.values(tempTags);
    for (const tagId of oldTempTags) {
      try {
        await ghl.removeContactTag(contactId, tagId);
      } catch {}
    }
    await ghl.addContactTags(contactId, [tempTags[classification.temperatura]]);

  } catch (error) {
    console.error('Error updating GHL contact:', error);
    throw error;
  }
}

// ============================================
// MAIN AGENT
// ============================================

export async function POST(request: Request) {
  const startTime = Date.now();
  const results = {
    processed: 0,
    success: 0,
    errors: [] as string[],
    classifications: [] as { contactId: string; resultado: string; temperatura: string }[],
  };

  try {
    console.log('[AGENT] Starting conversation classification...');

    // 1. Buscar conversas do dia (últimas 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const conversations = await sql`
      SELECT 
        c.id, c.ghl_id, c.contact_id, c.contact_name, 
        c.assigned_to, c.last_message, c.last_message_date
      FROM conversations c
      WHERE c.last_message_date > ${yesterday}
         OR c.last_synced_at > ${yesterday}
      ORDER BY c.last_message_date DESC
      LIMIT 50
    `;

    console.log(`[AGENT] Found ${conversations.length} conversations to process`);

    for (const conv of conversations) {
      try {
        // 1. Buscar mensagens da conversa
        const messages = await getConversationMessages(conv.id);
        
        if (messages.length === 0) {
          console.log(`[AGENT] Skipping ${conv.id} - no messages`);
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

        results.success++;
        results.classifications.push({
          contactId: conv.contact_id || conv.id,
          resultado: classification.resultado,
          temperatura: classification.temperatura,
        });

      } catch (error) {
        const msg = `Error processing ${conv.id}: ${error}`;
        console.error(`[AGENT] ${msg}`);
        results.errors.push(msg);
      }
      results.processed++;
    }

    const duration = Date.now() - startTime;
    console.log(`[AGENT] Complete: ${results.success}/${results.processed} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      processed: results.processed,
      classified: results.success,
      errors: results.errors,
      classifications: results.classifications,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AGENT] Fatal error:', error);
    return NextResponse.json({
      success: false,
      processed: results.processed,
      classified: results.success,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET: Status do agente
export async function GET() {
  try {
    // Últimas classificações
    const recent = await sql`
      SELECT 
        cl.contact_id, cl.classificacao, cl.temperatura, cl.prioridade,
        cl.created_at, c.contact_name
      FROM classification_logs cl
      LEFT JOIN conversations c ON c.contact_id = cl.contact_id
      ORDER BY cl.created_at DESC
      LIMIT 20
    `;

    // Estatísticas do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await sql`
      SELECT 
        classificacao,
        COUNT(*) as count
      FROM classification_logs
      WHERE created_at > ${today}
      GROUP BY classificacao
    `;

    return NextResponse.json({
      recentClassifications: recent,
      todayStats: stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
