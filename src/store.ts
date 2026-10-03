import { v4 as uuidv4 } from 'uuid';
import type { Mission, MissionStatus, AppSettings, Notification, TaskStatus } from './types';
import { getCurrentSpaceId } from './space';

const STORAGE_PREFIX = 'atiende_';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'none',
  aiConfigured: false,
  storageConfigured: false,
  externalSourcesConfigured: false,
  ocrConfigured: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  maxDocumentSize: 10 * 1024 * 1024,
  allowedExtensions: ['.pdf', '.docx', '.txt', '.csv', '.xlsx'],
};

// ============================================
// STORAGE HELPERS (aislados por espacio anónimo)
// ============================================

function getStorageKey(baseKey: string): string {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) {
    throw new Error('No space ID available. Cannot access storage.');
  }
  return `${STORAGE_PREFIX}${spaceId}_${baseKey}`;
}

function getFromStorage<T>(baseKey: string, fallback: T): T {
  try {
    const key = getStorageKey(baseKey);
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${baseKey} from storage:`, error);
    return fallback;
  }
}

function saveToStorage<T>(baseKey: string, data: T): boolean {
  try {
    const key = getStorageKey(baseKey);
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${baseKey} to storage:`, error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      addNotification({
        type: 'error',
        title: 'Almacenamiento lleno',
        message: 'No se pudo guardar. Elimina misiones antiguas o documentos para liberar espacio.',
      });
    }
    return false;
  }
}

// ============================================
// MISSIONS (aisladas por espacio)
// ============================================

export function getMissions(): Mission[] {
  return getFromStorage<Mission[]>('missions', []);
}

export function getMission(id: string): Mission | undefined {
  return getMissions().find(m => m.id === id);
}

export function saveMission(mission: Mission): boolean {
  const missions = getMissions();
  const idx = missions.findIndex(m => m.id === mission.id);
  mission.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    missions[idx] = mission;
  } else {
    missions.push(mission);
  }
  return saveToStorage('missions', missions);
}

export function deleteMission(id: string): boolean {
  const missions = getMissions().filter(m => m.id !== id);
  return saveToStorage('missions', missions);
}

export function updateMissionStatus(id: string, status: MissionStatus): void {
  const mission = getMission(id);
  if (mission) {
    mission.status = status;
    saveMission(mission);
    addNotification({
      missionId: id,
      type: 'info',
      title: `Misión ${status === 'completed' ? 'completada' : status === 'cancelled' ? 'cancelada' : 'actualizada'}`,
      message: `La misión "${mission.need.title}" ha cambiado a estado: ${status}`,
    });
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

// ============================================
// SETTINGS (compartidos, no sensibles)
// ============================================

export function getSettings(): AppSettings {
  // Settings son globales, no aislados por espacio
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}settings`);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): boolean {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

// ============================================
// NOTIFICATIONS (aisladas por espacio)
// ============================================

export function getNotifications(): Notification[] {
  return getFromStorage<Notification[]>('notifications', []);
}

export function addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
  const notifications = getNotifications();
  notifications.unshift({
    ...notification,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    read: false,
  });
  saveToStorage('notifications', notifications.slice(0, 100));
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const n = notifications.find(n => n.id === id);
  if (n) {
    n.read = true;
    saveToStorage('notifications', notifications);
  }
}

export function clearNotifications(): void {
  saveToStorage('notifications', []);
}

// ============================================
// UTILITIES
// ============================================

export function generateId(): string {
  return uuidv4();
}

export async function computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// MISSION CREATION
// ============================================

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
      id: generateId(),
      needId: missionId,
      version: 1,
      objective: need.expectedResult,
      scope: need.description,
      exclusions: need.actionLimits,
      deliverables: [],
      acceptanceCriteria: need.closureCriteria
        ? need.closureCriteria.split('\n').filter(Boolean).map((c) => ({
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

// ============================================
// DATA EXPORT / IMPORT (solo del espacio actual)
// ============================================

export function exportAllData(): string {
  const data = {
    missions: getMissions(),
    notifications: getNotifications(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.missions) saveToStorage('missions', data.missions);
    if (data.notifications) saveToStorage('notifications', data.notifications);
    return true;
  } catch {
    return false;
  }
}

export function clearSpaceData(): void {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) return;
  
  // Eliminar solo datos de este espacio
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${STORAGE_PREFIX}${spaceId}_`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
