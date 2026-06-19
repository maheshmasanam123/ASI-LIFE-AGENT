'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { AgentEvent, ToolEvent, SystemEvent, AgentState, AgentTask, ApprovalRequest, AgentMessage, SystemMetrics } from '@asi-types/index';

type EventHandler<T> = (data: T) => void;

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: <T>(event: string, handler: EventHandler<T>) => () => void;
  off: (event: string, handler?: EventHandler<any>) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<EventHandler<any>>>>(new Map());

  const connect = useCallback(() => {
    if (socket?.connected) return;

    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('[WebSocket] Connected');
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[WebSocket] Disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    handlersRef.current.forEach((handlers, event) => {
      handlers.forEach(handler => {
        newSocket.on(event, handler);
      });
    });

    setSocket(newSocket);
  }, [url, reconnection, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  const emit = useCallback((event: string, data: any) => {
    socket?.emit(event, data);
  }, [socket]);

  const on = useCallback(<T>(event: string, handler: EventHandler<T>) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    if (socket) {
      socket.on(event, handler);
    }

    return () => {
      handlersRef.current.get(event)?.delete(handler);
      socket?.off(event, handler);
    };
  }, [socket]);

  const off = useCallback((event: string, handler?: EventHandler<any>) => {
    if (handler) {
      handlersRef.current.get(event)?.delete(handler);
      socket?.off(event, handler);
    } else {
      handlersRef.current.get(event)?.forEach(h => socket?.off(event, h));
      handlersRef.current.delete(event);
    }
  }, [socket]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  return { socket, connected, connect, disconnect, emit, on, off };
}

export function useAgentEvents() {
  const { on, off, connected } = useWebSocket();

  const subscribe = useCallback(<T>(event: string, handler: EventHandler<T>) => {
    return on(event, handler);
  }, [on]);

  return { subscribe, connected };
}

export function useAgentState(agentId: string) {
  const [state, setState] = useState<AgentState | null>(null);
  const { subscribe } = useAgentEvents();

  useEffect(() => {
    const unsub = subscribe('agent.status', (data: { agentId: string; status: string }) => {
      if (data.agentId === agentId) {
        setState(prev => prev ? { ...prev, status: data.status as any } : null);
      }
    });
    return unsub;
  }, [agentId, subscribe]);

  return state;
}

export function useTasks() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const { subscribe } = useAgentEvents();

  useEffect(() => {
    const unsub1 = subscribe('task.queued', (data: { task: AgentTask }) => {
      setTasks(prev => [...prev, data.task]);
    });
    const unsub2 = subscribe('task.complete', (data: { task: AgentTask }) => {
      setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
    });
    const unsub3 = subscribe('task.error', (data: { task: AgentTask; error: Error }) => {
      setTasks(prev => prev.map(t => t.id === data.task.id ? { ...data.task, error: data.error.message } : t));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribe]);

  return tasks;
}

export function useApprovals() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const { subscribe } = useAgentEvents();

  useEffect(() => {
    const unsub1 = subscribe('approval.request', (approval: ApprovalRequest) => {
      setApprovals(prev => [...prev, approval]);
    });
    const unsub2 = subscribe('approval.response', (approval: ApprovalRequest) => {
      setApprovals(prev => prev.map(a => a.id === approval.id ? approval : a));
    });
    return () => { unsub1(); unsub2(); };
  }, [subscribe]);

  return approvals;
}

export function useMessages() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const { subscribe } = useAgentEvents();

  useEffect(() => {
    const unsub = subscribe('message.broadcast', (message: AgentMessage) => {
      setMessages(prev => [...prev, message]);
    });
    return unsub;
  }, [subscribe]);

  return messages;
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const { subscribe } = useAgentEvents();

  useEffect(() => {
    const unsub = subscribe('metrics', (metrics: SystemMetrics) => {
      setMetrics(metrics);
    });
    return unsub;
  }, [subscribe]);

  return metrics;
}
