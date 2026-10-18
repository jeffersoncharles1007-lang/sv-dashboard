'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer
} from 'recharts';
import { Users, Target, AlertTriangle, TrendingUp, Award } from 'lucide-react';

interface CoachingData {
  success?: boolean;
  stats: {
    totalAuditado: number;
    notaGeral: string;
    acimaMeta: number;
    clientesAguardando: number;
  };
  coaching: Array<{
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
  recommendations: string[];
}

const COLORS = {
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  primary: '#3b82f6',
};

function getColor(value: number): string {
  if (value >= 70) return COLORS.success;
  if (value >= 40) return COLORS.warning;
  return COLORS.danger;
}

export default function CoachingPage() {
  const [data, setData] = useState<CoachingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/coaching')
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

  if (!data || !data.success) {
    return <div className="p-8 text-center text-slate-400">Sem dados de coaching disponíveis</div>;
  }

  const coachingData = data as any;
  
  // Preparar dados do radar
  const passosLabels = ['Acolhimento', 'Sondagem', 'Necessidade', 'CVB', 'Fechamento', 'Encerramento'];
  const passosKeys = ['acolhimento', 'sondagem', 'necessidade', 'cvb', 'fechamento', 'encerramento'];
  
  // Média geral
  const radarData = passosKeys.map((key, i) => {
    const valores = coachingData.coaching.map((c: any) => c.passos[key]);
    const media = valores.reduce((a: number, b: number) => a + b, 0) / valores.length;
    return {
      subject: passosLabels[i],
      A: Math.round(media),
      fullMark: 100
    };
  });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Coaching de Atendimento</h1>
        <p className="text-slate-400 text-sm mt-1">Análise técnica dos 6 passos de vendas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Atendimentos</p>
              <p className="text-2xl font-bold text-white">{coachingData.stats.totalAuditado}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Nota Geral</p>
              <p className="text-2xl font-bold text-white">{coachingData.stats.notaGeral}<span className="text-lg text-slate-400">/6</span></p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Acima da Meta (≥4)</p>
              <p className="text-2xl font-bold text-green-400">{coachingData.stats.acimaMeta}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Aguardando Resposta</p>
              <p className="text-2xl font-bold text-yellow-400">{coachingData.stats.clientesAguardando}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Radar + Detalhes */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        
        {/* Radar */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Média da Equipe — 6 Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Radar name="Média" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Detalhamento por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {coachingData.coaching.map((vendedor: any, idx: number) => (
                <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{vendedor.vendedorNome}</h3>
                      <p className="text-xs text-slate-400">{vendedor.totalAtendimentos} atendimentos</p>
                    </div>
                    <Badge className={
                      parseFloat(vendedor.notaMedia) >= 4 ? 'bg-green-600' :
                      parseFloat(vendedor.notaMedia) >= 3 ? 'bg-yellow-600' : 'bg-red-600'
                    }>
                      {vendedor.notaMedia}/6
                    </Badge>
                  </div>
                  <div className="grid grid-cols-6 gap-2 text-center">
                    {passosKeys.map((key, i) => {
                      const value = vendedor.passos[key];
                      return (
                        <div key={key} className="text-center">
                          <div className="text-lg font-bold" style={{ color: getColor(value) }}>
                            {value}%
                          </div>
                          <div className="text-xs text-slate-500">{passosLabels[i]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recomendações de Coaching</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {coachingData.recommendations.map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 text-sm">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
