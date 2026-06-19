'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Filter, X, Download, Pause, Play, Trash2, Copy, Search } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/app/providers';

export function LogStreamWidget() {
  const { messages } = useApp();
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [paused, setPaused] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filteredMessages = messages
    .filter(m => {
      if (levelFilter !== 'all' && m.metadata.level !== levelFilter) return false;
      if (filter && !m.content.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    })
    .slice(-500);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages, scrollToBottom]);

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  const copyLogs = () => {
    const text = filteredMessages.map(m => 
      `[${m.createdAt.toISOString()}] [${m.metadata.level || 'info'}] ${m.content}`
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  const downloadLogs = () => {
    const text = filteredMessages.map(m => 
      `[${m.createdAt.toISOString()}] [${m.metadata.level || 'info'}] ${m.content}`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asi-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    // Would need to clear from context
  };

  return (
    <div className="h-full flex flex-col panel-glow p-0 overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-asi-border/50 flex items-center gap-2 flex-wrap">
          <Terminal className="w-4 h-4 text-asi-textMuted" />
          <span className="font-mono text-sm text-asi-textDim">Log Stream</span>
          
          <div className="flex-1 flex items-center justify-end gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-asi-textMuted" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="input py-1 px-6 pl-8 text-xs w-40 bg-asi-bgTeritary/50 border-asi-border/50"
              />
            </div>
            
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value as any)}
              className="input py-1 px-2 text-xs bg-asi-bgTeritary/50 border-asi-border/50 w-auto"
            >
              <option value="all">All</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>

            <label className="flex items-center gap-1 text-xs text-asi-textMuted cursor-pointer">
              <input type="checkbox" checked={showTimestamps} onChange={e => setShowTimestamps(e.target.checked)} className="w-3 h-3 accent-asi-primary" />
              Timestamps
            </label>

            <button onClick={copyLogs} className="btn-ghost p-1.5 hover:bg-asi-bgTeritary/50" title="Copy"><Copy className="w-4 h-4" /></button>
            <button onClick={downloadLogs} className="btn-ghost p-1.5 hover:bg-asi-bgTeritary/50" title="Download"><Download className="w-4 h-4" /></button>
            <button onClick={clearLogs} className="btn-ghost p-1.5 hover:bg-asi-bgTeritary/50" title="Clear"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => setPaused(!paused)} className={`btn-ghost p-1.5 ${paused ? 'text-asi-accent' : ''}`} title={paused ? 'Resume' : 'Pause'}>
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div 
          ref={logContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1"
          style={{ fontFamily: 'JetBrains Mono, Fira Code, monospace' }}
        >
          <AnimatePresence mode="popLayout">
            {filteredMessages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-2 ${message.metadata.level === 'error' ? 'text-asi-danger' : message.metadata.level === 'warn' ? 'text-asi-warning' : message.metadata.level === 'debug' ? 'text-asi-textMuted' : 'text-asi-text'}`}
              >
                {showTimestamps && (
                  <span className="text-asi-textMuted/50 whitespace-nowrap shrink-0 font-mono">
                    {message.createdAt.toLocaleTimeString()}.{message.createdAt.getMilliseconds().toString().padStart(3, '0')}
                  </span>
                )}
                {message.metadata.level ? (
                  <span className={`whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    message.metadata.level === 'error' ? 'bg-asi-danger/20 text-asi-danger' :
                    message.metadata.level === 'warn' ? 'bg-asi-warning/20 text-asi-warning' :
                    message.metadata.level === 'debug' ? 'bg-asi-textMuted/20 text-asi-textMuted' :
                    'bg-asi-primary/20 text-asi-primary'
                  }`}>
                    {String(message.metadata.level).toUpperCase()}
                  </span>
                ) : null}
                <span className="whitespace-pre-wrap break-all flex-1">{message.content}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          
           {autoScroll && <div ref={(el) => { if (el) scrollToBottom(); }} />}
        </div>

        {!autoScroll && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-asi-accent/20 text-asi-accent rounded-xl text-sm font-medium border border-asi-accent/30 shadow-lg"
          >
            <span className="flex items-center gap-2">
              <span>Paused - </span>
              <button onClick={() => setAutoScroll(true)} className="btn-primary text-xs px-3">Scroll to bottom</button>
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
