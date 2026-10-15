/**
 * AGENTE DE IA — Classificador de Conversas SV Elétrica
 * 
 * Este endpoint é o "cérebro" do sistema:
 * 1. Busca conversas do dia anterior
 * 2. Classifica cada conversa por intenção
 * 3. Define temperatura (quente/morno/frio)
 * 4. Define prioridade (alta/media/baixa)
 * 5. Atualiza o contato no banco
 * 6. Loga o resultado
 * 
 * Schedule: Rodar todo dia às 07:00 via Vercel Cron
 */

import { NextResponse } from 'next/server';
import { fetchConversations } from '@/lib/ghl';
import { sql, getConversations, upsertContact, logClassification } from '@/lib/postgres';

export const maxDuration = 300; // 5 minutes

// ============================================
// TIPOS
// ============================================
type Classificacao = 'pergunta' | 'intencao_compra' | 'reclamacao' | 'agendamento' | 'desistencia' | 'neutro' | 'sem_resposta';
type Temperatura = 'quente' | 'morno' | 'frio' | 'parou';
type Prioridade = 'alta' | 'media' | 'baixa';

// ============================================
// REGRAS DE CLASSIFICAÇÃO (Rule-Based)
// ============================================

const KEYWORDS = {
  intencao_compra: [
    'quero', 'preciso', 'gostaria', 'orçamento', 'comprar', 'preço', 'cotação',
    'quanto custa', 'fazer pedido', 'encomendar', 'reservar', 'ter o produto',
    'tem disponível', 'em estoque', 'melhor preço', 'menor preço', 'desconto'
  ],
  pergunta: [
    '?', 'como', 'quando', 'onde', 'qual', 'quanto', 'porque', 'por quê',
    'o que é', 'o que são', 'me explique', 'gostaria de saber', 'poderia me dizer',
    'vocês fazem', 'existe', 'há', 'tem como', 'será que'
  ],
  reclamacao: [
    'problema', 'não recebi', 'atrasado', 'erro', 'reclamação', 'reclamar',
    'insatisfeito', 'decepcionado', 'não gostei', 'veio errado', 'falta',
    'não funcionou', 'quebrou', 'danificado', 'não chegou', 'extraviado'
  ],
  agendamento: [
    'agendar', 'visitar', 'retorno', 'encontro', 'reunião', 'buscar',
    'passar ai', 'passar aí', 'ir até', 'horário', 'agendamento'
  ],
  desistencia: [
    'desisti', 'cancela', 'não preciso mais', 'mudei de ideia', 'desistiu',
    'cancelei', 'não vou', 'outro lugar', 'encontrei outro', 'comprei em outro'
  ]
};

const SILENCIO_DIAS = 7;
const PAROU_DIAS = 14;

// ============================================
// FUNÇÕES DE CLASSIFICAÇÃO
// ============================================

function classificarIntencao(mensagem: string, isInbound: boolean): Classificacao {
  if (!isInbound) return 'sem_resposta';
  
  const msg = mensagem.toLowerCase().trim();
  if (!msg) return 'sem_resposta';

  // Verificar desistencia primeiro (mais específico)
  if (KEYWORDS.desistencia.some(k => msg.includes(k))) return 'desistencia';
  
  // Verificar reclamacao
  if (KEYWORDS.reclamacao.some(k => msg.includes(k))) return 'reclamacao';
  
  // Verificar agendamento
  if (KEYWORDS.agendamento.some(k => msg.includes(k))) return 'agendamento';
  
  // Verificar intenção de compra
  if (KEYWORDS.intencao_compra.some(k => msg.includes(k))) return 'intencao_compra';
  
  // Verificar pergunta
  if (KEYWORDS.pergunta.some(k => msg.includes(k)) || msg.includes('?')) return 'pergunta';
  
  return 'neutro';
}

function calcularTemperatura(classificacao: Classificacao, diasSemResposta: number): Temperatura {
  // Se parou de responder
  if (diasSemResposta >= PAROU_DIAS) return 'parou';
  if (diasSemResposta >= SILENCIO_DIAS) return 'frio';
  
  // Baseado na classificação
  switch (classificacao) {
    case 'intencao_compra':
    case 'pergunta':
      return 'quente';
    case 'agendamento':
      return 'morno';
    case 'reclamacao':
      return 'morno'; // Reclamação pode virar venda se resolver bem
    case 'desistencia':
      return 'frio';
    default:
      return 'morno';
  }
}

function calcularPrioridade(classificacao: Classificacao, temperatura: Temperatura): Prioridade {
  if (classificacao === 'intencao_compra' || temperatura === 'quente') {
    return 'alta';
  }
  if (classificacao === 'pergunta' || classificacao === 'reclamacao') {
    return 'media';
  }
  return 'baixa';
}

function getTagTemperatura(temperatura: Temperatura): string {
  switch (temperatura) {
    case 'quente': return 'status quente';
    case 'morno': return 'status morno';
    case 'frio': return 'status frio';
    case 'parou': return 'sv-parou';
  }
}

function getTextoResultado(classificacao: Classificacao): string {
  switch (classificacao) {
    case 'pergunta': return 'pergunta';
    case 'intencao_compra': return 'intencao_compra';
    case 'reclamacao': return 'reclamacao';
    case 'agendamento': return 'agendamento';
    case 'desistencia': return 'desistencia';
    case 'neutro': return 'neutro';
    case 'sem_resposta': return 'sem_resposta';
  }
}

// ============================================
// TAG MAP (vendor name → tag)
// ============================================
const TAG_MAP: Record<string, string[]> = {
  'emily': ['emily', 'emily viana'],
  'katherine': ['katherine', 'katherine camara'],
  'eduardo-pereira': ['eduardo-pereira', 'eduardo pereira'],
  'eduardo-crisostomo': ['crisostomo', 'eduardo crisostomo'],
  'crisostomo': ['crisostomo', 'eduardo crisostomo'],
  'angelo': ['angelo', 'angelo carioca'],
  'ferencia': ['mercia', 'mercia almeida'],
  'mercia': ['mercia', 'mercia almeida'],
};

function getVendorTag(vendorName: string): string[] {
  const nameLower = vendorName.toLowerCase();
  for (const [key, tags] of Object.entries(TAG_MAP)) {
    if (nameLower.includes(key)) return tags;
  }
  return [];
}

// ============================================
// ENDPOINT PRINCIPAL
// ============================================
export async function POST() {
  const startTime = Date.now();
  const result = {
    processed: 0,
    classified: 0,
    updated: 0,
    errors: 0,
    byClassification: {} as Record<string, number>,
    byTemperature: {} as Record<string, number>,
  };

  try {
    // 1. Buscar conversas do GHL
    const conversations = await fetchConversations();
    
    // 2. Buscar conversas já salvas do banco
    const dbConversations = await getConversations();
    const dbConvMap = new Map(dbConversations.map((c: any) => [c.ghl_id || c.id, c]));

    // 3. Processar cada conversa
    const hoje = new Date();
    const umaSemanaAtras = new Date(hoje);
    umaSemanaAtras.setDate(hoje.getDate() - 7);

    for (const conv of conversations) {
      result.processed++;

      try {
        // Pular conversas sem contato
        if (!conv.contactId) continue;

        // Obter data da última mensagem
        const lastMessageDate = conv.lastMessageDate 
          ? new Date(conv.lastMessageDate) 
          : new Date();
        
        // Verificar se é inbound (cliente falou)
        const isInbound = !!(conv.lastMessage && !conv.lastMessage.includes('Você:'));
        
        // Classificar intenção
        const classificacao = classificarIntencao(conv.lastMessage || '', isInbound);
        
        // Calcular dias sem resposta
        const diffTime = Math.abs(hoje.getTime() - lastMessageDate.getTime());
        const diasSemResposta = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calcular temperatura e prioridade
        const temperatura = calcularTemperatura(classificacao, diasSemResposta);
        const prioridade = calcularPrioridade(classificacao, temperatura);

        // Contabilizar
        result.classified++;
        result.byClassification[classificacao] = (result.byClassification[classificacao] || 0) + 1;
        result.byTemperature[temperatura] = (result.byTemperature[temperatura] || 0) + 1;

        // Buscar contato existente
        const dbConv = dbConvMap.get(conv.id);
        const existingTags = dbConv?.tags || [];
        
        // Preparar tags
        let newTags = [...existingTags];
        
        // Remover tags antigas de temperatura
        newTags = newTags.filter(t => 
          !t.includes('status quente') && 
          !t.includes('status morno') && 
          !t.includes('status frio') &&
          !t.includes('sv-parou')
        );
        
        // Adicionar nova tag de temperatura
        const tagTemperatura = getTagTemperatura(temperatura);
        if (!newTags.includes(tagTemperatura)) {
          newTags.push(tagTemperatura);
        }

        // Atualizar contato
        await upsertContact({
          id: conv.contactId,
          ghl_id: conv.contactId,
          resultado_ultimo_contato: getTextoResultado(classificacao),
          data_ultimo_contato: lastMessageDate,
          lead_prioridade: prioridade,
          temperatura: temperatura,
          tags: newTags,
        });

        // Log da classificação
        await logClassification(
          conv.contactId,
          conv.id,
          getTextoResultado(classificacao),
          temperatura,
          prioridade,
          conv.lastMessage || null
        );

        result.updated++;

      } catch (err) {
        console.error(`Erro processando conversa ${conv.id}:`, err);
        result.errors++;
      }
    }

    // 4. Atualizar temperatura de contatos sem conversa recente
    await processarContatosEmSilencio(umaSemanaAtras);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Erro no classificador:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      result,
    }, { status: 500 });
  }
}

// ============================================
// PROCESSAR CONTATOS EM SILÊNCIO
// ============================================
async function processarContatosEmSilencio(cutoffDate: Date) {
  try {
    // Buscar contatos com data_ultimo_contato antiga
    const contacts = await sql`
      SELECT id, resultado_ultimo_contato, temperatura 
      FROM contacts 
      WHERE data_ultimo_contato IS NOT NULL 
      AND data_ultimo_contato < ${cutoffDate}
      AND temperatura != 'frio'
      AND temperatura != 'parou'
    `;

    for (const contact of contacts || []) {
      const lastContact = contact.data_ultimo_contato 
        ? new Date(contact.data_ultimo_contato) 
        : new Date(0);
      
      const diffTime = Math.abs(new Date().getTime() - lastContact.getTime());
      const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let novaTemperatura = contact.temperatura;
      
      if (dias >= PAROU_DIAS) {
        novaTemperatura = 'parou';
      } else if (dias >= SILENCIO_DIAS) {
        novaTemperatura = 'frio';
      }

      if (novaTemperatura !== contact.temperatura) {
        // Atualizar temperatura
        await sql`
          UPDATE contacts 
          SET temperatura = ${novaTemperatura},
              last_synced_at = NOW()
          WHERE id = ${contact.id}
        `;

        // Atualizar tags
        const existingTags: string[] = [];
        const newTags = existingTags
          .filter(t => !t.includes('status') && !t.includes('sv-parou'))
          .concat([novaTemperatura === 'parou' ? 'sv-parou' : `status ${novaTemperatura}`]);

        await upsertContact({
          id: contact.id,
          ghl_id: contact.id,
          temperatura: novaTemperatura,
          tags: newTags,
        });
      }
    }
  } catch (err) {
    console.error('Erro processando contatos em silêncio:', err);
  }
}

// ============================================
// GET - Status do Agente
// ============================================
export async function GET() {
  try {
    const stats = await sql`
      SELECT 
        temperatura,
        COUNT(*) as count
      FROM contacts 
      GROUP BY temperatura
    `;

    const recentClassifications = await sql`
      SELECT 
        classificacao,
        COUNT(*) as count
      FROM classification_logs 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY classificacao
      ORDER BY count DESC
    `;

    const lastRun = await sql`
      SELECT created_at 
      FROM classification_logs 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    return NextResponse.json({
      agent: 'SV Elétrica Classifier v1.0',
      status: 'running',
      temperatureDistribution: stats,
      last24hClassifications: recentClassifications,
      lastRun: lastRun[0]?.created_at || null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json({
      agent: 'SV Elétrica Classifier v1.0',
      status: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
