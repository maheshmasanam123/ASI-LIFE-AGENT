'use client';

import { ChatWidget } from '@/components/widgets/ChatWidget';
import { AgentStatusWidget } from '@/components/widgets/AgentStatusWidget';
import { TaskQueueWidget } from '@/components/widgets/TaskQueueWidget';
import { ApprovalQueueWidget } from '@/components/widgets/ApprovalQueueWidget';

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-asi-text">Chat</h1>
        <span className="text-sm text-asi-textMuted">Communicate with your AI agent</span>
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatWidget />
        </div>
        <AgentStatusWidget />
        <TaskQueueWidget />
        <ApprovalQueueWidget />
      </div>
    </div>
  );
}