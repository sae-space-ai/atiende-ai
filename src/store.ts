import { v4 as uuidv4 } from 'uuid';
import type { Mission, MissionStatus, AppSettings, Notification, TaskStatus, ExecutionStatus } from './types';

const STORAGE_KEYS = {
  MISSIONS: 'atiende_missions',
  SETTINGS: 'atiende_settings',
  NOTIFICATIONS: 'atiende_notifications',
  USER: 'atiende_user',
};

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'none',
  aiConfigured: false,
  storageConfigured: false,
  externalSourcesConfigured: false,
  ocrConfigured: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  maxDocumentSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.pdf', '.docx', '.txt', '.csv', '.xlsx'],
};

// Generic storage helpers
function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Missions
export function getMissions(): Mission[] {
  return getFromStorage<Mission[]>(STORAGE_KEYS.MISSIONS, []);
}

export function getMission(id: string): Mission | undefined {
  return getMissions().find(m => m.id === id);
}

export function saveMission(mission: Mission): void {
  const missions = getMissions();
  const idx = missions.findIndex(m => m.id === mission.id);
  mission.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    missions[idx] = mission;
  } else {
    missions.push(mission);
  }
  saveToStorage(STORAGE_KEYS.MISSIONS, missions);
}

export function deleteMission(id: string): void {
  const missions = getMissions().filter(m => m.id !== id);
  saveToStorage(STORAGE_KEYS.MISSIONS, missions);
}

export function updateMissionStatus(id: string, status: MissionStatus): void {
  const mission = getMission(id);
  if (mission) {
    mission.status = status;
    saveMission(mission);
  }
}

export function updateTaskStatus(missionId: string, taskId: string, status: TaskStatus): void {
  const mission = getMission(missionId);
  if (mission?.plan) {
    const task = mission.plan.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      if (status === 'in_progress') task.startedAt = new Date().toISOString();
      if (status === 'completed' || status === 'cancelled') task.completedAt = new Date().toISOString();
      saveMission(mission);
    }
  }
}

// Settings
export function getSettings(): AppSettings {
  return getFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

// Notifications
export function getNotifications(): Notification[] {
  return getFromStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
}

export function addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
  const notifications = getNotifications();
  notifications.unshift({
    ...notification,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    read: false,
  });
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications.slice(0, 100));
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const n = notifications.find(n => n.id === id);
  if (n) {
    n.read = true;
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }
}

// User (simple local user)
export function getUser(): { id: string; name: string; email: string } {
  return getFromStorage(STORAGE_KEYS.USER, { id: 'local-user', name: 'Usuario', email: '' });
}

export function saveUser(user: { id: string; name: string; email: string }): void {
  saveToStorage(STORAGE_KEYS.USER, user);
}

// ID generator
export function generateId(): string {
  return uuidv4();
}

// Hash for documents
export async function computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Mission creation helper
export function createMissionFromNeed(need: {
  title: string;
  description: string;
  context: string;
  expectedResult: string;
  targetDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  closureCriteria: string;
  allowedSources: string[];
  actionLimits: string;
}): Mission {
  const now = new Date().toISOString();
  const missionId = generateId();
  const contractId = generateId();
  
  return {
    id: missionId,
    need: {
      id: generateId(),
      title: need.title,
      description: need.description,
      context: need.context,
      expectedResult: need.expectedResult,
      targetDate: need.targetDate,
      priority: need.priority,
      closureCriteria: need.closureCriteria,
      allowedSources: need.allowedSources,
      actionLimits: need.actionLimits,
      createdAt: now,
      updatedAt: now,
    },
    contract: {
      id: contractId,
      needId: missionId,
      version: 1,
      objective: need.expectedResult,
      scope: need.description,
      exclusions: need.actionLimits,
      deliverables: [],
      acceptanceCriteria: need.closureCriteria
        ? need.closureCriteria.split('\n').filter(Boolean).map((c, i) => ({
            id: generateId(),
            description: c.trim(),
            type: 'human_review' as const,
            status: 'pending_review' as const,
            evidence: '',
          }))
        : [],
      authorizedSources: need.allowedSources,
      allowedTools: ['internal_query', 'document_read', 'text_extract', 'content_generate', 'deliverable_create'],
      permissionLevel: 'analyze',
      consumptionLimits: {
        maxSteps: 50,
        maxToolCalls: 30,
        maxDuration: 60,
      },
      followUpFrequency: 'manual',
      closureConditions: need.closureCriteria,
      createdAt: now,
      approvedAt: null,
    },
    plan: null,
    documents: [],
    executions: [],
    evidence: [],
    deliverables: [],
    approvals: [],
    status: 'draft',
    nextStep: 'Confirmar contrato de misión',
    createdAt: now,
    updatedAt: now,
  };
}
