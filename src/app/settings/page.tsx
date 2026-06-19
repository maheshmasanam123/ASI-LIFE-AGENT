'use client';

import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';
import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget';
import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { LogStreamWidget } from '@/components/widgets/LogStreamWidget';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Settings</h1>
        <span className="text-sm text-asi-textMuted">Configure your ASI Life Agent</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <AgentStatusWidget />
        <SystemMetricsWidget />
        <TaskQueueWidget />
        <LogStreamWidget />
      </div>
    </div>
  );
}