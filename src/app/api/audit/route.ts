/**
 * AUDITORIA DE ATENDIMENTO - SV ELÉTRICA
 * 
 * Função: Avaliar conversas do dia usando 6 passos da técnica de venda
 * - Lê conversas do dia
 * - Classifica tipo de conversa
 * - Avalia cada passo (1-6)
 * - Gera relatório
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';
import { USER_MAP } from '@/lib/constants';

interface ConversationWithMessages {
  id: string;
  contactId: string;
  contactName: string;
  assignedTo: string;
  messages: any[];
}

interface AuditResult {
  conversationId: string;
  contactName: string;
  vendedor: string;
  tipo: 'conversa_real' | 'sem_resposta' | 'resposta_bot' | 'mensagem_sistema' | 'abertura_cliente';
  passos: {
    acolhimento: number;
    sondagem: number;
    identificou: number;
    cvb: number;
    gatilho: number;
    encerrou: number;
  };
  total: number;
  observacao: string;
}

// ============================================
// ANALISAR CONVERSA
// ============================================

function analyzeConversation(conv: ConversationWithMessages): AuditResult {
  const messages = conv.messages;
  const vendedor = USER_MAP[conv.assignedTo] || conv.assignedTo || 'Desconhecido';
  
  // Juntar todas as mensagens do vendedor e cliente
  const vendedorMsgs = messages.filter((m: any) => m.direction === 'outbound').map((m: any) => m.body || m.text || '');
  const clienteMsgs = messages.filter((m: any) => m.direction === 'inbound').map((m: any) => m.body || m.text || '');
  
  const allVendedor = vendedorMsgs.join(' ').toLowerCase();
  const allCliente = clienteMsgs.join(' ').toLowerCase();
  const lastCliente = clienteMsgs[clienteMsgs.length - 1] || '';

  // 1. CLASSIFICAR TIPO DE CONVERSA
  let tipo: AuditResult['tipo'] = 'conversa_real';
  let observacao = '';

  if (messages.length === 0) {
    tipo = 'sem_resposta';
    observacao = 'Sem mensagens na conversa';
  } else if (clienteMsgs.length === 0) {
    tipo = 'sem_resposta';
    observacao = 'Vendedor enviou mensagem mas cliente não respondeu';
  } else if (
    /agradecemos|breve|entraremos|automático|responderemos/.test(lastCliente) ||
    lastCliente.includes('obrigado pelo contato') ||
    lastCliente.includes('em breve') ||
    lastCliente.includes('vamos verificar')
  ) {
    tipo = 'resposta_bot';
    observacao = 'Cliente recebeu auto-resposta, não houve interação real';
  } else if (
    lastCliente.includes('mensagem indisponível') ||
    lastCliente.includes('mensagem recebida mas meta marcou')
  ) {
    tipo = 'mensagem_sistema';
    observacao = 'Mensagem de sistema, não conta como interação real';
  } else if (
    /\b(quanto|tem|posso|preciso|queria|como|qual|onde|pode|olá|oi|bom dia|boa tarde)\b/.test(lastCliente)
  ) {
    tipo = 'abertura_cliente';
    observacao = 'Cliente iniciou conversa ou respondeu demonstrando interesse';
  } else {
    tipo = 'conversa_real';
    observacao = 'Conversa real com cliente';
  }

  // Se não é conversa real, retornar ZERO para todos
  if (tipo !== 'conversa_real' && tipo !== 'abertura_cliente') {
    return {
      conversationId: conv.id,
      contactName: conv.contactName || 'Desconhecido',
      vendedor,
      tipo,
      passos: { acolhimento: 0, sondagem: 0, identificou: 0, cvb: 0, gatilho: 0, encerrou: 0 },
      total: 0,
      observacao,
    };
  }

  // 2. AVALIAR 6 PASSOS
  let acolhimento = 0;
  let sondagem = 0;
  let identificou = 0;
  let cvb = 0;
  let gatilho = 0;
  let encerrou = 0;

  // PASSO 1: Acolhimento - Saudou?
  if (/\b(olá|oi|bom dia|boa tarde|boa noite|seja bem|como vai|como está)\b/.test(allVendedor)) {
    acolhimento = 1;
  }

  // PASSO 2: Sondagem - Fez perguntas para entender?
  if (/\b(qual|que|como|onde|quando|porque|quanto|material|produto|peça|obra|projeto|install)\b/.test(allVendedor) &&
      /\b(\?|qual é|me diz|precisa|você|tem)\b/.test(allVendedor)) {
    sondagem = 1;
  }

  // PASSO 3: Identificou necessidade - Entendeu o problema/peça correto?
  // Verificar se há menção de produto específico após perguntas
  const temPergunta = /\b(qual|que|como|onde|quando|porque|quanto)\b/.test(allVendedor);
  const temResposta = /\b(cabo|disjuntor|condutor|eletroduto|caixa|tomada|interruptor|quadro|barramento|fio|cordelete|rele|contator|transformador)\b/.test(allCliente);
  if (temPergunta && temResposta) {
    identificou = 1;
  }

  // PASSO 4: CVB - Característica + Vantagem + Benefício
  const temCaracteristica = /\b(é|sao|são|de|aqui|temos|oferece|tem)\b/.test(allVendedor) && /\b(ampere|volt|watt|bitola|mm|medida|especifica\w*|marca\w*|tipo|modelo)\b/.test(allVendedor);
  const temVantagem = /\b(aguenta|melhor|mais|pode|suporta|ideal|perfeito|durável|resistente)\b/.test(allVendedor);
  const temBeneficio = /\b(proteg|econom|segurança|funciona|resolve|ajuda|vai|gasta|poupa)\b/.test(allVendedor);
  if (temCaracteristica && temVantagem && temBeneficio) {
    cvb = 1;
  }

  // PASSO 5: Gatilho de fechamento - Pediu para fechar?
  if (/\b(separo|fecho|fechar|separar|encaminhar|manda|garanto|confirm|pedido|orçamento|proposta)\b/.test(allVendedor) &&
      /\b(vou|manda|fechar|confirm|encaminh|separ)\b/.test(allVendedor)) {
    gatilho = 1;
  }

  // PASSO 6: Encerrou com pergunta - Manteve aberta?
  if (/\b(quando|qual|como|vou|te ligo|retorno|amanhã|horário|melhor)\b/.test(allVendedor) &&
      /\b(ligar|retornar|confirm|verificar|vamos)\b/.test(allVendedor)) {
    encerrou = 1;
  }

  const total = acolhimento + sondagem + identificou + cvb + gatilho + encerrou;

  return {
    conversationId: conv.id,
    contactName: conv.contactName || 'Desconhecido',
    vendedor,
    tipo,
    passos: { acolhimento, sondagem, identificou, cvb, gatilho, encerrou },
    total,
    observacao,
  };
}

// ============================================
// MAIN AUDITORIA
// ============================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Buscar conversas do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conversations = await sql`
      SELECT 
        c.id, c.ghl_id, c.contact_id, c.contact_name, 
        c.assigned_to, c.last_message, c.last_message_date,
        c.messages_data
      FROM conversations c
      WHERE c.created_at > ${today}
         OR c.last_message_date > ${today}
      ORDER BY c.last_message_date DESC
      LIMIT 100
    `;

    console.log(`[AUDIT] Found ${conversations.length} conversations to audit`);

    // Analisar cada conversa
    const results: AuditResult[] = [];
    for (const conv of conversations) {
      const messages = conv.messages_data || [];
      const convWithMessages = {
        id: conv.id,
        contactId: conv.contact_id,
        contactName: conv.contact_name,
        assignedTo: conv.assigned_to,
        messages,
      };
      results.push(analyzeConversation(convWithMessages));
    }

    // 3. AGREGAR POR VENDEDOR
    const byVendedor: Record<string, {
      nome: string;
      conversas: number;
      reais: number;
      notaTotal: number;
      passos: { acolhimento: number; sondagem: number; identificou: number; cvb: number; gatilho: number; encerrou: number };
    }> = {};

    for (const r of results) {
      if (!byVendedor[r.vendedor]) {
        byVendedor[r.vendedor] = {
          nome: r.vendedor,
          conversas: 0,
          reais: 0,
          notaTotal: 0,
          passos: { acolhimento: 0, sondagem: 0, identificou: 0, cvb: 0, gatilho: 0, encerrou: 0 },
        };
      }
      byVendedor[r.vendedor].conversas++;
      if (r.tipo === 'conversa_real' || r.tipo === 'abertura_cliente') {
        byVendedor[r.vendedor].reais++;
        byVendedor[r.vendedor].notaTotal += r.total;
        byVendedor[r.vendedor].passos.acolhimento += r.passos.acolhimento;
        byVendedor[r.vendedor].passos.sondagem += r.passos.sondagem;
        byVendedor[r.vendedor].passos.identificou += r.passos.identificou;
        byVendedor[r.vendedor].passos.cvb += r.passos.cvb;
        byVendedor[r.vendedor].passos.gatilho += r.passos.gatilho;
        byVendedor[r.vendedor].passos.encerrou += r.passos.encerrou;
      }
    }

    // Calcular médias
    const vendedorStats = Object.values(byVendedor).map(v => ({
      nome: v.nome,
      conversas: v.conversas,
      reais: v.reais,
      notaMedia: v.reais > 0 ? Math.round((v.notaTotal / v.reais) * 10) / 10 : 0,
      passos: {
        acolhimento: v.reais > 0 ? Math.round((v.passos.acolhimento / v.reais) * 100) : 0,
        sondagem: v.reais > 0 ? Math.round((v.passos.sondagem / v.reais) * 100) : 0,
        identificou: v.reais > 0 ? Math.round((v.passos.identificou / v.reais) * 100) : 0,
        cvb: v.reais > 0 ? Math.round((v.passos.cvb / v.reais) * 100) : 0,
        gatilho: v.reais > 0 ? Math.round((v.passos.gatilho / v.reais) * 100) : 0,
        encerrou: v.reais > 0 ? Math.round((v.passos.encerrou / v.reais) * 100) : 0,
      },
    }));

    // 4. ESTATÍSTICAS GERAIS
    const totalConversas = results.length;
    const conversasReais = results.filter(r => r.tipo === 'conversa_real' || r.tipo === 'abertura_cliente').length;
    const semResposta = results.filter(r => r.tipo === 'sem_resposta').length;
    const respostaBot = results.filter(r => r.tipo === 'resposta_bot').length;
    const msgSistema = results.filter(r => r.tipo === 'mensagem_sistema').length;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      stats: {
        total: totalConversas,
        reais: conversasReais,
        semResposta,
        respostaBot,
        msgSistema,
        pctReais: totalConversas > 0 ? Math.round((conversasReais / totalConversas) * 100) : 0,
      },
      vendedores: vendedorStats,
      detalhes: results,
    });

  } catch (error) {
    console.error('[AUDIT] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET: Histórico de auditorias
export async function GET() {
  try {
    const audits = await sql`
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total,
        AVG(nota)::int as nota_media
      FROM audit_metrics
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY data DESC
      LIMIT 30
    `;

    return NextResponse.json({
      audits,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
