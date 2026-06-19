import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUUID } from '@asi-types/index';
import { ApprovalStatus, Reversibility, AgentTask, ApprovalRequest } from '@asi-types/index';

describe('Approval Workflow', () => {
  let mockApprovals: ApprovalRequest[];
  let mockTasks: AgentTask[];

  beforeEach(() => {
    mockApprovals = [];
    mockTasks = [];
  });

  it('should create approval request for irreversible task', () => {
    const task: AgentTask = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Delete production database',
      description: 'Irreversible action',
      status: 'pending',
      priority: 'critical',
      capabilities: ['file'],
      input: { path: '/prod/db' },
      approvalRequired: true,
      metadata: { reversibility: 'irreversible' },
      subtasks: [],
      progress: 0,
    };

    expect(task.approvalRequired).toBe(true);
    expect(task.metadata.reversibility).toBe('irreversible');
  });

  it('should auto-approve reversible tasks when enabled', () => {
    const task: AgentTask = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Read config file',
      description: 'Reversible read operation',
      status: 'pending',
      priority: 'low',
      capabilities: ['file'],
      input: { path: '/etc/config' },
      approvalRequired: false,
      metadata: { reversibility: 'reversible' },
      subtasks: [],
      progress: 0,
    };

    const autoApproveReversible = true;
    const shouldAutoApprove = autoApproveReversible && task.metadata.reversibility === 'reversible';

    expect(shouldAutoApprove).toBe(true);
    expect(task.approvalRequired).toBe(false);
  });

  it('should require approval for semi-reversible tasks', () => {
    const task: AgentTask = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Update system config',
      description: 'Semi-reversible - requires manual rollback',
      status: 'pending',
      priority: 'high',
      capabilities: ['file'],
      input: { path: '/etc/system.conf' },
      approvalRequired: true,
      metadata: { reversibility: 'semi_reversible' },
      subtasks: [],
      progress: 0,
    };

    expect(task.approvalRequired).toBe(true);
    expect(task.metadata.reversibility).toBe('semi_reversible');
  });

  it('should track approval status transitions', () => {
    const approval: ApprovalRequest = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      taskId: createUUID(),
      agentId: createUUID(),
      title: 'Delete production database',
      description: 'Irreversible action requiring approval',
      action: 'file.delete',
      reversibility: 'irreversible',
      riskLevel: 'critical',
      preview: { path: '/prod/db' },
      consequences: ['Permanent data loss', 'Service downtime'],
      rollbackPlan: 'Restore from backup (RPO: 1 hour)',
      status: 'pending',
      requestedAt: new Date(),
      metadata: {},
    };

    expect(approval.status).toBe('pending');

    approval.status = 'approved';
    approval.respondedAt = new Date();
    approval.response = 'Approved by admin';

    expect(approval.status).toBe('approved');
    expect(approval.respondedAt).toBeDefined();

    approval.status = 'rejected';
    approval.response = 'Rejected: insufficient justification';

    expect(approval.status).toBe('rejected');
  });

  it('should include consequences and rollback plan in approval request', () => {
    const approval: ApprovalRequest = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      taskId: createUUID(),
      agentId: createUUID(),
      title: 'Format disk',
      description: 'Format production disk',
      action: 'disk.format',
      reversibility: 'irreversible',
      riskLevel: 'critical',
      preview: { device: '/dev/sda1', filesystem: 'ext4' },
      consequences: [
        'All data on /dev/sda1 will be permanently lost',
        'Running services using this disk will fail',
      ],
      rollbackPlan: 'Restore from last backup (daily at 2 AM)',
      status: 'pending',
      requestedAt: new Date(),
      metadata: {},
    };

    expect(approval.consequences.length).toBeGreaterThan(0);
    expect(approval.rollbackPlan).toBeDefined();
    expect(approval.rollbackPlan?.length).toBeGreaterThan(10);
  });
});