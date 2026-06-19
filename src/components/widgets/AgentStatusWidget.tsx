'use client';

import { motion } from 'framer-motion';
import { Bot, Cpu, MemoryStick, HardDrive, Activity, Zap, CheckCircle, AlertCircle, PauseCircle, Loader2 } from 'lucide-react';
import { useApp } from '@/app/providers';

const statusConfig = {
  idle: { icon: Bot, color: 'asi-textMuted', label: 'Idle', pulse: false },
  thinking: { icon: Loader2, color: 'asi-warning', label: 'Thinking', pulse: true },
  working: { icon: Zap, color: 'asi-primary', label: 'Working', pulse: true },
  waiting_approval: { icon: AlertCircle, color: 'asi-accent', label: 'Waiting Approval', pulse: true },
  completed: { icon: CheckCircle, color: 'asi-primary', label: 'Completed', pulse: false },
  error: { icon: AlertCircle, color: 'asi-danger', label: 'Error', pulse: true },
  paused: { icon: PauseCircle, color: 'asi-secondary', label: 'Paused', pulse: false },
};

export function AgentStatusWidget() {
  const { agents } = useApp();

  if (agents.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-asi-bgTeritary flex items-center justify-center mb-6 border border-asi-border/50">
          <Bot className="w-10 h-10 text-asi-textMuted/30" />
        </div>
        <h3 className="text-lg font-display font-semibold text-asi-text mb-2">No agents running</h3>
        <p className="text-asi-textMuted mb-6">Start the Life AI agent to begin autonomous task execution</p>
        <button 
          onClick={() => {
            const event = new CustomEvent('start-life-ai-agent');
            window.dispatchEvent(event);
          }}
          className="btn-primary px-6 py-3 text-lg flex items-center gap-2 mx-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start Life AI Agent
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Total Agents" value={agents.length} icon={Bot} color="asi-primary" />
        <StatCard label="Active" value={agents.filter(a => a.status === 'working' || a.status === 'thinking').length} icon={Activity} color="asi-warning" />
        <StatCard label="Completed" value={agents.reduce((sum, a) => sum + a.taskCount, 0)} icon={CheckCircle} color="asi-primary" />
        <StatCard label="Errors" value={agents.reduce((sum, a) => sum + a.errorCount, 0)} icon={AlertCircle} color="asi-danger" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="panel p-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <motion.div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusConfig[agent.status].color}/20`}
                  animate={{ scale: statusConfig[agent.status].pulse ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {(() => {
                    const Icon = statusConfig[agent.status].icon;
                    const color = statusConfig[agent.status].color;
                    return <Icon className={`w-5 h-5 ${color}`} />;
                  })()}
                </motion.div>
                <div className="min-w-0">
                  <p className="font-medium text-asi-text truncate">{agent.config.name}</p>
                  <p className="text-xs text-asi-textMuted font-mono">{agent.id.slice(0, 8)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig[agent.status].color}/20 text-${statusConfig[agent.status].color}`}>
                  {statusConfig[agent.status].label}
                </span>
              </div>
            </div>

            {agent.currentTask && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-asi-border/50"
              >
                <p className="text-xs text-asi-textMuted mb-1">Current Task</p>
                <p className="text-sm text-asi-text font-mono truncate">{agent.currentTask.slice(0, 12)}</p>
              </motion.div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <MetricItem label="CPU" value={`${Math.round(agent.metrics.cpu)}%`} icon={Cpu} />
              <MetricItem label="Memory" value={`${Math.round(agent.metrics.memory)}%`} icon={MemoryStick} />
              <MetricItem label="Uptime" value={formatUptime(agent.metrics.uptime)} icon={HardDrive} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-asi-textMuted">{label}</p>
          <p className="font-display font-bold text-asi-text">{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}/20 text-${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="p-2 rounded-xl bg-asi-bgTeritary/50">
      <Icon className="w-4 h-4 text-asi-textMuted mx-auto mb-1" />
      <p className="font-mono font-semibold text-asi-text text-sm">{value}</p>
      <p className="text-xs text-asi-textMuted">{label}</p>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}