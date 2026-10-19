'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Users, Filter, Settings, User, Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { href: '/dashboard/vendas', icon: TrendingUp, label: 'Vendas' },
  { href: '/dashboard/coaching', icon: Users, label: 'Coaching' },
  { href: '/dashboard/pipeline', icon: Filter, label: 'Pipeline' },
];

// Mock user data - substituir por dados reais do auth
const mockUser = {
  name: 'João Silva',
  role: 'Gerente Comercial',
  avatar: null, // ou URL da imagem
};

function SyncTimestamp() {
  const [lastSync, setLastSync] = useState<string>('agora mesmo');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    // Atualizar timestamp a cada minuto
    const interval = setInterval(() => {
      setLastSync('alguns minutos');
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simular refresh - substituir por chamada real
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastSync('agora mesmo');
    setIsRefreshing(false);
  };
  
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Clock className="w-3 h-3" />
      <span>Sincronizado: {lastSync}</span>
      <button 
        onClick={handleRefresh}
        className={cn(
          'p-1 rounded hover:bg-slate-800 transition-colors',
          isRefreshing && 'animate-spin'
        )}
        title="Sincronizar agora"
      >
        <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
      </button>
    </div>
  );
}

function UserFooter() {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
      >
        {mockUser.avatar ? (
          <img 
            src={mockUser.avatar} 
            alt={mockUser.name}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {mockUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-white truncate">{mockUser.name}</p>
          <p className="text-xs text-slate-500 truncate">{mockUser.role}</p>
        </div>
      </button>
      
      {/* Tooltip com info detalhada */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-3 z-50">
          <p className="text-sm font-medium text-white mb-1">{mockUser.name}</p>
          <p className="text-xs text-slate-400 mb-2">{mockUser.role}</p>
          <div className="pt-2 border-t border-slate-700">
            <button className="w-full text-left text-xs text-blue-400 hover:text-blue-300">
              Ver perfil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">SV Elétrica</h1>
          <p className="text-xs text-slate-500 mt-1">Painel Comercial</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer com User + Sync */}
        <div className="border-t border-slate-800 space-y-2 p-4">
          {/* Sync timestamp */}
          <SyncTimestamp />
          
          {/* User info */}
          <UserFooter />
          
          {/* Settings link */}
          <div className="pt-2 border-t border-slate-800/50">
            <div className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer transition-colors">
              <Settings className="w-4 h-4" />
              <span className="text-sm">Configurações</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
