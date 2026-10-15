'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Flame,
  Thermometer,
  UserCheck,
  Calendar
} from 'lucide-react';

type PeriodOption = 'all' | 'week' | 'month' | 'quarter' | 'custom';

interface Comparative {
  value: number;
  percentage: number;
  betterWhen?: 'lower';
}

interface KPIData {
  receitaPipeline: number;
  oportunidadesEmAndamento: number;
  taxaConversao: number;
  clientesEmSilencio: number;
}

interface DashboardData {
  kpis: KPIData;
  kpisPrevious: KPIData;
  comparatives: {
    receitaPipeline: Comparative;
    oportunidadesEmAndamento: Comparative;
    taxaConversao: Comparative;
    clientesEmSilencio: Comparative;
  };
  period: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
  charts: {
    funnelSituacao: Array<{ name: string; count: number }>;
    perdas: Array<{ name: string; value: number }>;
    temperatura: Array<{ name: string; value: number }>;
    vendedores: Array<{ name: string; ganhos: number; valor: number; count: number }>;
  };
  tables: {
    rankingVendedores: Array<{
      rank: number;
      nome: string;
      ganhos: number;
      valorTotal: number;
      clientes: number;
      taxaConversao: number;
    }>;
    clientesSilencio: Array<{
      id: string;
      nome: string;
      email: string;
      telefone: string;
      prioridade: string;
      situacao: string;
      tags: string[];
    }>;
    detalhamentoPerdas: Array<{
      motivo: string;
      count: number;
      percentage: number;
    }>;
  };
  meta: {
    totalContacts: number;
    totalOpportunities: number;
    totalGanhos: number;
    totalPerdidos: number;
    lastSync: string | null;
    periodSelected: string;
  };
}

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
const TEMP_COLORS: Record<string, string> = {
  'Quente': '#ef4444',
  'Morno': '#f59e0b',
  'Frio': '#3b82f6',
  'Parou': '#6b7280',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    all: 'Todo o período',
    week: 'Esta semana',
    month: 'Este mês',
    quarter: 'Este trimestre',
    custom: 'Personalizado',
  };
  return labels[period] || period;
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  comparative?: Comparative;
  isCurrency?: boolean;
  inverseBetter?: boolean;
}

function KPICard({ title, value, icon, color, comparative, isCurrency, inverseBetter }: KPICardProps) {
  const isPositive = comparative
    ? inverseBetter
      ? comparative.percentage < 0
      : comparative.percentage > 0
    : true;
  
  const trendColor = comparative
    ? isPositive
      ? 'text-green-600'
      : 'text-red-600'
    : '';

  return (
    <Card className={`border-l-4 border-l-${color}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">{title}</span>
          {icon}
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {comparative && (
          <div className={`flex items-center gap-1 mt-1 text-sm ${trendColor}`}>
            {comparative.percentage > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : comparative.percentage < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <span className="w-4 h-4" />
            )}
            <span>
              {comparative.percentage > 0 ? '+' : ''}{comparative.percentage}%
              {comparative.value !== 0 && (
                <span className="text-slate-400 ml-1">
                  ({inverseBetter && comparative.value > 0 ? '-' : comparative.value > 0 ? '+' : ''}
                  {isCurrency ? formatCurrency(Math.abs(comparative.value)) : Math.abs(comparative.value)})
                </span>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'quarter', label: 'Este Trimestre' },
  { value: 'all', label: 'Todo Período' },
];

export default function SVDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('all');

  const fetchData = async (period: PeriodOption = selectedPeriod) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (period !== 'all') {
        params.set('period', period);
      }
      const url = `/api/dashboard${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar dados');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sincronização falhou');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  };

  const handlePeriodChange = (period: PeriodOption) => {
    setSelectedPeriod(period);
    fetchData(period);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-2 font-medium">{error}</p>
            <p className="text-sm text-slate-500 mb-4">
              Configure o Supabase e sincronize os dados.
            </p>
            <Button onClick={() => fetchData()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = data?.kpis;
  const comparatives = data?.comparatives;
  const charts = data?.charts;
  const tables = data?.tables;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-7 h-7 text-blue-600" />
                SV Dashboard
              </h1>
              {data?.meta.lastSync && (
                <p className="text-sm text-slate-500 mt-1">
                  Última atualização: {new Date(data.meta.lastSync).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handlePeriodChange(opt.value)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedPeriod === opt.value
                        ? 'bg-white text-blue-600 shadow-sm font-medium'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </div>
          </div>
          
          {/* Period Info */}
          {data?.period && selectedPeriod !== 'all' && (
            <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
              <span>
                <strong>Período atual:</strong>{' '}
                {formatDate(data.period.current.start)} — {formatDate(data.period.current.end)}
              </span>
              <span>
                <strong>vs. anterior:</strong>{' '}
                {formatDate(data.period.previous.start)} — {formatDate(data.period.previous.end)}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ====== KPIs PRINCIPAIS (4 cards) ====== */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Indicadores-Chave
            {selectedPeriod !== 'all' && (
              <span className="ml-2 font-normal text-slate-400">
                — {getPeriodLabel(selectedPeriod)}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Receita em Pipeline */}
            <KPICard
              title="Receita em Pipeline"
              value={formatCurrency(kpis?.receitaPipeline ?? 0)}
              icon={<DollarSign className="w-5 h-5 text-green-500" />}
              color="green-500"
              comparative={comparatives?.receitaPipeline}
              isCurrency
            />

            {/* KPI 2: Oportunidades em Andamento */}
            <KPICard
              title="Oportunidades"
              value={String(kpis?.oportunidadesEmAndamento ?? 0)}
              icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
              color="blue-500"
              comparative={comparatives?.oportunidadesEmAndamento}
            />

            {/* KPI 3: Taxa de Conversão */}
            <KPICard
              title="Taxa de Conversão"
              value={`${kpis?.taxaConversao ?? 0}%`}
              icon={<UserCheck className="w-5 h-5 text-purple-500" />}
              color="purple-500"
              comparative={comparatives?.taxaConversao}
            />

            {/* KPI 4: Clientes em Silêncio */}
            <KPICard
              title="Clientes em Silêncio"
              value={String(kpis?.clientesEmSilencio ?? 0)}
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              color="red-500"
              comparative={comparatives?.clientesEmSilencio}
              inverseBetter
            />
          </div>
        </section>

        {/* ====== GRÁFICOS (4 cards) ====== */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Análises
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Funil de Situação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Situação Comercial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {charts?.funnelSituacao.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-slate-600 truncate">{item.name}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center px-2 transition-all"
                          style={{
                            width: `${Math.max((item.count / (charts.funnelSituacao[0]?.count || 1)) * 100, 5)}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        >
                          <span className="text-white text-xs font-medium">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 2: Por que Perdeu (Pizza) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Por que Perdeu?
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.perdas && charts.perdas.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={charts.perdas}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {charts.perdas.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {charts.perdas.slice(0, 5).map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="flex-1 truncate">{item.name}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">Sem dados de perda</p>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 3: Temperatura da Carteira */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  Temperatura da Carteira
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.temperatura && charts.temperatura.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={charts.temperatura}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {charts.temperatura.map((item) => (
                            <Cell
                              key={`cell-${item.name}`}
                              fill={TEMP_COLORS[item.name] || '#6b7280'}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {charts.temperatura.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <Flame
                            className="w-4 h-4"
                            style={{ color: TEMP_COLORS[item.name] || '#6b7280' }}
                          />
                          <span className="flex-1">{item.name}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">Sem dados de temperatura</p>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 4: Performance por Vendedor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  Performance por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {charts?.vendedores && charts.vendedores.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={charts.vendedores}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="valor" fill="#10b981" name="Valor (R$)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-center py-8">Sem dados de vendedores</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ====== TABELAS (3 tabelas) ====== */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Detalhamento
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabela 1: Ranking de Vendedores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏆 Ranking Vendedores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tables?.rankingVendedores.map((v) => (
                    <div key={v.nome} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        v.rank === 1 ? 'bg-yellow-400 text-yellow-800' :
                        v.rank === 2 ? 'bg-gray-300 text-gray-700' :
                        v.rank === 3 ? 'bg-amber-600 text-white' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {v.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate capitalize">{v.nome}</p>
                        <p className="text-xs text-slate-500">{v.ganhos} ganhos • {v.clientes} clientes</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(v.valorTotal)}</p>
                        <p className="text-xs text-slate-400">{v.taxaConversao}% conv.</p>
                      </div>
                    </div>
                  ))}
                  {(!tables?.rankingVendedores || tables.rankingVendedores.length === 0) && (
                    <p className="text-slate-400 text-center py-4">Sem dados</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabela 2: Clientes em Silêncio (AÇÃO) */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base text-red-600 flex items-center gap-2">
                  ⚠️ Precisam de Ação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {tables?.clientesSilencio.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.nome}</p>
                          <p className="text-xs text-slate-500 truncate">{c.email || c.telefone || 'Sem contato'}</p>
                        </div>
                        <Badge
                          variant={c.prioridade === 'alta' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {c.prioridade}
                        </Badge>
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {c.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!tables?.clientesSilencio || tables.clientesSilencio.length === 0) && (
                    <p className="text-slate-400 text-center py-4">Nenhum cliente em silêncio</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabela 3: Detalhamento de Perdas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📉 Análise de Perdas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tables?.detalhamentoPerdas.map((p, i) => (
                    <div key={p.motivo} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{p.motivo}</span>
                        <span className="font-medium">{p.count} ({p.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${p.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!tables?.detalhamentoPerdas || tables.detalhamentoPerdas.length === 0) && (
                    <p className="text-slate-400 text-center py-4">Sem dados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Resumo final */}
        <section className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-4 text-slate-700">Resumo Geral</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">{data?.meta.totalContacts ?? 0}</p>
              <p className="text-sm text-slate-500 mt-1">Contatos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{data?.meta.totalOpportunities ?? 0}</p>
              <p className="text-sm text-slate-500 mt-1">Oportunidades</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">{data?.meta.totalGanhos ?? 0}</p>
              <p className="text-sm text-slate-500 mt-1">Ganhos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-500">{data?.meta.totalPerdidos ?? 0}</p>
              <p className="text-sm text-slate-500 mt-1">Perdidos</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
