'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { TrendingUp, Filter, Calendar } from 'lucide-react';

interface VendasData {
  tendencia: Array<{ data: string; valor: number; acumulado: number }>;
  oportunidades: Array<{
    nome: string;
    valor: number;
    estagio: string;
    vendedor: string;
    dias: number;
  }>;
  stats: {
    totalOportunidades: number;
    valorTotal: number;
    emNegociacao: number;
    prazoMedio: number;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

export default function VendasPage() {
  const [data, setData] = useState<VendasData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vendas-detail')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Carregando...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-slate-400">Sem dados disponíveis</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Análise de Vendas</h1>
        <p className="text-slate-400 text-sm mt-1">Acompanhe o desempenho e tendências</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Oportunidades</p>
                <p className="text-2xl font-bold text-white">{data.stats.totalOportunidades}</p>
              </div>
              <Filter className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Valor em Pipeline</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(data.stats.valorTotal)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Em Negociação</p>
                <p className="text-2xl font-bold text-white">{data.stats.emNegociacao}</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Prazo Médio</p>
                <p className="text-2xl font-bold text-white">{data.stats.prazoMedio} dias</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendência */}
      <Card className="bg-slate-800/50 border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-white">Evolução de Vendas — Acompanhamento Acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.tendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="data" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="acumulado" stroke="#3b82f6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Oportunidades */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Oportunidades em Aberto — Prioridade por Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                <th className="pb-3">Cliente</th>
                <th className="pb-3">Valor</th>
                <th className="pb-3">Estágio</th>
                <th className="pb-3">Vendedor</th>
                <th className="pb-3">Dias</th>
              </tr>
            </thead>
            <tbody>
              {data.oportunidades.slice(0, 15).map((opp, i) => (
                <tr key={i} className="border-b border-slate-800 text-sm">
                  <td className="py-3 text-white">{opp.nome.substring(0, 30)}</td>
                  <td className="py-3 text-green-400 font-medium">{formatCurrency(opp.valor)}</td>
                  <td className="py-3">
                    <Badge className="bg-blue-500/20 text-blue-400">{opp.estagio}</Badge>
                  </td>
                  <td className="py-3 text-slate-400">{opp.vendedor}</td>
                  <td className="py-3">
                    <Badge className={opp.dias > 30 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}>
                      {opp.dias}d
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
