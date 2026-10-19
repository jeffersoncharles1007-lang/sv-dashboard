'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus } from 'lucide-react';

type StatusLevel = 'success' | 'warning' | 'danger' | 'neutral';

interface StatusBadgeProps {
  status: StatusLevel;
  label?: string; // Label personalizado (ex: "Crítico", "Bom", "Atenção")
  value?: number; // Valor para calcular variação automática
  target?: number; // Meta para calcular variação
  showIcon?: boolean;
  showValue?: boolean; // Mostrar valor numérico
  format?: 'percent' | 'currency' | 'number';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Configuração de status seguindo boas práticas do NotebookLM
const statusConfig: Record<StatusLevel, {
  bg: string;
  text: string;
  border: string;
  icon: typeof CheckCircle;
  defaultLabel: string;
  colorClass: string;
}> = {
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    icon: CheckCircle,
    defaultLabel: 'No alvo',
    colorClass: 'emerald'
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    icon: AlertTriangle,
    defaultLabel: 'Atenção',
    colorClass: 'amber'
  },
  danger: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
    icon: TrendingDown,
    defaultLabel: 'Crítico',
    colorClass: 'red'
  },
  neutral: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20',
    icon: Minus,
    defaultLabel: 'Neutro',
    colorClass: 'slate'
  }
};

// Helper para calcular status baseado em percentage
function getStatusFromPercentage(pct: number): StatusLevel {
  if (pct >= 70) return 'success';
  if (pct >= 40) return 'warning';
  return 'danger';
}

// Helper para calcular variação
function calculateVariation(value: number, target: number): { direction: 'up' | 'down' | 'flat'; percent: number } {
  const pct = (value / target) * 100;
  const diff = pct - 100;
  
  if (Math.abs(diff) < 0.5) return { direction: 'flat', percent: 0 };
  if (diff > 0) return { direction: 'up', percent: diff };
  return { direction: 'down', percent: Math.abs(diff) };
}

function formatVariationValue(value: number, format?: string): string {
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'currency':
      if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
      return `R$ ${value.toFixed(0)}`;
    default:
      return value.toLocaleString('pt-BR');
  }
}

// Componente principal
export function StatusBadge({
  status,
  label,
  value,
  target,
  showIcon = true,
  showValue = false,
  format,
  size = 'md',
  className
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  // Se tem valor e target, calcular variação automaticamente
  const variation = value !== undefined && target !== undefined 
    ? calculateVariation(value, target) 
    : null;
  
  // Se não tem label mas tem variação, gerar label descritivo
  const displayLabel = label || config.defaultLabel;
  
  // Se tem variação, gerar label contextual
  const contextualLabel = variation && !label
    ? `${variation.percent.toFixed(0)}% ${variation.direction === 'up' ? 'acima' : variation.direction === 'down' ? 'abaixo' : 'no'} meta`
    : displayLabel;
  
  // Tamanhos
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };
  
  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium border transition-colors',
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      {/* Ícone de status */}
      {showIcon && (
        <Icon className={cn(iconSizes[size], 'shrink-0')} />
      )}
      
      {/* Label principal */}
      <span className="shrink-0">{contextualLabel}</span>
      
      {/* Valor numérico se solicitado */}
      {showValue && variation && (
        <span className={cn(
          'ml-1 tabular-nums',
          variation.direction === 'up' && 'text-emerald-600',
          variation.direction === 'down' && 'text-red-600',
          variation.direction === 'flat' && 'text-slate-500'
        )}>
          {variation.direction === 'up' ? '+' : variation.direction === 'down' ? '-' : ''}
          {variation.percent.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

// Variante simplificada para uso em tabelas
export function StatusDot({ 
  status, 
  className 
}: { 
  status: StatusLevel; 
  className?: string 
}) {
  const config = statusConfig[status];
  
  return (
    <div className={cn('w-2 h-2 rounded-full', className)}>
      <div className={cn('w-full h-full rounded-full', config.bg)} />
    </div>
  );
}

// Helper para usar em contexts onde se espera um status automático
export function AutoStatusBadge({
  percentage,
  label,
  size = 'md',
  className
}: {
  percentage: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const status = getStatusFromPercentage(percentage);
  
  return (
    <StatusBadge
      status={status}
      label={label}
      showValue
      size={size}
      className={className}
    />
  );
}
