/**
 * Sistema de trabajos persistentes con estado real
 * 
 * - Cada trabajo tiene un estado verificable
 * - Los avances se guardan y persisten al recargar
 * - Controles de concurrencia y límites de consumo
 * - Cancelación y reanudación
 * - Compatible con Vercel (no depende de procesos en memoria)
 */

import { v4 as uuidv4 } from 'uuid';
import { getCurrentSpaceId } from './space';
import { getFromStorage, saveToStorage } from './store-internal';

// ============================================
// TIPOS
// ============================================

export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';

export interface Job {
  id: string;
  spaceId: string;
  missionId: string;
  type: 'analyze' | 'execute_plan' | 'generate_report';
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: JobProgress;
  tasks: JobTask[];
  error?: string;
  consumption: {
    aiCalls: number;
    tokensUsed: number;
    stepsCompleted: number;
  };
  idempotencyKey: string; // Para evitar duplicados
}

export interface JobProgress {
  percent: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  message: string;
}

export interface JobTask {
  id: string;
  jobId: string;
  title: string;
  description: string;
  status: TaskStatus;
  order: number;
  dependencies: string[];
  startedAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
  sources: Array<{
    type: 'user_provided' | 'document' | 'inference' | 'external';
    content: string;
    verified: boolean;
  }>;
}

// ============================================
// LÍMITES Y CONCURRENCIA
// ============================================

interface RateLimitState {
  aiCallsToday: number;
  lastResetDate: string;
  activeJobs: number;
  lastJobStart: number;
}

const RATE_LIMITS = {
  maxAICallsPerDay: 100,
  maxActiveJobs: 3,
  minJobIntervalMs: 2000, // 2 segundos entre inicios
};

function getRateLimitState(): RateLimitState {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) throw new Error('No space ID');
  
  const state = getFromStorage<RateLimitState>(`ratelimit_${spaceId}`, {
    aiCallsToday: 0,
    lastResetDate: new Date().toDateString(),
    activeJobs: 0,
    lastJobStart: 0,
  });
  
  // Reset diario
  const today = new Date().toDateString();
  if (state.lastResetDate !== today) {
    state.aiCallsToday = 0;
    state.lastResetDate = today;
  }
  
  return state;
}

function saveRateLimitState(state: RateLimitState): void {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) throw new Error('No space ID');
  saveToStorage(`ratelimit_${spaceId}`, state);
}

export function checkConcurrencyLimits(): { allowed: boolean; reason?: string } {
  const state = getRateLimitState();
  
  if (state.activeJobs >= RATE_LIMITS.maxActiveJobs) {
    return { allowed: false, reason: `Límite de trabajos simultáneos alcanzado (${RATE_LIMITS.maxActiveJobs})` };
  }
  
  const now = Date.now();
  if (now - state.lastJobStart < RATE_LIMITS.minJobIntervalMs) {
    return { allowed: false, reason: 'Espera unos segundos antes de iniciar otro trabajo' };
  }
  
  return { allowed: true };
}

export function checkAILimits(): { allowed: boolean; remaining: number; reason?: string } {
  const state = getRateLimitState();
  const remaining = RATE_LIMITS.maxAICallsPerDay - state.aiCallsToday;
  
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, reason: 'Límite diario de llamadas a IA alcanzado' };
  }
  
  return { allowed: true, remaining };
}

export function reserveAIUsage(calls: number = 1): void {
  const state = getRateLimitState();
  state.aiCallsToday += calls;
  saveRateLimitState(state);
}

export function incrementActiveJobs(delta: number): void {
  const state = getRateLimitState();
  state.activeJobs = Math.max(0, state.activeJobs + delta);
  state.lastJobStart = Date.now();
  saveRateLimitState(state);
}

// ============================================
// GESTIÓN DE TRABAJOS
// ============================================

export function createJob(missionId: string, type: Job['type'], tasks: Array<{title: string; description: string; dependencies: string[]}>): Job {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) throw new Error('No space ID');
  
  const jobId = uuidv4();
  const idempotencyKey = uuidv4();
  
  const job: Job = {
    id: jobId,
    spaceId,
    missionId,
    type,
    status: 'pending',
    createdAt: new Date().toISOString(),
    progress: {
      percent: 0,
      currentStep: 'Preparando...',
      totalSteps: tasks.length,
      completedSteps: 0,
      message: 'Trabajo creado, pendiente de iniciar',
    },
    tasks: tasks.map((t, i) => ({
      ...t,
      id: uuidv4(),
      jobId,
      order: i + 1,
      status: 'pending',
      sources: [],
    })),
    consumption: {
      aiCalls: 0,
      tokensUsed: 0,
      stepsCompleted: 0,
    },
    idempotencyKey,
  };
  
  saveJob(job);
  return job;
}

export function getJob(jobId: string): Job | undefined {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) return undefined;
  
  const jobs = getFromStorage<Job[]>(`jobs_${spaceId}`, []);
  const job = jobs.find(j => j.id === jobId);
  
  // Verificar pertenencia al espacio
  if (job && job.spaceId !== spaceId) {
    return undefined;
  }
  
  return job;
}

export function getJobsByMission(missionId: string): Job[] {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) return [];
  
  const jobs = getFromStorage<Job[]>(`jobs_${spaceId}`, []);
  return jobs.filter(j => j.missionId === missionId && j.spaceId === spaceId);
}

export function saveJob(job: Job): void {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) throw new Error('No space ID');
  
  // Verificar pertenencia
  if (job.spaceId !== spaceId) {
    throw new Error('Unauthorized: job does not belong to current space');
  }
  
  const jobs = getFromStorage<Job[]>(`jobs_${spaceId}`, []);
  const idx = jobs.findIndex(j => j.id === job.id);
  
  if (idx >= 0) {
    jobs[idx] = job;
  } else {
    jobs.push(job);
  }
  
  saveToStorage(`jobs_${spaceId}`, jobs);
}

export function updateJobProgress(jobId: string, progress: Partial<JobProgress>): void {
  const job = getJob(jobId);
  if (!job) return;
  
  job.progress = { ...job.progress, ...progress };
  saveJob(job);
}

export function updateTaskStatus(jobId: string, taskId: string, status: TaskStatus, result?: string, error?: string): void {
  const job = getJob(jobId);
  if (!job) return;
  
  const task = job.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.status = status;
  if (status === 'in_progress') task.startedAt = new Date().toISOString();
  if (status === 'completed' || status === 'failed') task.completedAt = new Date().toISOString();
  if (result) task.result = result;
  if (error) task.error = error;
  
  // Actualizar progreso
  const completed = job.tasks.filter(t => t.status === 'completed').length;
  job.progress.completedSteps = completed;
  job.progress.percent = Math.round((completed / job.tasks.length) * 100);
  job.consumption.stepsCompleted = completed;
  
  saveJob(job);
}

export function cancelJob(jobId: string): void {
  const job = getJob(jobId);
  if (!job) return;
  
  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();
  job.progress.message = 'Trabajo cancelado por el usuario';
  
  // Marcar tareas pendientes como canceladas
  job.tasks.forEach(t => {
    if (t.status === 'pending' || t.status === 'in_progress') {
      t.status = 'failed';
      t.error = 'Cancelado';
      t.completedAt = new Date().toISOString();
    }
  });
  
  saveJob(job);
  incrementActiveJobs(-1);
}

export function pauseJob(jobId: string): void {
  const job = getJob(jobId);
  if (!job || job.status !== 'running') return;
  
  job.status = 'paused';
  job.progress.message = 'Trabajo pausado';
  saveJob(job);
}

export function resumeJob(jobId: string): void {
  const job = getJob(jobId);
  if (!job || job.status !== 'paused') return;
  
  job.status = 'running';
  job.progress.message = 'Trabajo reanudado';
  saveJob(job);
}

// ============================================
// VERIFICACIÓN DE PERTENENCIA
// ============================================

export function verifyJobOwnership(jobId: string): boolean {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) return false;
  
  const job = getJob(jobId);
  return job?.spaceId === spaceId;
}

export function verifyMissionOwnership(missionId: string): boolean {
  const spaceId = getCurrentSpaceId();
  if (!spaceId) return false;
  
  const missions = getFromStorage<any[]>(`missions_${spaceId}`, []);
  return missions.some(m => m.id === missionId);
}
