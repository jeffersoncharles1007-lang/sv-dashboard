import { NextRequest, NextResponse } from 'next/server';
import { LOCATION_ID, API_BASE, STAGE_NEGOCIACAO, STAGE_GANHO } from '@/lib/constants';

const SV_API_KEY = process.env.SV_API_KEY || 'sk_C9lgAdeJsbcOQbZdij5p1MvHMzK95SOwIIK6vBvs0JofRU_J';
const SV_API_URL = process.env.SV_API_URL || 'https://api.sveletrica.com';

// Vendedores da Central de Negócios (mesmos do comercial dashboard)
const VENDEDORES_CENTRAL = [
  '00C000LMPY', // Eduardo Pereira Tomas
  '00C000LMQ1', // Marcus Vinicius Soares Reboucas
  '00C000LMQ3', // Matheus Carvalho de Souza
  '00C000LMQ8', // Pedro Henrique Albuquerque Pires
  '00C000LMQB', // Rubens Costa do Nascimento Alves
  '00C000LNU0', // Rafael Virginio de Santana Silva
];

// Mapping vendedor SV → usuário GHL (se existir)
const VENDEDOR_SV_TO_GHL: Record<string, string> = {
  // Precisa mapear IDs de vendedor da SV para IDs do GHL
};

interface OrcamentoSV {
  id_orcamento: string;
  data_emissao: string;
  dias_parado: number;
  filial: string;
  fase: string;
  id_cliente: string;
  codigo_cliente: string;
  nome_cliente: string;
  cnpj_cpf: string;
  contato: {
    telefone_whatsapp: string | null;
    email: string | null;
  };
  id_vendedor_responsavel: string;
  nome_vendedor_responsavel: string;
  qtd_itens: number;
  valor_tela: number;
  valor_orcamento: number;
  custo_total: number;
  margem_pct: number;
  desconto_pct: number;
  observacao: string | null;
}

interface VendaSV {
  chave: string;
  nome: string;
  faturamento: number;
  notas: number;
}

interface SyncResult {
  success: boolean;
  orcamentosProcessados: number;
  vendasProcessadas: number;
  oportunidadesCriadas: number;
  oportunidadesAtualizadas: number;
  erros: string[];
  logs: string[];
}

// Headers para API GHL
const ghlHeaders = {
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
};

/**
 * GET /api/sync/ghl-sv
 * Sincroniza orçamentos e vendas da SV com o GHL
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Basic auth simples para proteger o endpoint
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET || 'sync-secret-2024'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncSVtoGHL();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro no sync SV→GHL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/ghl-sv
 * Força um sync completo
 */
export async function POST(request: NextRequest) {
  // O POST permite forçar sync mesmo se houve sucesso recente
  return GET(request);
}

async function syncSVtoGHL(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    orcamentosProcessados: 0,
    vendasProcessadas: 0,
    oportunidadesCriadas: 0,
    oportunidadesAtualizadas: 0,
    erros: [],
    logs: [],
  };

  // 1. Buscar orçamentos em aberto da API SV
  result.logs.push('🔄 Buscando orçamentos em aberto da SV...');
  const orcamentosResponse = await fetch(`${SV_API_URL}/v1/crm/orcamentos-abertos`, {
    headers: { 'Authorization': `Bearer ${SV_API_KEY}` },
  });

  if (!orcamentosResponse.ok) {
    throw new Error(`API SV retornou erro: ${orcamentosResponse.status}`);
  }

  const orcamentosData = await orcamentosResponse.json();
  const orcamentos: OrcamentoSV[] = orcamentosData.dados || [];
  result.logs.push(`📋 Encontrados ${orcamentos.length} orçamentos`);

  // 2. Buscar oportunidades existentes no GHL
  result.logs.push('🔄 Buscando oportunidades no GHL...');
  const oportunidadesGHL = await buscarOportunidadesGHL();
  result.logs.push(`📋 Encontradas ${oportunidadesGHL.length} oportunidades no GHL`);

  // 3. Processar cada orçamento
  for (const orcamento of orcamentos) {
    try {
      // Verificar se é vendedor da Central de Negócios
      const vendedorDaCentral = VENDEDORES_CENTRAL.includes(orcamento.id_vendedor_responsavel);
      
      if (!vendedorDaCentral) {
        result.logs.push(`⏭️ Pulando orçamento ${orcamento.id_orcamento} - vendedor ${orcamento.nome_vendedor_responsavel} não é da Central`);
        continue;
      }

      // Normalizar CNPJ/CPF para busca
      const cnpjCpf = orcamento.cnpj_cpf.replace(/\D/g, '');

      // Buscar oportunidade existente por CNPJ
      const oppExistente = oportunidadesGHL.find(opp => {
        const customFields = opp.customFields || [];
        const cnpjCampo = customFields.find(f => 
          f.id === 'cnpj' || f.id === 'cnpj_cpf' || f.fieldValue?.includes(cnpjCpf)
        );
        return cnpjCampo !== undefined;
      });

      if (oppExistente) {
        // Atualizar oportunidade existente
        await atualizarOportunidadeGHL(oppExistente.id, orcamento);
        result.oportunidadesAtualizadas++;
        result.logs.push(`✅ Atualizado: ${orcamento.nome_cliente} (${orcamento.valor_orcamento})`);
      } else {
        // Criar nova oportunidade
        const novaOpp = await criarOportunidadeGHL(orcamento);
        if (novaOpp) {
          result.oportunidadesCriadas++;
          result.logs.push(`🆕 Criado: ${orcamento.nome_cliente} (${orcamento.valor_orcamento})`);
        }
      }

      result.orcamentosProcessados++;

      // Mover para stage Em Negociação
      if (oppExistente) {
        await moverOportunidadeStage(oppExistente.id, STAGE_NEGOCIACAO);
      }

    } catch (error) {
      const msg = `Erro no orçamento ${orcamento.id_orcamento}: ${error}`;
      result.erros.push(msg);
      result.logs.push(`❌ ${msg}`);
    }
  }

  // 4. Processar vendas (faturamento do resumo)
  result.logs.push('🔄 Buscando dados de faturamento da SV...');
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dataDe = primeiroDia.toISOString().split('T')[0];
  const dataAte = hoje.toISOString().split('T')[0];

  const resumoResponse = await fetch(
    `${SV_API_URL}/v1/crm/dashboard/resumo?de=${dataDe}&ate=${dataAte}`,
    { headers: { 'Authorization': `Bearer ${SV_API_KEY}` } }
  );

  if (resumoResponse.ok) {
    const resumo = await resumoResponse.json();
    const vendas: VendaSV[] = resumo.por_vendedor || [];

    for (const venda of vendas) {
      if (venda.faturamento > 0) {
        result.vendasProcessadas++;
        result.logs.push(`💰 Vendedor ${venda.nome}: R$ ${venda.faturamento.toFixed(2)} (${venda.notas} notas)`);
      }
    }
  }

  result.logs.push(`\n📊 RESUMO:`);
  result.logs.push(`   Orçamentos processados: ${result.orcamentosProcessados}`);
  result.logs.push(`   Oportunidades criadas: ${result.oportunidadesCriadas}`);
  result.logs.push(`   Oportunidades atualizadas: ${result.oportunidadesAtualizadas}`);
  result.logs.push(`   Vendas processadas: ${result.vendasProcessadas}`);
  result.logs.push(`   Erros: ${result.erros.length}`);

  return result;
}

interface OportunidadeGHL {
  id: string;
  name: string;
  status: string;
  pipelineId: string;
  pipelineStageId: string;
  monetaryValue: number;
  contactId: string;
  customFields: Array<{ id: string; fieldValue: string }>;
}

async function buscarOportunidadesGHL(): Promise<OportunidadeGHL[]> {
  const allOpps: OportunidadeGHL[] = [];
  let page = 1;
  
  while (true) {
    const res = await fetch(`${API_BASE}/opportunities/search`, {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        location_id: LOCATION_ID,
        limit: 200,
        page,
      }),
    });

    if (!res.ok) break;
    
    const data = await res.json();
    const opps = data.opportunities || [];
    allOpps.push(...opps);
    
    if (opps.length < 200) break;
    page++;
  }

  return allOpps;
}

async function atualizarOportunidadeGHL(oppId: string, orcamento: OrcamentoSV): Promise<void> {
  const url = `${API_BASE}/opportunities/${oppId}`;
  
  const body: Record<string, any> = {
    name: orcamento.nome_cliente,
    monetaryValue: orcamento.valor_orcamento,
  };

  // Adicionar campos customizados
  const customFields: Array<{ id: string; value: string }> = [];
  
  // CNPJ
  customFields.push({ id: 'cnpj', value: orcamento.cnpj_cpf });
  
  // ID do orçamento SV
  customFields.push({ id: 'sv_id_orcamento', value: orcamento.id_orcamento });
  
  // Filial
  customFields.push({ id: 'sv_filial', value: orcamento.filial });
  
  // Valor orçamento
  customFields.push({ id: 'sv_valor_orcamento', value: orcamento.valor_orcamento.toString() });
  
  // Observação
  if (orcamento.observacao) {
    customFields.push({ id: 'sv_observacao', value: orcamento.observacao });
  }

  body.customFields = customFields;

  const res = await fetch(url, {
    method: 'PUT',
    headers: ghlHeaders,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Erro ao atualizar oportunidade: ${error}`);
  }
}

async function criarOportunidadeGHL(orcamento: OrcamentoSV): Promise<string | null> {
  // Primeiro, buscar ou criar contato
  let contactId = await buscarOuCriarContato(orcamento);
  
  if (!contactId) {
    throw new Error(`Não foi possível criar/buscar contato para ${orcamento.nome_cliente}`);
  }

  const url = `${API_BASE}/opportunities/`;
  
  const body = {
    name: `${orcamento.nome_cliente} - ORÇ ${orcamento.id_orcamento}`,
    pipelineId: 'ihc0DHSDb8kcRJU3kWk8', // Pipeline de orçamentos
    pipelineStageId: STAGE_NEGOCIACAO, // Começa em Em Negociação
    contactId: contactId,
    monetaryValue: orcamento.valor_orcamento,
    customFields: [
      { id: 'cnpj', value: orcamento.cnpj_cpf },
      { id: 'sv_id_orcamento', value: orcamento.id_orcamento },
      { id: 'sv_filial', value: orcamento.filial },
      { id: 'sv_valor_orcamento', value: orcamento.valor_orcamento.toString() },
      { id: 'sv_data_emissao', value: orcamento.data_emissao },
      { id: 'sv_observacao', value: orcamento.observacao || '' },
    ],
    locationId: LOCATION_ID,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: ghlHeaders,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Erro ao criar oportunidade: ${error}`);
  }

  const data = await res.json();
  return data.opportunity?.id || null;
}

async function buscarOuCriarContato(orcamento: OrcamentoSV): Promise<string | null> {
  const cnpjCpf = orcamento.cnpj_cpf.replace(/\D/g, '');
  
  // Buscar contato existente
  const searchRes = await fetch(
    `${API_BASE}/contacts/search`,
    {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        locationId: LOCATION_ID,
        searchBy: 'customFields',
        customFieldId: 'cnpj',
        customFieldValue: cnpjCpf,
      }),
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const contacts = searchData.contacts || [];
    
    if (contacts.length > 0) {
      return contacts[0].id;
    }
  }

  // Criar novo contato
  const createRes = await fetch(`${API_BASE}/contacts/`, {
    method: 'POST',
    headers: ghlHeaders,
    body: JSON.stringify({
      firstName: orcamento.nome_cliente.split(' ')[0],
      lastName: orcamento.nome_cliente.split(' ').slice(1).join(' '),
      locationId: LOCATION_ID,
      customFields: [
        { id: 'cnpj', fieldValue: cnpjCpf },
      ],
      phone: orcamento.contato.telefone_whatsapp?.replace(/\D/g, '') || '',
      email: orcamento.contato.email || '',
    }),
  });

  if (createRes.ok) {
    const createData = await createRes.json();
    return createData.contact?.id || null;
  }

  return null;
}

async function moverOportunidadeStage(oppId: string, stageId: string): Promise<void> {
  const url = `${API_BASE}/opportunities/${oppId}/move`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: ghlHeaders,
    body: JSON.stringify({
      pipelineStageId: stageId,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Erro ao mover oportunidade ${oppId}: ${error}`);
    // Não throw para não parar o processo
  }
}
