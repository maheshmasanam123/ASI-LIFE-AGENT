'use client';

import { ApprovalQueueWidget } from '@/components/widgets/ApprovalQueueWidget';
import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';
import { LogStreamWidget } from '@/components/widgets/LogStreamWidget';
import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget';

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Approvals</h1>
        <span className="text-sm text-asi-textMuted">Pending approvals for irreversible actions</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <ApprovalQueueWidget />
        <TaskQueueWidget />
        <AgentStatusWidget />
        <SystemMetricsWidget />
        <LogStreamWidget />
      </div>
    </div>
  );
}