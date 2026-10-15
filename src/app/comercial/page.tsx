'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Users, Target, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

// Tipos
interface MetaData {
  geral: number;
  faturamento: number;
  percentual: number;
  falta: number;
  diasPassados: number;
  diasRestantes: number;
  diasTotais: number;
}

interface Projecao {
  valor: number;
  status: string;
  cor: string;
  corFundo: string;
}

interface Vendedor {
  id: string;
  nome: string;
  meta: number;
  faturamento: number;
  percentual: number;
  status: string;
  corStatus: string;
  corFundo: string;
  falta: number;
  precisaPorDia: number;
  notas: number;
}

interface Filial {
  chave: string;
  nome: string;
  faturamento: number;
  percentual: number;
  notas: number;
}

interface Funil {
  orcamentos: number;
  orcamentosCount: number;
  vendas: number;
  taxaConversao: number;
}

interface Alertas {
  vendedoresSemVenda: number;
  abaixo50: number;
  noCaminho: number;
  orcamentosPegos: number;
}

interface DashboardData {
  meta: MetaData;
  projecao: Projecao;
  rankingVendedores: Vendedor[];
  vendasPorFilial: Filial[];
  funil: Funil;
  alertas: Alertas;
  totais: {
    faturamento: number;
    faturamento_bruto: number;
    devolucoes: number;
    pedidos: number;
    notas: number;
    clientes: number;
    ticket_medio: number;
  };
  topProdutos: Array<{
    id: string;
    nome: string;
    quantidade: number;
    faturamento: number;
  }>;
  periodo: { de: string; ate: string };
  ultimoUpdate: string;
}

// Cores SV
const CORES = {
  primary: '#B3141C',
  verde: '#16A34A',
  amarelo: '#D97706',
  vermelho: '#DC2626',
  background: '#F6F7F9',
  card: '#FFFFFF',
  textoPrincipal: '#1E293B',
  textoSecundario: '#64748B',
};

// Formatação
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}Mi`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
}

// Componentes
function StatusBadge({ status, cor, corFundo }: { status: string; cor: string; corFundo: string }) {
  const labels: Record<string, string> = {
    'no-caminho': 'No Caminho',
    'atencao': 'Atenção',
    'critico': 'Crítico'
  };
  
  return (
    <span 
      className="px-2 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: corFundo, color: cor }}
    >
      {labels[status] || status}
    </span>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

function KPICard({ title, value, subtitle, icon }: { title: string; value: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold" style={{ color: CORES.textoPrincipal }}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function VendedorRow({ vendedor, expanded, onToggle }: { vendedor: Vendedor; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button 
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm" style={{ color: CORES.textoPrincipal }}>
              {vendedor.nome}
            </span>
            <StatusBadge status={vendedor.status} cor={vendedor.corStatus} corFundo={vendedor.corFundo} />
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span>Meta: {formatCurrency(vendedor.meta)}</span>
            <span>Faturado: {formatCurrency(vendedor.faturamento)}</span>
          </div>
        </div>
        <div className="text-right mr-2">
          <span className="text-lg font-bold" style={{ color: vendedor.corStatus }}>
            {vendedor.percentual.toFixed(1)}%
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50 -mt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Falta para meta:</span>
              <span className="ml-2 font-medium" style={{ color: CORES.textoPrincipal }}>
                {formatCurrency(vendedor.falta)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Precisa/dia:</span>
              <span className="ml-2 font-medium" style={{ color: CORES.textoPrincipal }}>
                {formatCurrency(vendedor.precisaPorDia)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Pedidos:</span>
              <span className="ml-2 font-medium" style={{ color: CORES.textoPrincipal }}>
                {vendedor.notas}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Ticket médio:</span>
              <span className="ml-2 font-medium" style={{ color: CORES.textoPrincipal }}>
                {vendedor.notas > 0 ? formatCurrency(vendedor.faturamento / vendedor.notas) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PainelComercialSV() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/comercial/dashboard');
      if (!res.ok) throw new Error('Falha ao carregar dados');
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh a cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CORES.background }}>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: CORES.primary }} />
          <p className="text-gray-600">Carregando dados do painel...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CORES.background }}>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: CORES.primary }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { meta, projecao, rankingVendedores, vendasPorFilial, funil, alertas } = data;

  return (
    <div className="min-h-screen" style={{ backgroundColor: CORES.background }}>
      {/* Header */}
      <header className="shadow-sm" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Título */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: CORES.primary }}
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: CORES.textoPrincipal }}>
                  SV Elétrica - Painel Comercial
                </h1>
                <p className="text-xs text-gray-500">
                  Outubro 2026 • atualizado às {lastUpdate}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Metas do Mês */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Meta Geral */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Meta do Mês</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold" style={{ color: CORES.textoPrincipal }}>
                  {formatCurrencyCompact(meta.faturamento)}
                </span>
                <span className="text-sm text-gray-400">/ {formatCurrencyCompact(meta.geral)}</span>
              </div>
              <ProgressBar value={meta.faturamento} max={meta.geral} color={CORES.primary} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{meta.percentual.toFixed(1)}% atingido</span>
                <span>{formatCurrency(meta.falta)} falta</span>
              </div>
            </div>

            {/* Projeção */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Projeção de Fechamento</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold" style={{ color: projecao.cor }}>
                  {formatCurrencyCompact(projecao.valor)}
                </span>
              </div>
              <div 
                className="inline-block px-2 py-1 rounded text-xs font-semibold"
                style={{ backgroundColor: projecao.corFundo, color: projecao.cor }}
              >
                {projecao.status === 'no-caminho' ? 'No Caminho da Meta' : 
                 projecao.status === 'atencao' ? 'Atenção Necesária' : 'Abaixo da Meta'}
              </div>
            </div>

            {/* Dias Restantes */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Dias Úteis</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold" style={{ color: CORES.textoPrincipal }}>
                  {meta.diasRestantes}
                </span>
                <span className="text-sm text-gray-400">dias restantes</span>
              </div>
              <div className="text-xs text-gray-500">
                {meta.diasPassados} dias passados de {meta.diasTotais} úteis
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Row 1: Ranking Vendedores + Vendas por Filial */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking Vendedores */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: CORES.primary }} />
              <h2 className="font-semibold" style={{ color: CORES.textoPrincipal }}>
                Ranking por Vendedor
              </h2>
            </div>
            <div>
              {rankingVendedores.map((vendedor) => (
                <VendedorRow
                  key={vendedor.id}
                  vendedor={vendedor}
                  expanded={expandedVendedor === vendedor.id}
                  onToggle={() => setExpandedVendedor(expandedVendedor === vendedor.id ? null : vendedor.id)}
                />
              ))}
            </div>
          </div>

          {/* Vendas por Filial */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5" style={{ color: CORES.primary }} />
              <h2 className="font-semibold" style={{ color: CORES.textoPrincipal }}>
                Vendas por Filial
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {vendasPorFilial.map((filial) => (
                  <div key={filial.chave}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium" style={{ color: CORES.textoPrincipal }}>
                        {filial.nome}
                      </span>
                      <span className="text-sm" style={{ color: CORES.textoSecundario }}>
                        {formatCurrency(filial.faturamento)} ({filial.percentual}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${filial.percentual}%`,
                          backgroundColor: CORES.primary 
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{filial.notas} pedidos</span>
                  </div>
                ))}
              </div>
              
              {/* Resumo */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-lg font-bold" style={{ color: CORES.primary }}>
                    {formatCurrency(meta.faturamento)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Funil + Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Funil de Vendas */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: CORES.primary }} />
              <h2 className="font-semibold" style={{ color: CORES.textoPrincipal }}>
                Funil de Vendas
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                {/* Orçamentos Abertos */}
                <div className="flex-1 text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Orçamentos Abertos</p>
                  <p className="text-2xl font-bold" style={{ color: CORES.amarelo }}>
                    {formatCurrency(funil.orcamentos)}
                  </p>
                  <p className="text-xs text-gray-400">{funil.orcamentosCount} orçamentos</p>
                </div>
                
                {/* Seta */}
                <div className="flex-shrink-0">
                  <TrendingDown className="w-6 h-6 text-gray-300" />
                </div>
                
                {/* Vendas Fechadas */}
                <div className="flex-1 text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vendas Fechadas</p>
                  <p className="text-2xl font-bold" style={{ color: CORES.verde }}>
                    {formatCurrency(funil.vendas)}
                  </p>
                  <p className="text-xs text-gray-400">{data.totais.pedidos} pedidos</p>
                </div>
                
                {/* Seta */}
                <div className="flex-shrink-0">
                  <TrendingDown className="w-6 h-6 text-gray-300" />
                </div>
                
                {/* Taxa Conversão */}
                <div className="flex-1 text-center p-4 rounded-lg" style={{ backgroundColor: `${CORES.primary}10` }}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Taxa Conversão</p>
                  <p className="text-2xl font-bold" style={{ color: CORES.primary }}>
                    {funil.taxaConversao}%
                  </p>
                  <p className="text-xs text-gray-400">
                    {funil.orcamentos > 0 
                      ? `${((funil.vendas / funil.orcamentos) * 100).toFixed(1)}% real`
                      : '-'}
                  </p>
                </div>
              </div>
              
              {/* Barra de conversão visual */}
              <div className="mt-6">
                <div className="flex h-8 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${Math.min(funil.taxaConversao, 100)}%` }}
                  >
                    {funil.taxaConversao > 5 && `${funil.taxaConversao}%`}
                  </div>
                  {funil.taxaConversao < 100 && (
                    <div 
                      className="bg-yellow-400 flex items-center justify-center text-yellow-900 text-xs font-medium"
                      style={{ width: `${Math.max(0, 100 - funil.taxaConversao)}%` }}
                    >
                      {funil.taxaConversao <= 5 && `${funil.taxaConversao}%`}
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold" style={{ color: CORES.textoPrincipal }}>
                Alertas
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {/* Vendedores sem venda */}
              <div 
                className="p-3 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: alertas.vendedoresSemVenda > 0 ? '#fee2e2' : '#dcfce7' }}
              >
                <div className="flex items-center gap-2">
                  <span 
                    className="text-lg"
                  >
                    {alertas.vendedoresSemVenda > 0 ? '🔴' : '🟢'}
                  </span>
                  <span className="text-sm font-medium" style={{ color: CORES.textoPrincipal }}>
                    Vendedores sem venda
                  </span>
                </div>
                <span 
                  className="text-xl font-bold"
                  style={{ color: alertas.vendedoresSemVenda > 0 ? CORES.vermelho : CORES.verde }}
                >
                  {alertas.vendedoresSemVenda}
                </span>
              </div>
              
              {/* Abaixo de 50% */}
              <div 
                className="p-3 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: alertas.abaixo50 > 0 ? '#fef3c7' : '#dcfce7' }}
              >
                <div className="flex items-center gap-2">
                  <span>
                    {alertas.abaixo50 > 0 ? '🟡' : '🟢'}
                  </span>
                  <span className="text-sm font-medium" style={{ color: CORES.textoPrincipal }}>
                    Abaixo de 50%
                  </span>
                </div>
                <span 
                  className="text-xl font-bold"
                  style={{ color: alertas.abaixo50 > 0 ? CORES.amarelo : CORES.verde }}
                >
                  {alertas.abaixo50}
                </span>
              </div>
              
              {/* No caminho da meta */}
              <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#dcfce7' }}>
                <div className="flex items-center gap-2">
                  <span>🟢</span>
                  <span className="text-sm font-medium" style={{ color: CORES.textoPrincipal }}>
                    No caminho da meta
                  </span>
                </div>
                <span className="text-xl font-bold" style={{ color: CORES.verde }}>
                  {alertas.noCaminho}
                </span>
              </div>
              
              {/* Orçamentos pegos */}
              <div className="p-3 rounded-lg flex items-center justify-between bg-blue-50">
                <div className="flex items-center gap-2">
                  <span>📋</span>
                  <span className="text-sm font-medium" style={{ color: CORES.textoPrincipal }}>
                    Orçamentos abertos
                  </span>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  {alertas.orcamentosPegos}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Produtos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: CORES.primary }} />
            <h2 className="font-semibold" style={{ color: CORES.textoPrincipal }}>
              Top Produtos Vendidos
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topProdutos.map((produto, idx) => (
                  <tr key={produto.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#b45309' : '#e5e7eb', color: idx < 3 ? 'white' : '#6b7280' }}>
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700 truncate max-w-md" title={produto.nome}>
                          {produto.nome}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{produto.quantidade}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(produto.faturamento)}
                    </td>
                  </tr>
                ))}
                {data.topProdutos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                      Nenhum produto registrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold" style={{ color: CORES.primary }}>
                {data.totais.pedidos}
              </p>
              <p className="text-sm text-gray-500">Pedidos</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: CORES.verde }}>
                {data.totais.clientes}
              </p>
              <p className="text-sm text-gray-500">Clientes</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: CORES.textoPrincipal }}>
                {formatCurrency(data.totais.ticket_medio)}
              </p>
              <p className="text-sm text-gray-500">Ticket Médio</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: data.totais.devolucoes > 0 ? CORES.vermelho : CORES.verde }}>
                {formatCurrency(data.totais.devolucoes)}
              </p>
              <p className="text-sm text-gray-500">Devoluções</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-4">
          SV Elétrica Painel Comercial • Dados via API SV • Atualização automática a cada 5 min
        </footer>
      </main>
    </div>
  );
}
