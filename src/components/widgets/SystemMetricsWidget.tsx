'use client';

import { motion } from 'framer-motion';
import { Cpu, MemoryStick, HardDrive, Network, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '@/app/providers';
import { useMemo } from 'react';

const metricsConfig = [
  { key: 'cpu', label: 'CPU', icon: Cpu, color: 'asi-primary', unit: '%', max: 100 },
  { key: 'memory', label: 'Memory', icon: MemoryStick, color: 'asi-warning', unit: '%', max: 100 },
  { key: 'disk', label: 'Disk', icon: HardDrive, color: 'asi-secondary', unit: '%', max: 100 },
  { key: 'network.up', label: 'Net Up', icon: Network, color: 'asi-accent', unit: 'MB/s', max: 100 },
  { key: 'network.down', label: 'Net Down', icon: Network, color: 'asi-accent', unit: 'MB/s', max: 100 },
];

export function SystemMetricsWidget() {
  const { metrics } = useApp();

  const history = useMemo(() => {
    if (!metrics) return {};
    return metricsConfig.map(m => ({ key: m.key, value: getNestedValue(metrics, m.key), timestamp: Date.now() }));
  }, [metrics]);

  if (!metrics) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Activity className="w-16 h-16 text-asi-textMuted/30 mb-4 animate-pulse" />
        <p className="text-asi-textMuted">Waiting for metrics...</p>
        <p className="text-xs text-asi-textMuted/50 mt-1">Agent metrics will appear here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {metricsConfig.slice(0, 4).map((config, index) => (
          <motion.div
            key={config.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="panel p-4 relative"
          >
            <MetricCard config={config} value={getNestedValue(metrics, config.key)} />
          </motion.div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-4"
        >
          <h4 className="font-medium text-asi-text mb-3">System Details</h4>
          <div className="space-y-3">
            <DetailRow label="Processes" value={metrics.processes} icon={Activity} />
            <DetailRow label="CPU Load" value={metrics.cpu.toFixed(1) + '%'} icon={TrendingUp} />
            <DetailRow label="Uptime" value={formatUptime(metrics.uptime)} icon={Activity} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel p-4"
        >
          <h4 className="font-medium text-asi-text mb-3">Resource History</h4>
          <div className="space-y-3">
            {metricsConfig.map((config) => (
              <SparklineCard key={config.key} config={config} value={getNestedValue(metrics, config.key)} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MetricCard({ config, value }: { config: typeof metricsConfig[0]; value: number }) {
  const percentage = Math.min(100, Math.max(0, (value / config.max) * 100));
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${config.color}/20 text-${config.color}`}>
            <config.icon className="w-4 h-4" />
          </div>
          <span className="text-sm text-asi-textDim">{config.label}</span>
        </div>
        <span className={`font-display font-bold text-${config.color}`}>{value.toFixed(1)}<span className="text-xs font-normal text-asi-textMuted">{config.unit}</span></span>
      </div>
      <div className="h-2 bg-asi-bgTeritary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r from-${config.color} to-${config.color}/50`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-xl bg-asi-bgTeritary/50">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-asi-textMuted" />
        <span className="text-sm text-asi-textDim">{label}</span>
      </div>
      <span className="font-mono font-medium text-asi-text">{value}</span>
    </div>
  );
}

function SparklineCard({ config, value }: { config: typeof metricsConfig[0]; value: number }) {
  const percentage = Math.min(100, Math.max(0, (value / config.max) * 100));
  const points = Array.from({ length: 20 }, (_, i) => ({
    x: i * 5,
    y: 30 - (Math.random() * 30),
  }));
  const path = `M${points.map(p => `${p.x},${p.y}`).join(' L')}`;
  
  return (
    <div className="p-2 rounded-xl bg-asi-bgTeritary/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <config.icon className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm text-asi-textDim">{config.label}</span>
        </div>
        <span className={`font-mono text-${config.color}`}>{value.toFixed(1)}<span className="text-xs text-asi-textMuted">{config.unit}</span></span>
      </div>
      <svg className="w-full h-12" viewBox="0 0 100 30">
        <defs>
          <linearGradient id={`gradient-${config.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={config.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} stroke="url(#gradient-cpu)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path} stroke={config.color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      </svg>
    </div>
  );
}

function getNestedValue(obj: any, path: string): number {
  return path.split('.').reduce((o, k) => (o || {})[k], obj) || 0;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}