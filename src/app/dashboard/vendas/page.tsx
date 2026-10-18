'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card';
import { DataLoader } from '@/components/ui/data-loader';
import { formatCompactCurrency } from '@/lib/utils';
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

export default function VendasPage() {
  const [data, setData] = useState<VendasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/vendas-detail')
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(d => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Determine data status for DataLoader
  const dataStatus = loading ? 'loading' : error ? 'error' : !data ? 'empty' : 'success';

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Análise de Vendas</h1>
        <p className="text-slate-400 text-sm mt-1">Acompanhe o desempenho e tendências</p>
      </div>

      {/* Stats Row */}
      <DataLoader status={dataStatus}>
        {data && (
          <KpiGrid columns={4}>
            <KpiCard
              title="Total Oportunidades"
              value={data.stats.totalOportunidades}
              format="number"
              icon={Filter}
            />
            <KpiCard
              title="Valor em Pipeline"
              value={data.stats.valorTotal}
              format="currency"
              icon={TrendingUp}
            />
            <KpiCard
              title="Em Negociação"
              value={data.stats.emNegociacao}
              format="number"
              icon={Calendar}
            />
            <KpiCard
              title="Prazo Médio"
              value={data.stats.prazoMedio}
              format="days"
              icon={Calendar}
              description="dias"
            />
          </KpiGrid>
        )}
      </DataLoader>

      {/* Tendência */}
      {data && (
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
                  <YAxis stroke="#64748b" tickFormatter={(v) => formatCompactCurrency(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="acumulado" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oportunidades */}
      {data && (
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
                    <td className="py-3 text-green-400 font-medium">{formatCompactCurrency(opp.valor)}</td>
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
      )}
    </div>
  );
}
