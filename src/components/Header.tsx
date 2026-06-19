'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bot, Zap, Shield, Activity, Settings, Bell, Search, Command } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/app/providers';

export function Header() {
  const { connected, agents, approvals, addMessage } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const activeAgents = agents.filter(a => a.status === 'working' || a.status === 'thinking').length;
  const pendingApprovals = approvals.filter(a => a.status === 'pending').length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
    if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
      setSearchOpen(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-asi-border/50 h-16">
        <div className="max-w-full h-full px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden btn-ghost p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
                className="relative"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-asi-primary to-asi-secondary flex items-center justify-center">
                  <Bot className="w-6 h-6 text-asi-bg" />
                </div>
                <motion.div
                  className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-asi-primary"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div className="hidden sm:block">
                <h1 className="font-display text-xl font-bold text-asi-text">ASI Life Agent</h1>
                <p className="text-xs text-asi-textMuted font-mono">v1.0.0 · Autonomous</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-asi-bgTeritary/50 rounded-xl border border-asi-border/50">
              <Activity className="w-4 h-4 text-asi-primary" />
              <span className="text-sm font-mono text-asi-textDim">
                {activeAgents} active
              </span>
            </div>

            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="btn-ghost p-2 relative"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 280 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="absolute top-full right-0 mt-2 w-72 hidden md:block"
                >
                  <div className="glass-strong rounded-xl p-2">
                    <input
                      type="text"
                      placeholder="Search agents, tasks, tools..."
                      className="input w-full bg-transparent p-2 text-sm placeholder-asi-textMuted"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="btn-ghost p-2 relative" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              {pendingApprovals > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-asi-danger text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingApprovals > 9 ? '9+' : pendingApprovals}
                </span>
              )}
            </button>

            <button className="btn-ghost p-2" aria-label="Settings">
              <Settings className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-asi-bgTeritary/50 border border-asi-border/50">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-asi-primary' : 'bg-asi-danger'}`} />
              <span className="text-xs font-mono text-asi-textDim hidden sm:inline">
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {commandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20"
            onClick={() => setCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="glass-strong w-full max-w-2xl rounded-2xl border border-asi-border/50 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 p-4 border-b border-asi-border/50">
                <Command className="w-5 h-5 text-asi-textMuted" />
                <input
                  type="text"
                  placeholder="Type a command or search... (⌘K to close)"
                  className="flex-1 bg-transparent text-asi-text text-lg font-mono outline-none placeholder-asi-textMuted"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs bg-asi-bgTeritary rounded text-asi-textMuted font-mono">⎋</kbd>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-auto">
                <CommandItem label="New Task" description="Create a new agent task" shortcut="⌘N" />
                <CommandItem label="Approve Pending" description={`${pendingApprovals} approvals waiting`} shortcut="⌘A" />
                <CommandItem label="View Logs" description="Open system log stream" shortcut="⌘L" />
                <CommandItem label="System Metrics" description="View real-time metrics" shortcut="⌘M" />
                <CommandItem label="Agent Settings" description="Configure agent behavior" shortcut="⌘," />
                <CommandItem label="Export Data" description="Export conversation history" shortcut="⌘E" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CommandItem({ label, description, shortcut }: { label: string; description: string; shortcut: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-asi-bgTeritary/50 transition-colors cursor-pointer">
      <div>
        <p className="font-medium text-asi-text">{label}</p>
        <p className="text-xs text-asi-textMuted">{description}</p>
      </div>
      <kbd className="px-2 py-1 text-xs bg-asi-bgTeritary rounded text-asi-textMuted font-mono">{shortcut}</kbd>
    </div>
  );
}