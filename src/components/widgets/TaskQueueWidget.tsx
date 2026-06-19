'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, CheckCircle, AlertCircle, PauseCircle, Loader2, XCircle, ChevronDown, ChevronUp, Filter, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/app/providers';
import { TaskStatus, TaskPriority } from '@asi-types/index';

const statusConfig: Record<string, { icon: any; color: string; label: string; pulse: boolean }> = {
  pending: { icon: Clock, color: 'asi-textMuted', label: 'Pending', pulse: false },
  running: { icon: Loader2, color: 'asi-primary', label: 'Running', pulse: true },
  waiting_approval: { icon: AlertCircle, color: 'asi-accent', label: 'Waiting Approval', pulse: true },
  completed: { icon: CheckCircle, color: 'asi-primary', label: 'Completed', pulse: false },
  failed: { icon: AlertCircle, color: 'asi-danger', label: 'Failed', pulse: false },
  cancelled: { icon: XCircle, color: 'asi-textMuted', label: 'Cancelled', pulse: false },
};

const priorityConfig = {
  critical: { color: 'asi-danger', label: 'Critical' },
  high: { color: 'asi-accent', label: 'High' },
  medium: { color: 'asi-warning', label: 'Medium' },
  low: { color: 'asi-secondary', label: 'Low' },
  background: { color: 'asi-textMuted', label: 'Background' },
};

export function TaskQueueWidget() {
  const { tasks, updateTask } = useApp();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { critical: 5, high: 4, medium: 3, low: 2, background: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-asi-textMuted" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as TaskStatus | 'all')}
            className="input py-1.5 px-3 text-sm bg-transparent border-asi-border/50 w-auto"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="waiting_approval">Waiting Approval</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="text-sm text-asi-textMuted">
          {tasks.length} total · {tasks.filter(t => t.status === 'running').length} running · {tasks.filter(t => t.status === 'pending').length} pending
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Clock className="w-12 h-12 text-asi-textMuted/30 mb-4" />
            <p className="text-asi-textMuted">No tasks in queue</p>
            <p className="text-xs text-asi-textMuted/50 mt-1">Tasks will appear here when created</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className="panel p-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${statusConfig[task.status].color}/20`}
                      animate={{ scale: statusConfig[task.status].pulse ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {(() => {
                        const Icon = statusConfig[task.status].icon;
                        const color = statusConfig[task.status].color;
                        return <Icon className={`w-4 h-4 ${color}`} />;
                      })()}
                    </motion.div>
                    <div className="min-w-0">
                      <p className="font-medium text-asi-text truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-asi-textMuted">
                          <span className={`px-2 py-0.5 rounded ${priorityConfig[task.priority].color}/20 text-${priorityConfig[task.priority].color}`}>
                            {priorityConfig[task.priority].label}
                          </span>
                        <span className="font-mono">{task.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-16 h-2 bg-asi-bgTeritary rounded-full overflow-hidden"
                      animate={{ opacity: task.status === 'running' ? 1 : 0 }}
                    >
                    <motion.div
                      className={`h-full rounded-full ${statusConfig[task.status].color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    </motion.div>
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="btn-ghost p-1.5 hover:bg-asi-bgTeritary/50"
                    >
                      {expandedTasks.has(task.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedTasks.has(task.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-asi-border/50 space-y-3"
                    >
                      <p className="text-sm text-asi-textDim">{task.description}</p>
                      
                      {task.status === 'waiting_approval' && (
                        <div className="p-3 rounded-xl bg-asi-accent/10 border border-asi-accent/30 flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-asi-accent" />
                          <div>
                            <p className="text-sm font-medium text-asi-accent">Approval Required</p>
                            <p className="text-xs text-asi-textMuted">This task requires user approval to proceed</p>
                          </div>
                        </div>
                      )}

                      {task.error && (
                        <div className="p-3 rounded-xl bg-asi-danger/10 border border-asi-danger/30">
                          <p className="text-sm font-medium text-asi-danger">Error</p>
                          <p className="text-xs text-asi-textMuted font-mono mt-1">{task.error}</p>
                        </div>
                      )}

                      {task.output && Object.keys(task.output).length > 0 && (
                        <details className="group">
                          <summary className="flex items-center gap-2 text-sm text-asi-textDim cursor-pointer">
                            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                            Output
                          </summary>
                          <pre className="mt-2 p-3 bg-asi-bgTeritary rounded-xl text-xs text-asi-textMuted font-mono overflow-auto max-h-40">
                            {JSON.stringify(task.output, null, 2)}
                          </pre>
                        </details>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-asi-border/50">
                        {task.status === 'running' && (
                          <button
                            onClick={() => updateTask({ ...task, status: 'cancelled' })}
                            className="btn-danger text-xs"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Cancel
                          </button>
                        )}
                        {task.status === 'failed' && (
                          <button
                            onClick={() => updateTask({ ...task, status: 'pending', progress: 0, error: undefined })}
                            className="btn-secondary text-xs"
                          >
                            <Loader2 className="w-3 h-3 mr-1" />
                            Retry
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}