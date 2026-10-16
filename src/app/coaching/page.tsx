'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Users, TrendingUp, AlertTriangle, CheckCircle, Target, Lightbulb } from 'lucide-react';

interface CoachingData {
  stats: {
    totalAuditado: number;
    notaGeral: string;
    acimaMeta: number;
    clientesAguardando: number;
  };
  coaching: Array<{
    vendedorId: string;
    vendedorNome: string;
    totalAtendimentos: number;
    notaMedia: string;
    passos: {
      acolhimento: number;
      sondagem: number;
      necessidade: number;
      cvb: number;
      fechamento: number;
      encerramento: number;
    };
  }>;
  exemplos: {
    melhores: Array<{ vendedor: string; nota: number; cliente: string; observacao: string }>;
    piores: Array<{ vendedor: string; nota: number; cliente: string; observacao: string }>;
  };
  recommendations: string[];
}

const COLORS = {
  verde: '#22c55e',
  amarelo: '#eab308',
  vermelho: '#ef4444',
};

function getColor(value: number) {
  if (value >= 70) return COLORS.verde;
  if (value >= 40) return COLORS.amarelo;
  return COLORS.vermelho;
}

export default function CoachingPage() {
  const [data, setData] = useState<CoachingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetch(`/api/coaching?period=${period}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!data || !data.success) {
    return <div className="p-8 text-center">Sem dados de coaching disponíveis</div>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coachingData = data as any;
  const chartData = coachingData.coaching.map((c: any) => ({
    nome: c.vendedorNome.split(' ')[0],
    nota: parseFloat(c.notaMedia),
    acolhimento: c.passos.acolhimento,
    sondagem: c.passos.sondagem,
    necessidade: c.passos.necessidade,
    cvb: c.passos.cvb,
    fechamento: c.passos.fechamento,
    encerramento: c.passos.encerramento,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Coaching de Atendimento
            </h1>
            <p className="text-gray-400 mt-1">Análise técnica de vendas - 6 passos</p>
          </div>
          
          <div className="flex gap-2">
            {['today', 'week', 'month', 'all'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  period === p 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Tudo'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Atendimentos Auditados</p>
                  <p className="text-3xl font-bold">{coachingData.stats.totalAuditado}</p>
                </div>
                <Target className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Nota Geral</p>
                  <p className="text-3xl font-bold">{coachingData.stats.notaGeral}<span className="text-lg text-gray-400">/6</span></p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Acima da Meta (≥4)</p>
                  <p className="text-3xl font-bold text-green-500">{coachingData.stats.acimaMeta}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Clientes Aguardando</p>
                  <p className="text-3xl font-bold text-yellow-500">{coachingData.stats.clientesAguardando}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Notas */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Nota Média por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="nome" stroke="#9ca3af" />
                  <YAxis domain={[0, 6]} stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                    formatter={(value: number) => [`${value}/6`, 'Nota']}
                  />
                  <Bar dataKey="nota" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getColor(entry.nota * 16.67)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento por Passo */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Detalhamento por Passo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.coaching.map((vendedor: any) => (
                <div key={vendedor.vendedorId} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{vendedor.vendedorNome}</h3>
                      <p className="text-sm text-gray-400">{vendedor.totalAtendimentos} atendimentos</p>
                    </div>
                    <Badge className={`text-lg px-3 py-1 ${
                      parseFloat(vendedor.notaMedia) >= 4 
                        ? 'bg-green-600' 
                        : parseFloat(vendedor.notaMedia) >= 3 
                          ? 'bg-yellow-600' 
                          : 'bg-red-600'
                    }`}>
                      {vendedor.notaMedia}/6
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-3">
                    {Object.entries(vendedor.passos).map(([key, value]: [string, any]) => (
                      <div key={key} className="text-center">
                        <div 
                          className="text-2xl font-bold mb-1"
                          style={{ color: getColor(value) }}
                        >
                          {value}%
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recomendações */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coachingData.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                  <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exemplos */}
        <div className="grid grid-cols-2 gap-6">
          {/* Melhor */}
          <Card className="bg-gray-900 border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                Melhor Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coachingData.exemplos.melhores.map((ex, i) => (
                <div key={i} className="bg-green-900/20 rounded-lg p-4 mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{ex.vendedor}</span>
                    <Badge className="bg-green-600">{ex.nota}/6</Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-1">Cliente: {ex.cliente}</p>
                  <p className="text-sm text-gray-400">{ex.observacao}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* A melhorar */}
          <Card className="bg-gray-900 border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                Atendimento a Melhorar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coachingData.exemplos.piores.map((ex, i) => (
                <div key={i} className="bg-red-900/20 rounded-lg p-4 mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{ex.vendedor}</span>
                    <Badge className="bg-red-600">{ex.nota}/6</Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-1">Cliente: {ex.cliente}</p>
                  <p className="text-sm text-gray-400">{ex.observacao}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
