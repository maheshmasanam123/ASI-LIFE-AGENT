import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import si from 'systeminformation';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';

export const SystemTool: Tool = {
  name: 'system',
  description: 'System monitoring, process management, hardware info, network, and resource control',
  category: 'system',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['metrics', 'processes', 'cpu', 'memory', 'disk', 'network', 'gpu', 'battery', 'temperature', 'services', 'users', 'logs', 'benchmark', 'kill', 'priority', 'daemon'] },
      pid: { type: 'number' },
      signal: { type: 'string' },
      service: { type: 'string' },
      action: { type: 'string', enum: ['start', 'stop', 'restart', 'status', 'enable', 'disable'] },
      interval: { type: 'number' },
      duration: { type: 'number' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'semi_reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, pid, signal = 'SIGTERM', service, action, interval = 1000, duration = 5000 } = input as {
      operation: string;
      pid?: number;
      signal?: string;
      service?: string;
      action?: string;
      interval?: number;
      duration?: number;
    };

    try {
      switch (operation) {
        case 'metrics': {
          const [cpu, mem, disk, net, processes] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.networkStats(),
            si.processes(),
          ]);
          return { success: true, output: { cpu, memory: mem, disk, network: net, processes: processes.list.length }, duration: Date.now() - startTime };
        }
        case 'processes': {
          const processes = await si.processes();
          return { success: true, output: processes.list.slice(0, 50).map(p => ({ pid: p.pid, name: p.name, cpu: p.cpu, mem: p.mem, command: p.command, state: p.state })), duration: Date.now() - startTime };
        }
        case 'cpu': {
          const cpu = await si.cpu();
          const load = await si.currentLoad();
          const temp = await si.cpuTemperature().catch(() => null);
          return { success: true, output: { ...cpu, load, temperature: temp }, duration: Date.now() - startTime };
        }
        case 'memory': {
          const mem = await si.mem();
          const swap = await si.memLayout();
          return { success: true, output: { ...mem, swap }, duration: Date.now() - startTime };
        }
        case 'disk': {
          const [fsSize, disks, io] = await Promise.all([si.fsSize(), si.diskLayout(), si.disksIO()]);
          return { success: true, output: { partitions: fsSize, disks, io }, duration: Date.now() - startTime };
        }
        case 'network': {
          const [interfaces, stats, connections, traffic] = await Promise.all([si.networkInterfaces(), si.networkStats(), si.networkConnections(), si.networkInterfaceDefault()]);
          return { success: true, output: { interfaces, stats, connections: connections.slice(0, 20), defaultInterface: traffic }, duration: Date.now() - startTime };
        }
        case 'gpu': {
          const gpu = await si.graphics();
          return { success: true, output: gpu, duration: Date.now() - startTime };
        }
        case 'battery': {
          const battery = await si.battery();
          return { success: true, output: battery, duration: Date.now() - startTime };
        }
        case 'temperature': {
          const temp = await si.cpuTemperature();
          return { success: true, output: temp, duration: Date.now() - startTime };
        }
        case 'services': {
          const services = await si.services('systemd');
          return { success: true, output: (services as any).list?.slice(0, 30) || [], duration: Date.now() - startTime };
        }
        case 'users': {
          const users = await si.users();
          return { success: true, output: users, duration: Date.now() - startTime };
        }
        case 'logs': {
          const logs = execSync('journalctl -n 50 --no-pager', { encoding: 'utf-8', timeout: 10000 }).split('\n').filter(Boolean);
          return { success: true, output: logs, duration: Date.now() - startTime };
        }
        case 'benchmark': {
          const start = Date.now();
          const cpuBench = await si.cpuCurrentSpeed();
          const memBench = await si.mem();
          return { success: true, output: { cpu: cpuBench, memory: memBench, duration: Date.now() - start }, duration: Date.now() - startTime };
        }
        case 'kill': {
          if (!pid) return { success: false, error: 'PID required', duration: Date.now() - startTime };
          try {
            process.kill(pid, signal as NodeJS.Signals);
            return { success: true, output: `Sent ${signal} to PID ${pid}`, duration: Date.now() - startTime };
          } catch (e) {
            return { success: false, error: `Failed to kill process: ${e}`, duration: Date.now() - startTime };
          }
        }
        case 'priority': {
          if (!pid) return { success: false, error: 'PID required', duration: Date.now() - startTime };
          execSync(`renice -n 10 -p ${pid}`, { encoding: 'utf-8' });
          return { success: true, output: `Changed priority for PID ${pid}`, duration: Date.now() - startTime };
        }
        case 'daemon': {
          if (!service || !action) return { success: false, error: 'Service and action required', duration: Date.now() - startTime };
          const cmd = `systemctl ${action} ${service}`;
          execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
          return { success: true, output: `${action} ${service}`, duration: Date.now() - startTime };
        }
        default:
          return { success: false, error: `Unknown operation: ${operation}`, duration: Date.now() - startTime };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), duration: Date.now() - startTime };
    }
  },
};