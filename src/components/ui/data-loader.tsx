'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, AlertCircle, Inbox } from 'lucide-react';

interface DataLoaderProps {
  status: 'loading' | 'empty' | 'error' | 'success';
  children: React.ReactNode;
  className?: string;
  emptyMessage?: string;
  errorMessage?: string;
  lastUpdated?: string;
}

const statusConfig = {
  loading: {
    icon: null,
    title: 'Carregando...',
    variant: 'skeleton'
  },
  empty: {
    icon: Inbox,
    title: 'Nenhum dado encontrado',
    variant: 'empty'
  },
  error: {
    icon: AlertCircle,
    title: 'Erro ao carregar',
    variant: 'error'
  },
  success: {
    icon: null,
    title: '',
    variant: 'success'
  }
};

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-slate-700 rounded" />
            <div className="h-8 w-32 bg-slate-700 rounded" />
          </div>
          <div className="h-12 w-12 bg-slate-700 rounded-xl" />
        </div>
        {/* Progress bar skeleton */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-slate-700 rounded" />
            <div className="h-3 w-8 bg-slate-700 rounded" />
          </div>
          <div className="h-2 w-full bg-slate-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message?: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <p className="text-slate-400 text-sm">
        {message || 'Nenhum dado disponível'}
      </p>
    </div>
  );
}

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <p className="text-red-400 text-sm font-medium mb-1">
        {message || 'Erro ao carregar dados'}
      </p>
      <p className="text-slate-500 text-xs">
        Tente novamente em alguns instantes
      </p>
    </div>
  );
}

export function DataLoader({
  status,
  children,
  className,
  emptyMessage,
  errorMessage,
  lastUpdated
}: DataLoaderProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('relative', className)}>
      {/* Last updated timestamp */}
      {status === 'success' && lastUpdated && (
        <div className="absolute top-0 right-0 flex items-center gap-2 text-xs text-slate-500 mb-2">
          <span>Atualizado há</span>
          <span className="font-mono">{lastUpdated}</span>
        </div>
      )}

      {/* Loading state - show skeleton grid */}
      {status === 'loading' && (
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {status === 'empty' && (
        <EmptyState message={emptyMessage} icon={Inbox} />
      )}

      {/* Error state */}
      {status === 'error' && (
        <ErrorState message={errorMessage} />
      )}

      {/* Success state */}
      {status === 'success' && children}
    </div>
  );
}

// Skeleton para gráficos
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-slate-800/50 border border-slate-700 rounded-xl p-6"
      style={{ height }}
    >
      <div className="h-full flex items-end justify-around gap-2">
        {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((h, i) => (
          <div
            key={i}
            className="w-8 bg-slate-700 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Skeleton para tabela
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex gap-4 pb-4 border-b border-slate-700 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-24 bg-slate-700 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-slate-800 last:border-0">
          <div className="h-4 w-32 bg-slate-700 rounded" />
          <div className="h-4 w-20 bg-slate-700 rounded" />
          <div className="h-4 w-24 bg-slate-700 rounded" />
          <div className="h-4 w-16 bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );
}
