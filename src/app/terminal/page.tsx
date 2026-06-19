'use client';

import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget';
import { LogStreamWidget } from '@/components/widgets/LogStreamWidget';
import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';

export default function TerminalPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Terminal</h1>
        <span className="text-sm text-asi-textMuted">System terminal and process management</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <SystemMetricsWidget />
        <LogStreamWidget />
        <TaskQueueWidget />
        <AgentStatusWidget />
      </div>
    </div>
  );
}