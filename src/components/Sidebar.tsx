'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Bot, ClipboardList, Terminal, 
  Shield, BarChart3, Settings, FolderGit2, 
  MessageSquare, ShieldCheck, Cpu, HardDrive,
  Network, Zap, ChevronRight, ChevronDown,
  X, Menu, LogOut
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/app/providers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Agents', href: '/agents', icon: Bot },
  { title: 'Tasks', href: '/tasks', icon: ClipboardList },
  { title: 'Terminal', href: '/terminal', icon: Terminal },
  { title: 'Approvals', href: '/approvals', icon: Shield },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Files', href: '/files', icon: FolderGit2 },
  { title: 'Chat', href: '/chat', icon: MessageSquare },
];

const tools = [
  { title: 'System', icon: Cpu, items: [
    { label: 'Metrics', href: '/tools/system/metrics' },
    { label: 'Processes', href: '/terminal' },
    { label: 'Services', href: '/terminal' },
    { label: 'Logs', href: '/terminal' },
  ]},
  { title: 'Network', icon: Network, items: [
    { label: 'Connections', href: '/terminal' },
    { label: 'Bandwidth', href: '/terminal' },
    { label: 'DNS', href: '/terminal' },
    { label: 'Firewall', href: '/terminal' },
  ]},
  { title: 'Storage', icon: HardDrive, items: [
    { label: 'Disks', href: '/files' },
    { label: 'Files', href: '/files' },
    { label: 'Backups', href: '/files' },
    { label: 'Cleanup', href: '/files' },
  ]},
  { title: 'Automation', icon: Zap, items: [
    { label: 'Workflows', href: '/tasks' },
    { label: 'Schedules', href: '/tasks' },
    { label: 'Triggers', href: '/tasks' },
    { label: 'Macros', href: '/tasks' },
  ]},
];

export function Sidebar() {
  const { agents, tasks, approvals, metrics } = useApp();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const activeAgents = agents.filter(a => a.status === 'working' || a.status === 'thinking').length;
  const pendingTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending').length;
  const pendingApprovals = approvals.filter(a => a.status === 'pending').length;

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: collapsed ? -280 : 0 }}
        animate={{ x: collapsed ? -280 : 0 }}
        className={`fixed lg:relative z-30 h-[calc(100vh-64px)] top-16 transition-all duration-300 ease-in-out glass-strong border-r border-asi-border/50 ${
          collapsed ? 'w-20' : 'w-72'
        } lg:w-72`}
      >
        <div className="flex flex-col h-full overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-asi-border/50">
            <motion.h2
              initial={{ opacity: 1, x: 0 }}
              animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -20 : 0 }}
              className="font-display font-semibold text-asi-text white-space-nowrap overflow-hidden"
            >
              Navigation
            </motion.h2>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="btn-ghost p-1.5 ml-auto"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <nav className="space-y-1 mb-6" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * navigation.indexOf(item) }}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-asi-primary/20 text-asi-primary border border-asi-primary/30'
                        : 'text-asi-textDim hover:text-asi-text hover:bg-asi-bgTeritary/50'
                    } group`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                    <motion.span
                      initial={{ opacity: 1, width: 'auto' }}
                      animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
                      className="font-medium white-space-nowrap overflow-hidden"
                    >
                      {item.title}
                    </motion.span>
                    {isActive && !collapsed && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="ml-auto w-1 h-6 bg-asi-primary rounded-r-full"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="px-3 text-xs font-semibold text-asi-textMuted uppercase tracking-wider mb-3">
                    Tools & Systems
                  </h3>
                  <div className="space-y-1">
                    {tools.map((tool) => {
                      const Icon = tool.icon;
                      const isExpanded = expandedTool === tool.title;
                      return (
                        <motion.div key={tool.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                          <button
                            onClick={() => setExpandedTool(isExpanded ? null : tool.title)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-asi-textDim hover:text-asi-text hover:bg-asi-bgTeritary/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5" />
                              <span className="font-medium">{tool.title}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="ml-8 mt-1 space-y-1 border-l border-asi-border/30 pl-2"
                              >
                                 {tool.items.map((item) => (
                                   <Link
                                     key={item.label}
                                     href={item.href}
                                     className="block px-3 py-1.5 text-sm text-asi-textMuted hover:text-asi-primary rounded-lg hover:bg-asi-bgTeritary/30 transition-colors"
                                     onClick={() => setMobileOpen(false)}
                                   >
                                     {item.label}
                                   </Link>
                                 ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-asi-border/50">
                  <h3 className="px-3 text-xs font-semibold text-asi-textMuted uppercase tracking-wider mb-3">
                    Quick Stats
                  </h3>
                  <div className="space-y-3 px-3">
                    <StatItem label="Active Agents" value={activeAgents} icon={Bot} color="asi-primary" />
                    <StatItem label="Pending Tasks" value={pendingTasks} icon={ClipboardList} color="asi-warning" />
                    <StatItem label="Approvals" value={pendingApprovals} icon={Shield} color="asi-danger" />
                    <StatItem 
                      label="CPU" 
                      value={metrics ? `${Math.round(metrics.cpu)}%` : '--'} 
                      icon={Cpu} 
                      color="asi-secondary" 
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto pt-4 border-t border-asi-border/50">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-asi-textDim hover:text-asi-text hover:bg-asi-bgTeritary/50 transition-colors group"
              onClick={() => setMobileOpen(false)}
            >
              <Settings className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
              <motion.span
                initial={{ opacity: 1, width: 'auto' }}
                animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
                className="font-medium white-space-nowrap overflow-hidden"
              >
                Settings
              </motion.span>
            </Link>
          </div>
        </div>
      </motion.aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 z-40 btn-primary p-3 rounded-full shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}

function StatItem({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl bg-asi-bgTeritary/50">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}/20 text-${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-asi-textMuted truncate">{label}</p>
        <p className="font-mono font-semibold text-asi-text">{value}</p>
      </div>
    </div>
  );
}