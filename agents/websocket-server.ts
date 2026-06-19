import { Server } from 'socket.io';
import { createServer } from 'http';
import { AgentOrchestrator } from './orchestrator';
import { UUID } from '@asi-types/index';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const orchestrator = new AgentOrchestrator({
  maxConcurrentAgents: 5,
  autoStart: true,
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join', (data: { userId: string }) => {
    socket.join(`user:${data.userId}`);
    socket.emit('joined', { userId: data.userId });
  });

  socket.on('message', (message) => {
    io.emit('message.broadcast', message);
  });

  socket.on('task.create', (task) => {
    orchestrator.submitTask(task).catch(console.error);
  });

  socket.on('task.update', (task) => {
    io.emit('task.update', task);
  });

  socket.on('approval.create', (approval) => {
    io.emit('approval.request', approval);
  });

  socket.on('approval.update', (approval) => {
    io.emit('approval.response', approval);
  });

  socket.on('agent.command', async (data: { agentId: string; command: string; args: any }) => {
    const agent = orchestrator.getAgent(data.agentId as UUID);
    if (agent) {
      // Handle agent-specific commands
      socket.emit('agent.command.response', { success: true });
    } else {
      socket.emit('agent.command.response', { success: false, error: 'Agent not found' });
    }
  });

  socket.on('subscribe.metrics', () => {
    socket.join('metrics');
  });

  socket.on('unsubscribe.metrics', () => {
    socket.leave('metrics');
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
  });
});

orchestrator.on('agent.status', (data) => {
  io.emit('agent.status', data);
});

orchestrator.on('task.queued', (data) => {
  io.emit('task.queued', data);
});

orchestrator.on('task.complete', (data) => {
  io.emit('task.complete', data);
});

orchestrator.on('task.error', (data) => {
  io.emit('task.error', data);
});

orchestrator.on('approval.request', (approval) => {
  io.emit('approval.request', approval);
});

orchestrator.on('approval.response', (approval) => {
  io.emit('approval.response', approval);
});

orchestrator.on('message.broadcast', (message) => {
  io.emit('message.broadcast', message);
});

orchestrator.on('metrics', (metrics) => {
  io.to('metrics').emit('metrics', metrics);
});

orchestrator.on('agent.created', (agent) => {
  io.emit('agent.created', agent);
});

const PORT = process.env.WS_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await orchestrator.stop();
  httpServer.close();
  process.exit(0);
});

export { io, orchestrator };