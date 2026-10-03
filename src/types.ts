// ATIENDE - Modelos de datos

export type MissionStatus = 'draft' | 'planning' | 'active' | 'paused' | 'completed' | 'cancelled' | 'blocked';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PermissionLevel = 'analyze' | 'execute_internal' | 'execute_external';
export type EvidenceType = 'user_provided' | 'document' | 'external_query' | 'inference' | 'pending_verification';
export type VerificationStatus = 'met' | 'unmet' | 'pending_review';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Need {
  id: string;
  title: string;
  description: string;
  context: string;
  expectedResult: string;
  targetDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  closureCriteria: string;
  allowedSources: string[];
  actionLimits: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionContract {
  id: string;
  needId: string;
  version: number;
  objective: string;
  scope: string;
  exclusions: string;
  deliverables: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  authorizedSources: string[];
  allowedTools: string[];
  permissionLevel: PermissionLevel;
  consumptionLimits: {
    maxSteps: number;
    maxToolCalls: number;
    maxDuration: number; // minutes
  };
  followUpFrequency: string;
  closureConditions: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  type: 'deterministic' | 'human_review';
  status: VerificationStatus;
  evidence: string;
}

export interface Plan {
  id: string;
  missionId: string;
  contractVersion: number;
  tasks: Task[];
  createdAt: string;
}

export interface Task {
  id: string;
  planId: string;
  title: string;
  description: string;
  dependencies: string[];
  inputs: string[];
  expectedOutputs: string;
  tool: string;
  validationCriterion: string;
  status: TaskStatus;
  order: number;
  blockedReason?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Execution {
  id: string;
  missionId: string;
  taskId: string;
  contractVersion: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  steps: ExecutionStep[];
  error?: string;
  consumption: {
    tokens?: number;
    toolCalls: number;
    steps: number;
  };
}

export interface ExecutionStep {
  id: string;
  executionId: string;
  timestamp: string;
  action: string;
  tool?: string;
  input?: string;
  output?: string;
  status: 'success' | 'error' | 'info';
}

export interface Document {
  id: string;
  missionId: string;
  name: string;
  type: string;
  size: number;
  hash: string;
  uploadedAt: string;
  owner: string;
  extractedText?: string;
  pageCount?: number;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  error?: string;
}

export interface Evidence {
  id: string;
  missionId: string;
  type: EvidenceType;
  content: string;
  source: string;
  sourceDate: string;
  locator?: string;
  documentId?: string;
  verified: boolean;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  missionId: string;
  title: string;
  format: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'json';
  version: number;
  content: string;
  generatedAt: string;
  fileUrl?: string;
  fileSize?: number;
  sources: string[];
  pendingIssues: string[];
}

export interface Approval {
  id: string;
  missionId: string;
  action: string;
  description: string;
  parameters: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
}

export interface Mission {
  id: string;
  need: Need;
  contract: MissionContract;
  plan: Plan | null;
  documents: Document[];
  executions: Execution[];
  evidence: Evidence[];
  deliverables: Deliverable[];
  approvals: Approval[];
  status: MissionStatus;
  nextStep: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  aiProvider: string;
  aiConfigured: boolean;
  storageConfigured: boolean;
  externalSourcesConfigured: boolean;
  ocrConfigured: boolean;
  timezone: string;
  maxDocumentSize: number;
  allowedExtensions: string[];
}

export interface Notification {
  id: string;
  missionId?: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
