'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';

interface PipelineData {
  funil: Array<{ estagio: string; quantidade: number; valor: number; cor: string }>;
  alertas: Array<{ tipo: string; mensagem: string; quantidade: number }>;
  frios: Array<{ nome: string; dias: number; valor: number; vendedor: string }>;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

export default function PipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pipeline-detail')
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

  const maxQtd = Math.max(...data.funil.map(f => f.quantidade));

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pipeline de Vendas</h1>
        <p className="text-slate-400 text-sm mt-1">Visualize o funil e identifique oportunidades</p>
      </div>

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {data.alertas.map((alerta, i) => (
            <Card key={i} className="bg-red-900/20 border-red-800/50">
              <CardContent className="p-4 flex items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-white font-medium">{alerta.mensagem}</p>
                  <p className="text-red-400 text-2xl font-bold">{alerta.quantidade}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Funil */}
      <Card className="bg-slate-800/50 border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-white">Funil de Conversão — Etapas do Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.funil.map((etapa, i) => {
              const largura = maxQtd > 0 ? (etapa.quantidade / maxQtd) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-slate-400 text-sm">{etapa.estagio}</div>
                  <div className="flex-1">
                    <div className="h-10 bg-slate-700 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-4 transition-all"
                        style={{ width: `${largura}%`, backgroundColor: etapa.cor }}
                      >
                        <span className="text-white font-bold">{etapa.quantidade}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 text-right text-slate-400 text-sm">
                    {formatCurrency(etapa.valor)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Oportunidades Frias */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-yellow-400" />
            Oportunidades Frias — Sem Movimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.frios.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Nenhuma oportunidade fria encontrada</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Vendedor</th>
                  <th className="pb-3">Dias sem Movimento</th>
                </tr>
              </thead>
              <tbody>
                {data.frios.map((item, i) => (
                  <tr key={i} className="border-b border-slate-800 text-sm">
                    <td className="py-3 text-white">{item.nome.substring(0, 40)}</td>
                    <td className="py-3 text-green-400 font-medium">{formatCurrency(item.valor)}</td>
                    <td className="py-3 text-slate-400">{item.vendedor}</td>
                    <td className="py-3">
                      <Badge className="bg-red-500/20 text-red-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.dias} dias
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
