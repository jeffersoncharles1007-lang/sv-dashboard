'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ExecutiveKPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  format?: 'currency' | 'percent' | 'number' | 'days';
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function ExecutiveKPICard({
  title,
  value,
  subtitle,
  trend,
  format = 'number',
  icon,
  variant = 'default'
}: ExecutiveKPICardProps) {
  const variantStyles = {
    default: 'border-l-4 border-l-slate-500',
    success: 'border-l-4 border-l-emerald-500',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-red-500',
  };

  const variantBg = {
    default: '',
    success: 'bg-emerald-50 dark:bg-emerald-950/30',
    warning: 'bg-amber-50 dark:bg-amber-950/30',
    danger: 'bg-red-50 dark:bg-red-950/30',
  };

  const formatValue = (val: number | string, fmt: string) => {
    if (typeof val === 'string') return val;
    switch (fmt) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'days':
        return `${val}d`;
      default:
        return val.toLocaleString('pt-BR');
    }
  };

  return (
    <Card className={`${variantStyles[variant]} ${variantBg[variant]}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value, format)}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div className={`flex items-center mt-2 text-xs ${
            trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'
          }`}>
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : trend < 0 ? (
              <TrendingDown className="w-3 h-3 mr-1" />
            ) : (
              <Minus className="w-3 h-3 mr-1" />
            )}
            <span>
              {trend > 0 ? '+' : ''}{trend}%
              <span className="text-muted-foreground ml-1">vs semana anterior</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
