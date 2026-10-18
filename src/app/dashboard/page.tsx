'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target, AlertTriangle,
  ShoppingCart, Clock, CheckCircle, XCircle
} from 'lucide-react';

interface DashboardData {
  kpis: {
    receitaPipeline: number;
    metaReceita: number;
    vendasGanhas: number;
    vendasPerdidas: number;
    taxaConversao: number;
    metaConversao: number;
    ticketMedio: number;
  };
  vendasMensais: Array<{ mes: string; valor: number; meta: number }>;
  pipelineStatus: Array<{ name: string; value: number; color: string }>;
  rankingVendedores: Array<{ nome: string; valor: number; meta: number }>;
  ultimoSync: string;
}

const COLORS = {
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  primary: '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getStatusColor(value: number, target: number): string {
  const pct = (value / target) * 100;
  if (pct >= 70) return COLORS.success;
  if (pct >= 40) return COLORS.warning;
  return COLORS.danger;
}

function KpiCard({ title, value, target, format, icon: Icon, trend }: any) {
  const color = getStatusColor(value, target);
  const pct = target > 0 ? ((value / target) * 100).toFixed(0) : '0';
  const isPositive = trend > 0;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-slate-400 text-sm mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{format === 'currency' ? formatCurrency(value) : format === 'percent' ? formatPercent(value) : value}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">vs Meta: {format === 'percent' ? formatPercent(target) : formatCurrency(target)}</span>
              <Badge className={`text-xs ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {isPositive ? '+' : ''}{trend.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progresso</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Number(pct), 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard-full')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Sem dados disponíveis</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
            <p className="text-slate-400 text-sm mt-1">
              Última atualização: {new Date(data.ultimoSync).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Online
            </Badge>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Receita em Pipeline"
            value={data.kpis.receitaPipeline}
            target={data.kpis.metaReceita}
            format="currency"
            icon={DollarSign}
            trend={12.5}
          />
          <KpiCard
            title="Vendas Ganhas"
            value={data.kpis.vendasGanhas}
            target={20}
            format="number"
            icon={CheckCircle}
            trend={8.3}
          />
          <KpiCard
            title="Taxa de Conversão"
            value={data.kpis.taxaConversao}
            target={data.kpis.metaConversao}
            format="percent"
            icon={Target}
            trend={-2.1}
          />
          <KpiCard
            title="Ticket Médio"
            value={data.kpis.ticketMedio}
            target={5000}
            format="currency"
            icon={TrendingUp}
            trend={5.7}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          
          {/* Vendas Mensais */}
          <Card className="col-span-2 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Vendas por Mês — Progresso Mensal vs Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.vendasMensais}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    />
                    <Bar dataKey="meta" fill="#334155" name="Meta" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="valor" fill={COLORS.primary} name="Real" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Status */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-400" />
                Pipeline por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.pipelineStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.pipelineStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {data.pipelineStatus.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.name}</span>
                    <span className="text-xs font-medium text-white ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Vendedores */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              Ranking de Vendedores — Desempenho vs Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.rankingVendedores.map((v, i) => {
                const pct = (v.valor / v.meta) * 100;
                const color = getStatusColor(v.valor, v.meta);
                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-white font-medium">{v.nome}</span>
                        <span className="text-slate-400 text-sm">{formatCurrency(v.valor)} / {formatCurrency(v.meta)}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right" style={{ color }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
