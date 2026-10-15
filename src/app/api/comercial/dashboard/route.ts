import { NextRequest, NextResponse } from 'next/server';

// Configurações de meta (Outubro/2026)
const META_GERAL = 150000;
const META_EDUARDO = 50000;
const META_VENDEDOR = 25000;
const TOTAL_DIAS_UTEIS = 21;

// Vendedores da Central de Negócios
const VENDEDORES_CENTRAL = [
  { id: '00C000LMPY', nome: 'Eduardo Pereira Tomas', meta: META_EDUARDO },
  { id: '00C000LMQ1', nome: 'Marcus Vinicius Soares Reboucas', meta: META_VENDEDOR },
  { id: '00C000LMQ3', nome: 'Matheus Carvalho de Souza', meta: META_VENDEDOR },
  { id: '00C000LMQ8', nome: 'Pedro Henrique Albuquerque Pires', meta: META_VENDEDOR },
  { id: '00C000LMQB', nome: 'Rubens Costa do Nascimento Alves', meta: META_VENDEDOR },
  { id: '00C000LNU0', nome: 'Rafael Virginio de Santana Silva', meta: META_VENDEDOR },
];

// Dias úteis no mês de Outubro/2026 (considerando sábados e domingos)
function getDiasUteisNoMes(ano: number, mes: number): number {
  let diasUteis = 0;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay();
    // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
  }
  return diasUteis;
}

// Dias úteis já passados no mês
function getDiasUteisPassados(): number {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diaAtual = hoje.getDate();
  
  let diasUteis = 0;
  for (let dia = 1; dia < diaAtual; dia++) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
  }
  return diasUteis;
}

// Dias úteis restantes no mês
function getDiasUteisRestantes(): number {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  
  let diasUteis = 0;
  for (let dia = diaAtual; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
  }
  return diasUteis;
}

function getStatusColor(percentual: number): { status: string; cor: string; corFundo: string } {
  if (percentual >= 80) {
    return { status: 'no-caminho', cor: '#16A34A', corFundo: '#dcfce7' };
  } else if (percentual >= 50) {
    return { status: 'atencao', cor: '#D97706', corFundo: '#fef3c7' };
  } else {
    return { status: 'critico', cor: '#DC2626', corFundo: '#fee2e2' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.SV_API_KEY || 'sk_C9lgAdeJsbcOQbZdij5p1MvHMzK95SOwIIK6vBvs0JofRU_J';
    const apiUrl = process.env.SV_API_URL || 'https://api.sveletrica.com';

    // Obter período atual (mês)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ano = primeiroDia.getFullYear();
    const mes = primeiroDia.getMonth();
    
    const dataDe = primeiroDia.toISOString().split('T')[0];
    const dataAte = hoje.toISOString().split('T')[0];

    // Buscar dados da API SV
    const [resumoResponse, orcamentosResponse] = await Promise.all([
      fetch(`${apiUrl}/v1/crm/dashboard/resumo?de=${dataDe}&ate=${dataAte}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        next: { revalidate: 300 } // Cache 5 min
      }),
      fetch(`${apiUrl}/v1/crm/orcamentos-abertos`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        next: { revalidate: 300 }
      })
    ]);

    if (!resumoResponse.ok) {
      throw new Error(`API SV retornou erro: ${resumoResponse.status}`);
    }

    const resumo = await resumoResponse.json();
    const orcamentos = orcamentosResponse.ok ? await orcamentosResponse.json() : { dados: [] };

    // Calcular métricas principais
    const faturamento = resumo.totais?.faturamento || 0;
    const percentualMetaGeral = (faturamento / META_GERAL) * 100;
    const faltaGeral = Math.max(0, META_GERAL - faturamento);
    const diasPassados = getDiasUteisPassados();
    const diasRestantes = getDiasUteisRestantes();
    const diasTotais = getDiasUteisNoMes(ano, mes);
    
    // Projeção de fechamento
    const projecao = diasPassados > 0 ? (faturamento / diasPassados) * diasTotais : 0;
    const statusProjecao = getStatusColor((projecao / META_GERAL) * 100);

    // Ranking por vendedor
    const porVendedor = resumo.por_vendedor || [];
    const rankingVendedores = VENDEDORES_CENTRAL.map(v => {
      const dadosVendedor = porVendedor.find((p: any) => p.chave === v.id);
      const fatVendedor = dadosVendedor?.faturamento || 0;
      const percentual = (fatVendedor / v.meta) * 100;
      const falta = Math.max(0, v.meta - fatVendedor);
      const precisaPorDia = diasRestantes > 0 ? falta / diasRestantes : 0;
      const status = getStatusColor(percentual);
      
      return {
        id: v.id,
        nome: v.nome,
        meta: v.meta,
        faturamento: fatVendedor,
        percentual: Math.round(percentual * 10) / 10,
        status: status.status,
        corStatus: status.cor,
        corFundo: status.corFundo,
        falta,
        precisaPorDia,
        notas: dadosVendedor?.notas || 0
      };
    }).sort((a, b) => b.percentual - a.percentual);

    // Vendas por filial
    const porFilial = resumo.por_filial || [];
    const totalFilial = porFilial.reduce((sum: number, f: any) => sum + f.faturamento, 0);
    const vendasPorFilial = porFilial.map((f: any) => ({
      chave: f.chave,
      nome: f.nome,
      faturamento: f.faturamento,
      percentual: totalFilial > 0 ? Math.round((f.faturamento / totalFilial) * 100) : 0,
      notas: f.notas
    })).sort((a: any, b: any) => b.faturamento - a.faturamento);

    // Orçamentos em aberto
    const orcamentosAbertos = orcamentos.dados || [];
    const totalOrcamentos = orcamentosAbertos.reduce((sum: number, o: any) => sum + (o.valor_orcamento || 0), 0);

    // Taxa de conversão
    const taxaConversao = totalOrcamentos > 0 ? Math.round((faturamento / totalOrcamentos) * 100) : 0;

    // Alertas
    const alertas = {
      vendedoresSemVenda: rankingVendedores.filter(v => v.faturamento === 0).length,
      abaixo50: rankingVendedores.filter(v => v.percentual < 50).length,
      noCaminho: rankingVendedores.filter(v => v.percentual >= 80).length,
      orcamentosPegos: orcamentosAbertos.length
    };

    // Top produtos
    const topProdutos = (resumo.top_produtos || []).slice(0, 5).map((p: any) => ({
      id: p.id_produto,
      nome: p.nome_produto,
      quantidade: p.quantidade,
      faturamento: p.faturamento
    }));

    return NextResponse.json({
      // Metas do mês
      meta: {
        geral: META_GERAL,
        faturamento,
        percentual: Math.round(percentualMetaGeral * 10) / 10,
        falta: Math.round(faltaGeral * 100) / 100,
        diasPassados,
        diasRestantes,
        diasTotais
      },
      
      // Projeção
      projecao: {
        valor: Math.round(projecao * 100) / 100,
        status: statusProjecao.status,
        cor: statusProjecao.cor,
        corFundo: statusProjecao.corFundo
      },
      
      // Ranking vendedores
      rankingVendedores,
      
      // Vendas por filial
      vendasPorFilial,
      
      // Funil
      funil: {
        orcamentos: totalOrcamentos,
        orcamentosCount: orcamentosAbertos.length,
        vendas: faturamento,
        taxaConversao
      },
      
      // Alertas
      alertas,
      
      // Dados complementares
      totais: resumo.totais,
      topProdutos,
      periodo: resumo.periodo,
      ultimoUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na API comercial/dashboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
