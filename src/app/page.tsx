'use client';

import { DashboardGrid } from '@/components/DashboardGrid';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useApp } from './providers';

export default function DashboardPage() {
  const { connected } = useApp();

  return (
    <div className="min-h-screen bg-asi-bg grid-pattern radial-glow">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-asi-primary/10 via-transparent to-asi-secondary/10 rounded-full blur-3xl animate-float" />
      </div>

      <Header />
      
      <div className="relative z-10 flex min-h-[calc(100vh-64px)]">
        <Sidebar />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <DashboardGrid />
        </main>
      </div>

      <div className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
        connected 
          ? 'bg-asi-primary/20 text-asi-primary border border-asi-primary/30' 
          : 'bg-asi-danger/20 text-asi-danger border border-asi-danger/30'
      }`}>
        {connected ? '● Connected' : '○ Disconnected'}
      </div>
    </div>
  );
}