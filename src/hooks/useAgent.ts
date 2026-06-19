'use client';

import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/app/providers';
import { AgentTask, AgentMessage, ApprovalRequest, UUID, createUUID, TaskStatus, TaskPriority, Reversibility } from '@asi-types/index';

export function useAgent() {
  const { addTask, updateTask, addApproval, updateApproval, addMessage, tasks, approvals, agents } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  const createTask = useCallback(async (task: Omit<AgentTask, 'id' | 'createdAt' | 'updatedAt' | 'subtasks' | 'progress'>) => {
    const newTask: AgentTask = {
      ...task,
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      subtasks: [],
      progress: 0,
      metadata: task.metadata || {},
    };
    return addTask(newTask);
  }, [addTask]);

  const cancelTask = useCallback(async (taskId: UUID) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && (task.status === 'pending' || task.status === 'running')) {
      await updateTask({ ...task, status: 'cancelled' });
    }
  }, [tasks, updateTask]);

  const retryTask = useCallback(async (taskId: UUID) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status === 'failed') {
      await updateTask({ ...task, status: 'pending', progress: 0, error: undefined });
    }
  }, [tasks, updateTask]);

  const sendMessage = useCallback(async (content: string, type: AgentMessage['type'] = 'text', metadata: Record<string, unknown> = {}) => {
    const message: AgentMessage = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      agentId: 'user' as UUID,
      role: 'user',
      content,
      type,
      metadata,
    };
    addMessage(message);
    return message;
  }, [addMessage]);

  const requestApproval = useCallback(async (approval: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requestedAt'>) => {
    const newApproval: ApprovalRequest = {
      ...approval,
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      requestedAt: new Date(),
    };
    addApproval(newApproval);
    return newApproval;
  }, [addApproval]);

  const respondToApproval = useCallback(async (approvalId: UUID, status: ApprovalRequest['status'], response?: string) => {
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
      await updateApproval({ ...approval, status, respondedAt: new Date(), response });
    }
  }, [approvals, updateApproval]);

  const executeTool = useCallback(async (toolName: string, input: Record<string, unknown>) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input }),
      });
      return response.json();
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const createAndExecuteTask = useCallback(async (
    title: string,
    description: string,
    capability: string,
    input: Record<string, unknown>,
    options: { priority?: TaskPriority; approvalRequired?: boolean; reversibility?: Reversibility } = {}
  ) => {
    const task = await createTask({
      title,
      description,
      status: 'pending',
      priority: options.priority || 'medium',
      capabilities: [capability],
      input,
      approvalRequired: options.approvalRequired || false,
      metadata: { reversibility: options.reversibility || 'reversible' },
    });

    if (options.approvalRequired) {
      await requestApproval({
        taskId: task.id,
        agentId: agents[0]?.id || 'system' as UUID,
        title: `Execute: ${title}`,
        description,
        action: capability,
        reversibility: options.reversibility || 'irreversible',
        riskLevel: 'medium',
        preview: input,
        consequences: [`This will execute ${capability} with the provided input`],
        rollbackPlan: 'Manual intervention may be required to revert changes',
        metadata: {},
      });
    }

    return task;
  }, [createTask, requestApproval, agents]);

  return {
    createTask,
    cancelTask,
    retryTask,
    sendMessage,
    requestApproval,
    respondToApproval,
    executeTool,
    createAndExecuteTask,
    isProcessing,
    tasks,
    approvals,
  };
}

export function useTaskQueue() {
  const { tasks, updateTask } = useApp();

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const runningTasks = tasks.filter(t => t.status === 'running');
  const waitingTasks = tasks.filter(t => t.status === 'waiting_approval');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  const getNextTask = useCallback(() => {
    return pendingTasks[0] || null;
  }, [pendingTasks]);

  const reorderTasks = useCallback(async (taskIds: UUID[]) => {
    for (let i = 0; i < taskIds.length; i++) {
      const task = tasks.find(t => t.id === taskIds[i]);
      if (task) {
        await updateTask({ ...task, metadata: { ...task.metadata, queuePosition: i } });
      }
    }
  }, [tasks, updateTask]);

  return {
    tasks,
    pendingTasks,
    runningTasks,
    waitingTasks,
    completedTasks,
    failedTasks,
    getNextTask,
    reorderTasks,
  };
}