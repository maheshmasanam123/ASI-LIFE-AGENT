'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/app/providers';
import { AgentStatusWidget } from './widgets/AgentStatusWidget';
import { TaskQueueWidget } from './widgets/TaskQueueWidget';
import { SystemMetricsWidget } from './widgets/SystemMetricsWidget';
import { ChatWidget } from './widgets/ChatWidget';
import { ApprovalQueueWidget } from './widgets/ApprovalQueueWidget';
import { LogStreamWidget } from './widgets/LogStreamWidget';

const widgetComponents: Record<string, React.ComponentType<any>> = {
  agent_status: AgentStatusWidget,
  task_queue: TaskQueueWidget,
  system_metrics: SystemMetricsWidget,
  chat: ChatWidget,
  approval_queue: ApprovalQueueWidget,
  log_stream: LogStreamWidget,
};

export function DashboardGrid() {
  const { widgets } = useApp();
  const visibleWidgets = widgets.filter(w => w.visible);

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        style={{ gridAutoRows: 'minmax(300px, auto)' }}
      >
        {visibleWidgets.map((widget, index) => (
          <motion.div
            key={widget.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="relative"
            style={{
              gridColumn: `span ${widget.position.w}`,
              gridRow: `span ${widget.position.h}`,
            }}
          >
            <WidgetWrapper widget={widget} />
          </motion.div>
        ))}
      </motion.div>

      {visibleWidgets.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-asi-bgTeritary flex items-center justify-center mb-6 border border-asi-border/50">
            <svg className="w-10 h-10 text-asi-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h3 className="text-xl font-display font-semibold text-asi-text mb-2">No widgets visible</h3>
          <p className="text-asi-textMuted mb-6">Add widgets from the sidebar to build your dashboard</p>
          <button className="btn-primary">Add Widget</button>
        </motion.div>
      )}
    </div>
  );
}

function WidgetWrapper({ widget }: { widget: any }) {
  const Component = widgetComponents[widget.type];
  
  return (
    <div className="h-full panel-glow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-medium text-asi-text">{widget.title}</h3>
        <div className="flex items-center gap-1">
          <button className="btn-ghost p-1.5 hover:bg-asi-bgTeritary/50" aria-label="Configure">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button className="btn-ghost p-1.5 hover:bg-asi-bgTeritary/50" aria-label="Refresh">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>
      <div className="h-[calc(100%-60px)] min-h-0">
        {Component ? <Component config={widget.config} /> : <UnknownWidget type={widget.type} />}
      </div>
    </div>
  );
}

function UnknownWidget({ type }: { type: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-xl bg-asi-bgTeritary flex items-center justify-center mb-4 border border-asi-border/50">
        <svg className="w-8 h-8 text-asi-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <p className="text-asi-textMuted font-mono">{type}</p>
      <p className="text-xs text-asi-textMuted/50 mt-1">Widget component not implemented</p>
    </div>
  );
}