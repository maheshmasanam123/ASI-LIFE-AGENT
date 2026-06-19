'use client';

import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget';
import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';
import { LogStreamWidget } from '@/components/widgets/LogStreamWidget';

export default function SystemMetricsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">System Metrics</h1>
        <span className="text-sm text-asi-textMuted">Real-time system performance metrics</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <SystemMetricsWidget />
        <TaskQueueWidget />
        <AgentStatusWidget />
        <LogStreamWidget />
      </div>
    </div>
  );
}