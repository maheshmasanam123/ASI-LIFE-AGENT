'use client';

import { DashboardGrid } from '@/components/DashboardGrid';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useApp } from '@/app/providers';
import { useEffect, useState } from 'react';
import { Brain, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { connected } = useApp();
  const [hasProvider, setHasProvider] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/control-center')
      .then(r => r.json())
      .then(data => {
        setHasProvider(Object.keys(data.providers || {}).some(id => data.providers[id]?.apiKey && !data.providers[id]?.apiKey.startsWith('•••')));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-asi-bg grid-pattern radial-glow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-asi-primary" />
      </div>
    );
  }

  if (!hasProvider) {
    return (
      <div className="min-h-screen bg-asi-bg grid-pattern radial-glow flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-asi-primary/20 flex items-center justify-center">
            <Brain className="w-10 h-10 text-asi-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-asi-text mb-4">Welcome to ASI Life Agent</h1>
          <p className="text-asi-textMuted mb-8">No AI provider configured. Please add an API key to start using the agent.</p>
          <Link href="/control-center" className="btn-primary inline-flex items-center gap-2 w-full justify-center py-3">
            <ExternalLink className="w-4 h-4" />
            Configure Provider
          </Link>
        </div>
      </div>
    );
  }

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