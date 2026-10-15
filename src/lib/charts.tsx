'use client';

import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { STAGE_NAMES } from './constants';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

// Gráfico de Evolução (linhas)
interface EvolutionChartProps {
  data: Array<{
    date: string;
    created: number;
    won: number;
    lost: number;
    value: number;
  }>;
}

export function EvolutionChart({ data }: EvolutionChartProps) {
  // Últimos 14 dias
  const chartData = data.slice(-14);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          className="text-xs"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          className="text-xs"
        />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)'
          }}
        />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="created" 
          stroke="#3b82f6" 
          fillOpacity={1} 
          fill="url(#colorCreated)" 
          name="Novos"
        />
        <Area 
          type="monotone" 
          dataKey="won" 
          stroke="#10b981" 
          fillOpacity={1} 
          fill="url(#colorWon)" 
          name="Ganhos"
        />
        <Area 
          type="monotone" 
          dataKey="lost" 
          stroke="#ef4444" 
          fillOpacity={1} 
          fill="url(#colorLost)" 
          name="Perdidos"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Gráfico de Funil (barras horizontais)
interface FunnelChartProps {
  data: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
}

export function PipelineFunnelChart({ data }: FunnelChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const width = (item.count / maxCount) * 100;
        const color = index < 3 ? COLORS[index] : index === 3 ? '#10b981' : '#ef4444';
        
        return (
          <div key={item.stage} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{item.stage}</span>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{item.count} oportunidades</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center px-3"
                style={{ 
                  width: `${Math.max(width, 5)}%`, 
                  backgroundColor: color 
                }}
              >
                <span className="text-white text-xs font-medium truncate">
                  {item.count > 0 && `${Math.round(width)}%`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Gráfico de Distribution por Source/Pipeline
interface SourceChartProps {
  data: Array<{
    source: string;
    count: number;
    value: number;
  }>;
}

export function SourcePieChart({ data }: SourceChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  
  return (
    <div className="flex items-center gap-8">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="count"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [
              `${value} (${((value as number / total) * 100).toFixed(1)}%)`,
              name
            ]}
            contentStyle={{ 
              borderRadius: '8px', 
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.slice(0, 5).map((item, index) => (
          <div key={item.source} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }} 
            />
            <span className="text-sm flex-1">{item.source}</span>
            <span className="text-sm font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gráfico de Performance por Vendedor (barras)
interface VendorChartProps {
  data: Array<{
    name: string;
    total: number;
    won: number;
    lost: number;
    value: number;
    wonValue: number;
  }>;
}

export function VendorBarChart({ data }: VendorChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={data} 
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis 
          dataKey="name" 
          type="category" 
          tick={{ fontSize: 12 }}
          width={90}
        />
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)'
          }}
          formatter={(value) => formatCurrency(value as number)}
        />
        <Legend />
        <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[0, 4, 4, 0]} />
        <Bar dataKey="won" fill="#10b981" name="Ganhos" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Gráfico de Evolução da Receita
interface RevenueChartProps {
  data: Array<{
    date: string;
    value: number;
  }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.slice(-14);
  
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          formatter={(value) => formatCurrency(value as number)}
          contentStyle={{ 
            borderRadius: '8px', 
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)'
          }}
        />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke="#10b981" 
          fillOpacity={1} 
          fill="url(#colorRevenue)" 
          name="Receita"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Gráfico de Pizza simples
interface SimplePieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  colors?: string[];
}

export function SimplePieChart({ data, colors = COLORS }: SimplePieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [
              `${value} (${((value as number / total) * 100).toFixed(1)}%)`,
              ''
            ]}
            contentStyle={{ 
              borderRadius: '8px', 
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: colors[index % colors.length] }} 
            />
            <span className="flex-1 truncate">{item.name}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
