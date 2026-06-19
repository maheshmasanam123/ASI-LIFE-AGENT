import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

describe('WebSocket Event Subscription', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: Server;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeEach(async () => {
    httpServer = createServer();
    ioServer = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      transports: ['websocket', 'polling'],
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        resolve();
      });
    });

    ioServer.on('connection', (socket) => {
      socket.on('task.create', (task) => {
        ioServer.emit('task.queued', { task });
      });

      socket.on('approval.create', (approval) => {
        ioServer.emit('approval.request', approval);
      });

      socket.on('subscribe.metrics', () => {
        socket.join('metrics');
      });
    });

    clientSocket = ClientIO(`http://localhost:${serverPort}`, {
      transports: ['websocket', 'polling'],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  afterEach(async () => {
    clientSocket.close();
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('should connect to WebSocket server', () => {
    expect(clientSocket.connected).toBe(true);
  });

  it('should emit task.queued event when task.create received', async () => {
    const testTask = { id: 'test-1', title: 'Test Task', status: 'pending' };
    
    const eventPromise = new Promise<any>((resolve) => {
      clientSocket.on('task.queued', resolve);
    });
    
    clientSocket.emit('task.create', testTask);
    const data = await eventPromise;
    
    expect(data.task).toBeDefined();
    expect(data.task.id).toBe('test-1');
  });

  it('should emit approval.request event when approval.create received', async () => {
    const testApproval = { id: 'approval-1', title: 'Test Approval', status: 'pending' };
    
    const eventPromise = new Promise<any>((resolve) => {
      clientSocket.on('approval.request', resolve);
    });
    
    clientSocket.emit('approval.create', testApproval);
    const approval = await eventPromise;
    
    expect(approval).toBeDefined();
    expect(approval.id).toBe('approval-1');
  });

  it('should join metrics room on subscribe.metrics', async () => {
    clientSocket.emit('subscribe.metrics');
    
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    
    const metricsRoom = ioServer.sockets.adapter.rooms.get('metrics');
    expect(metricsRoom).toBeDefined();
    expect(metricsRoom?.has(clientSocket.id!)).toBe(true);
  });

  it('should broadcast agent.status to all clients', async () => {
    const secondClient = ClientIO(`http://localhost:${serverPort}`, { transports: ['websocket'] });
    
    await new Promise<void>((resolve) => {
      secondClient.on('connect', resolve);
    });
    
    const eventPromise = new Promise<any>((resolve) => {
      secondClient.on('agent.status', resolve);
    });
    
    ioServer.emit('agent.status', { agentId: 'agent-1', status: 'working' });
    const data = await eventPromise;
    
    expect(data.agentId).toBe('agent-1');
    expect(data.status).toBe('working');
    secondClient.close();
  });

  it('should handle disconnect gracefully', () => {
    expect(clientSocket.connected).toBe(true);
    clientSocket.disconnect();
    expect(clientSocket.connected).toBe(false);
  });
});