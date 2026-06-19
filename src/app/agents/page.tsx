'use client';

import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';
import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget';
import { LogStreamWidget } from '@/components/widgets/LogStreamWidget';
import { ApprovalQueueWidget } from '@/components/widgets/ApprovalQueueWidget';

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Agents</h1>
        <span className="text-sm text-asi-textMuted">Manage and monitor autonomous agents</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <AgentStatusWidget />
        <TaskQueueWidget />
        <SystemMetricsWidget />
        <LogStreamWidget />
        <ApprovalQueueWidget />
      </div>
    </div>
  );
}