'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertCircle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Eye, FileText, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/app/providers';
import { ApprovalStatus, Reversibility } from '@asi-types/index';

const statusConfig: Record<string, { icon: any; color: string; label: string; pulse: boolean }> = {
  pending: { icon: Clock, color: 'asi-warning', label: 'Pending', pulse: true },
  approved: { icon: CheckCircle, color: 'asi-primary', label: 'Approved', pulse: false },
  rejected: { icon: XCircle, color: 'asi-danger', label: 'Rejected', pulse: false },
  expired: { icon: AlertCircle, color: 'asi-textMuted', label: 'Expired', pulse: false },
};

const reversibilityConfig = {
  reversible: { color: 'asi-primary', label: 'Reversible', icon: RotateCcw },
  irreversible: { color: 'asi-danger', label: 'Irreversible', icon: AlertCircle },
  semi_reversible: { color: 'asi-accent', label: 'Semi-Reversible', icon: Shield },
};

export function ApprovalQueueWidget() {
  const { approvals, updateApproval } = useApp();
  const [expandedApprovals, setExpandedApprovals] = useState<Set<string>>(new Set());

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const allApprovals = [...approvals].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-asi-accent" />
          <span className="font-medium text-asi-text">Approvals</span>
          {pendingApprovals.length > 0 && (
            <motion.span
              className="px-2 py-0.5 text-xs font-bold bg-asi-danger/20 text-asi-danger rounded-full"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {pendingApprovals.length}
            </motion.span>
          )}
        </div>
        <div className="text-sm text-asi-textMuted">{approvals.length} total</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {allApprovals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Shield className="w-12 h-12 text-asi-textMuted/30 mb-4" />
            <p className="text-asi-textMuted">No approval requests</p>
            <p className="text-xs text-asi-textMuted/50 mt-1">Irreversible actions will appear here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {allApprovals.map((approval, index) => (
              <motion.div
                key={approval.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className={`panel p-4 relative overflow-hidden border-l-4 ${approval.status === 'pending' ? 'border-asi-warning' : approval.status === 'approved' ? 'border-asi-primary' : 'border-asi-danger'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${statusConfig[approval.status].color}/20`}
                      animate={{ scale: statusConfig[approval.status].pulse ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {(() => {
                        const Icon = statusConfig[approval.status].icon;
                        const color = statusConfig[approval.status].color;
                        return <Icon className={`w-4 h-4 ${color}`} />;
                      })()}
                    </motion.div>
                    <div className="min-w-0">
                      <p className="font-medium text-asi-text truncate">{approval.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-asi-textMuted">
                           {(() => {
                             const RevIcon = reversibilityConfig[approval.reversibility].icon;
                             const revColor = reversibilityConfig[approval.reversibility].color;
                             return (
                               <span className={`px-2 py-0.5 rounded ${revColor}/20 text-${revColor} flex items-center gap-1`}>
                                 <RevIcon className="w-3 h-3" />
                                 {reversibilityConfig[approval.reversibility].label}
                               </span>
                             );
                           })()}
                           <span className={`px-2 py-0.5 rounded ${statusConfig[approval.status].color}/20 text-${statusConfig[approval.status].color}`}>
                             {statusConfig[approval.status].label}
                           </span>
                        <span className="font-mono">{approval.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedApprovals(prev => {
                      const next = new Set(prev);
                      if (next.has(approval.id)) next.delete(approval.id);
                      else next.add(approval.id);
                      return next;
                    })}
                    className="btn-ghost p-1.5 hover:bg-asi-bgTeritary/50"
                  >
                    {expandedApprovals.has(approval.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {expandedApprovals.has(approval.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-asi-border/50 space-y-3"
                    >
                      <p className="text-sm text-asi-textDim">{approval.description}</p>
                      
                      <div className="p-3 rounded-xl bg-asi-bgTeritary/50 border border-asi-border/50">
                        <p className="text-xs font-medium text-asi-textMuted mb-2">Action Preview</p>
                        <pre className="text-xs text-asi-textMuted font-mono max-h-32 overflow-auto">{JSON.stringify(approval.preview, null, 2)}</pre>
                      </div>

                      {approval.consequences.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-asi-textMuted">Consequences</p>
                          {approval.consequences.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-asi-textDim">
                              <AlertCircle className="w-4 h-4 text-asi-accent flex-shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {approval.rollbackPlan && (
                        <div className="p-3 rounded-xl bg-asi-primary/10 border border-asi-primary/30">
                          <p className="text-xs font-medium text-asi-primary mb-1 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            Rollback Plan
                          </p>
                          <p className="text-xs text-asi-textDim">{approval.rollbackPlan}</p>
                        </div>
                      )}

                      {approval.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-2 border-t border-asi-border/50">
                          <button
                            onClick={() => updateApproval({ ...approval, status: 'approved', respondedAt: new Date(), response: 'Approved via dashboard' })}
                            className="btn-primary flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateApproval({ ...approval, status: 'rejected', respondedAt: new Date(), response: 'Rejected via dashboard' })}
                            className="btn-danger flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </button>
                        </div>
                      )}

                      {approval.status !== 'pending' && (
                        <div className="pt-2 border-t border-asi-border/50">
                          <p className="text-xs text-asi-textMuted">
                            Responded: {approval.respondedAt?.toLocaleString()}
                            {approval.response && <span className="ml-2"> - {approval.response}</span>}
                          </p>
                        </div>
                      )}
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
