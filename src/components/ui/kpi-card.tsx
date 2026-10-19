'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, LucideIcon, Target } from 'lucide-react';
import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// Status thresholds based on design-system.md
const STATUS_THRESHOLDS = {
  success: 70,   // >=70% of target
  warning: 40,    // 40-69% of target
  danger: 0       // <40% of target
};

type StatusVariant = 'success' | 'warning' | 'danger';

interface KpiCardProps {
  title: string;
  value: number | string;
  target?: number;
  format?: 'currency' | 'percent' | 'number' | 'days';
  trend?: number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  showProgress?: boolean;
  sparklineData?: number[]; // Dados para sparkline de tendencia
  sparklineColor?: string;
}

function getStatusFromPercentage(pct: number): StatusVariant {
  if (pct >= STATUS_THRESHOLDS.success) return 'success';
  if (pct >= STATUS_THRESHOLDS.warning) return 'warning';
  return 'danger';
}

const statusStyles: Record<StatusVariant, { bg: string; text: string; border: string; icon: string; sparkline: string }> = {
  success: {
    bg: 'bg-[var(--success-bg)]',
    text: 'text-[var(--success)]',
    border: 'border-l-4 border-l-[var(--success)]',
    icon: 'bg-[var(--success-bg)]',
    sparkline: '#10b981'
  },
  warning: {
    bg: 'bg-[var(--warning-bg)]',
    text: 'text-[var(--warning)]',
    border: 'border-l-4 border-l-[var(--warning)]',
    icon: 'bg-[var(--warning-bg)]',
    sparkline: '#f59e0b'
  },
  danger: {
    bg: 'bg-[var(--danger-bg)]',
    text: 'text-[var(--danger)]',
    border: 'border-l-4 border-l-[var(--danger)]',
    icon: 'bg-[var(--danger-bg)]',
    sparkline: '#ef4444'
  }
};

function formatValue(value: number | string, format?: string): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
      return `R$ ${value.toFixed(0)}`;

    case 'percent':
      return `${value.toFixed(1)}%`;

    case 'days':
      return `${value}d`;

    default:
      return value.toLocaleString('pt-BR');
  }
}

function formatTrend(trend: number): { icon: typeof TrendingUp; label: string; className: string } {
  if (trend > 0) {
    return {
      icon: TrendingUp,
      label: `+${trend.toFixed(1)}%`,
      className: 'text-[var(--success)]'
    };
  }
  if (trend < 0) {
    return {
      icon: TrendingDown,
      label: `${trend.toFixed(1)}%`,
      className: 'text-[var(--danger)]'
    };
  }
  return {
    icon: Minus,
    label: '0%',
    className: 'text-[var(--muted-foreground)]'
  };
}

// Mini Sparkline component
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const chartData = data.map((value, index) => ({ value, index }));
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function KpiCard({
  title,
  value,
  target,
  format = 'number',
  trend,
  icon: Icon,
  description,
  className,
  showProgress = true,
  sparklineData,
  sparklineColor
}: KpiCardProps) {
  // Calculate percentage and status
  const percentage = target && target > 0 ? (Number(value) / target) * 100 : null;
  const status: StatusVariant = percentage !== null ? getStatusFromPercentage(percentage) : 'success';
  const styles = statusStyles[status];

  // Calcular variacao vs meta
  const variationVsMeta = useMemo(() => {
    if (percentage === null) return null;
    const diff = percentage - 100;
    return diff;
  }, [percentage]);

  const trendData = trend !== undefined ? formatTrend(trend) : null;
  const TrendIcon = trendData?.icon;

  // Cor do sparkline: custom ou baseada no status
  const sparklineStrokeColor = sparklineColor || styles.sparkline;

  return (
    <Card className={cn(
      styles.border,
      'bg-[var(--card)] border-[var(--border)] transition-smooth hover-lift',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p className="text-[var(--muted-foreground)] text-sm font-medium mb-1 truncate">
              {title}
            </p>

            {/* Value */}
            <p className="text-3xl font-bold text-[var(--foreground)] tabular-nums">
              {formatValue(value, format)}
            </p>

            {/* Meta + Variacao Badge */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {target !== undefined && target > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <Target className="w-3 h-3" />
                  <span>Meta: {formatValue(target, format)}</span>
                </div>
              )}
              
              {/* Variacao vs Meta Badge - Sempre visivel quando ha meta */}
              {percentage !== null && (
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  status === 'success' && 'bg-emerald-500/10 text-emerald-600',
                  status === 'warning' && 'bg-amber-500/10 text-amber-600',
                  status === 'danger' && 'bg-red-500/10 text-red-500'
                )}>
                  {variationVsMeta !== null && (
                    <>
                      {variationVsMeta >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {variationVsMeta >= 0 ? '+' : ''}{percentage.toFixed(0)}%
                      </span>
                    </>
                  )}
                </div>
              )}
              
              {description && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {description}
                </span>
              )}
            </div>

            {/* Trend Badge */}
            {trendData && TrendIcon && (
              <div className={cn('flex items-center gap-1 mt-3 text-sm font-medium', trendData.className)}>
                <TrendIcon className="w-4 h-4" />
                <span>{trendData.label}</span>
                <span className="text-[var(--muted-foreground)] text-xs ml-1">
                  vs período anterior
                </span>
              </div>
            )}
          </div>

          {/* Icon + Sparkline column */}
          <div className="flex flex-col items-end gap-2">
            {sparklineData && sparklineData.length > 0 && (
              <div className="w-20 h-10">
                <Sparkline data={sparklineData} color={sparklineStrokeColor} height={40} />
              </div>
            )}
            {Icon && (
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                styles.icon
              )}>
                <Icon className={cn('w-6 h-6', styles.text)} />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && percentage !== null && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Progresso</span>
              <span className={cn('font-medium tabular-nums', styles.text)}>
                {percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-[var(--secondary)] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  percentage === 100 ? 'bg-[var(--success)]' : `bg-[var(--${status})]`
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact variant for dense layouts
export function KpiCardCompact({
  title,
  value,
  format = 'number',
  icon: Icon,
  status = 'success'
}: Omit<KpiCardProps, 'target' | 'showProgress' | 'trend' | 'description'> & { status?: StatusVariant }) {
  const styles = statusStyles[status];

  return (
    <div className={cn(
      'p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] transition-smooth hover-lift'
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--muted-foreground)] truncate">{title}</p>
          <p className="text-xl font-bold text-[var(--foreground)] tabular-nums mt-1">
            {formatValue(value, format)}
          </p>
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', styles.icon)}>
            <Icon className={cn('w-5 h-5', styles.text)} />
          </div>
        )}
      </div>
    </div>
  );
}

// Grid layout for KPI cards
interface KpiGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function KpiGrid({ children, columns = 4, className }: KpiGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn('grid gap-6', gridCols[columns], className)}>
      {children}
    </div>
  );
}
