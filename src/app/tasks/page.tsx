'use client';

import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';
import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget';
import { LogStreamWidget } from '@/components/widgets/LogStreamWidget';
import { ApprovalQueueWidget } from '@/components/widgets/ApprovalQueueWidget';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Tasks</h1>
        <span className="text-sm text-asi-textMuted">Task queue management and monitoring</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <TaskQueueWidget />
        <AgentStatusWidget />
        <SystemMetricsWidget />
        <ApprovalQueueWidget />
        <LogStreamWidget />
      </div>
    </div>
  );
}