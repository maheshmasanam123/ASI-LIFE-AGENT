'use client';

import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { LogStreamWidget } from '@/components/widgets/LogStreamWidget';
import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget';
import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';

export default function FilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Files</h1>
        <span className="text-sm text-asi-textMuted">File system management and operations</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <TaskQueueWidget />
        <LogStreamWidget />
        <SystemMetricsWidget />
        <AgentStatusWidget />
      </div>
    </div>
  );
}