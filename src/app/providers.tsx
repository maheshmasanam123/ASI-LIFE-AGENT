'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { AgentState, AgentTask, ApprovalRequest, AgentMessage, SystemMetrics, UUID, WidgetType, DashboardWidget } from '@asi-types/index';

interface AppContextType {
  agents: AgentState[];
  tasks: AgentTask[];
  approvals: ApprovalRequest[];
  messages: AgentMessage[];
  metrics: SystemMetrics | null;
  widgets: DashboardWidget[];
  socket: Socket | null;
  connected: boolean;
  addMessage: (message: AgentMessage) => void;
  addTask: (task: AgentTask) => AgentTask;
  updateTask: (task: AgentTask) => void;
  addApproval: (approval: ApprovalRequest) => void;
  updateApproval: (approval: ApprovalRequest) => void;
  setAgents: (agents: AgentState[]) => void;
  setMetrics: (metrics: SystemMetrics) => void;
  addWidget: (widget: DashboardWidget) => void;
  updateWidget: (widget: DashboardWidget) => void;
  removeWidget: (id: UUID) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(getDefaultWidgets());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    
    newSocket.on('agent.status', (data: { agentId: UUID; status: string }) => {
      setAgents(prev => prev.map(a => a.id === data.agentId ? { ...a, status: data.status as any } : a));
    });

    newSocket.on('task.queued', (data: { task: AgentTask }) => {
      setTasks(prev => [...prev, data.task]);
    });

    newSocket.on('task.complete', (data: { task: AgentTask }) => {
      setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
    });

    newSocket.on('task.error', (data: { task: AgentTask; error: Error }) => {
      setTasks(prev => prev.map(t => t.id === data.task.id ? { ...data.task, error: data.error.message } : t));
    });

    newSocket.on('approval.request', (approval: ApprovalRequest) => {
      setApprovals(prev => [...prev, approval]);
    });

    newSocket.on('approval.response', (approval: ApprovalRequest) => {
      setApprovals(prev => prev.map(a => a.id === approval.id ? approval : a));
    });

    newSocket.on('message.broadcast', (message: AgentMessage) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('metrics', (metrics: SystemMetrics) => {
      setMetrics(metrics);
    });

    newSocket.on('agent.created', (agent: AgentState) => {
      setAgents(prev => [...prev, agent]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addMessage = (message: AgentMessage) => {
    setMessages(prev => [...prev, message]);
    socket?.emit('message', message);
  };

  const addTask = (task: AgentTask): AgentTask => {
    setTasks(prev => [...prev, task]);
    socket?.emit('task.create', task);
    return task;
  };

  const updateTask = (task: AgentTask) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    socket?.emit('task.update', task);
  };

  const addApproval = (approval: ApprovalRequest) => {
    setApprovals(prev => [...prev, approval]);
    socket?.emit('approval.create', approval);
  };

  const updateApproval = (approval: ApprovalRequest) => {
    setApprovals(prev => prev.map(a => a.id === approval.id ? approval : a));
    socket?.emit('approval.update', approval);
  };

  const addWidget = (widget: DashboardWidget) => {
    setWidgets(prev => [...prev, widget]);
  };

  const updateWidget = (widget: DashboardWidget) => {
    setWidgets(prev => prev.map(w => w.id === widget.id ? widget : w));
  };

  const removeWidget = (id: UUID) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  return (
    <AppContext.Provider value={{
      agents,
      tasks,
      approvals,
      messages,
      metrics,
      widgets,
      socket,
      connected,
      addMessage,
      addTask,
      updateTask,
      addApproval,
      updateApproval,
      setAgents,
      setMetrics,
      addWidget,
      updateWidget,
      removeWidget,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within Providers');
  return context;
}

function getDefaultWidgets(): DashboardWidget[] {
  return [
    { id: 'agent-status' as UUID, type: 'agent_status', title: 'Agent Status', position: { x: 0, y: 0, w: 6, h: 4 }, config: {}, visible: true },
    { id: 'task-queue' as UUID, type: 'task_queue', title: 'Task Queue', position: { x: 6, y: 0, w: 6, h: 4 }, config: {}, visible: true },
    { id: 'system-metrics' as UUID, type: 'system_metrics', title: 'System Metrics', position: { x: 0, y: 4, w: 4, h: 4 }, config: {}, visible: true },
    { id: 'chat' as UUID, type: 'chat', title: 'Agent Chat', position: { x: 4, y: 4, w: 8, h: 6 }, config: {}, visible: true },
    { id: 'approval-queue' as UUID, type: 'approval_queue', title: 'Approvals', position: { x: 0, y: 8, w: 4, h: 4 }, config: {}, visible: true },
    { id: 'log-stream' as UUID, type: 'log_stream', title: 'Log Stream', position: { x: 4, y: 10, w: 8, h: 4 }, config: {}, visible: true },
  ];
}