import { v4 as uuidv4 } from 'uuid';
import type { Mission, MissionStatus, AppSettings, Notification, TaskStatus } from './types';

const STORAGE_KEYS = {
  MISSIONS: 'atiende_missions',
  SETTINGS: 'atiende_settings',
  NOTIFICATIONS: 'atiende_notifications',
  USER: 'atiende_user',
  SESSION: 'atiende_session',
};

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

// Generic storage helpers with error handling
function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
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
// AUTH (local simulation - real auth needs Supabase)
// ============================================

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
}

export function getCurrentUser(): AuthUser {
  const user = getFromStorage<AuthUser>(STORAGE_KEYS.USER, {
    id: 'local-user',
    name: 'Usuario',
    email: '',
    isAuthenticated: true,
  });
  return user;
}

export function signIn(name: string, email: string): AuthUser {
  const user: AuthUser = {
    id: uuidv4(),
    name: name || 'Usuario',
    email: email || '',
    isAuthenticated: true,
  };
  saveToStorage(STORAGE_KEYS.USER, user);
  saveToStorage(STORAGE_KEYS.SESSION, {
    token: uuidv4(),
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
  return user;
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function isAuthenticated(): boolean {
  const user = getCurrentUser();
  return user.isAuthenticated;
}

// ============================================
// MISSIONS
// ============================================

export function getMissions(): Mission[] {
  return getFromStorage<Mission[]>(STORAGE_KEYS.MISSIONS, []);
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
  return saveToStorage(STORAGE_KEYS.MISSIONS, missions);
}

export function deleteMission(id: string): boolean {
  const missions = getMissions().filter(m => m.id !== id);
  return saveToStorage(STORAGE_KEYS.MISSIONS, missions);
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
// SETTINGS
// ============================================

export function getSettings(): AppSettings {
  return getFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): boolean {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

// ============================================
// NOTIFICATIONS
// ============================================

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

export function clearNotifications(): void {
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, []);
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
// DATA EXPORT / IMPORT
// ============================================

export function exportAllData(): string {
  const data = {
    missions: getMissions(),
    settings: getSettings(),
    notifications: getNotifications(),
    user: getCurrentUser(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.missions) saveToStorage(STORAGE_KEYS.MISSIONS, data.missions);
    if (data.settings) saveToStorage(STORAGE_KEYS.SETTINGS, data.settings);
    if (data.notifications) saveToStorage(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
    if (data.user) saveToStorage(STORAGE_KEYS.USER, data.user);
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
