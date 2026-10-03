/**
 * Sistema de espacio anónimo con cookie segura
 * 
 * Cada visitante recibe un identificador aleatorio seguro almacenado en una cookie.
 * Este identificador se usa para aislar datos (misiones, documentos, ejecuciones).
 * 
 * IMPORTANTE: Si el usuario elimina la cookie, pierde acceso a sus datos.
 * No hay sincronización entre dispositivos ni recuperación mediante cuenta.
 */

import { v4 as uuidv4 } from 'uuid';

const COOKIE_NAME = 'atiende_space_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 año en segundos

// Generar ID seguro (UUID v4 con entropía criptográfica)
function generateSecureId(): string {
  // UUID v4 ya usa crypto.getRandomValues internamente
  return uuidv4();
}

// Obtener o crear el espacio anónimo
export function getOrCreateSpaceId(): string {
  // Intentar obtener de cookie
  const cookieValue = getCookie(COOKIE_NAME);
  if (cookieValue && isValidSpaceId(cookieValue)) {
    return cookieValue;
  }
  
  // Crear nuevo ID
  const newId = generateSecureId();
  setCookie(COOKIE_NAME, newId, COOKIE_MAX_AGE);
  return newId;
}

// Obtener el espacio actual (sin crear si no existe)
export function getCurrentSpaceId(): string | null {
  const cookieValue = getCookie(COOKIE_NAME);
  return cookieValue && isValidSpaceId(cookieValue) ? cookieValue : null;
}

// Validar formato de space ID (UUID v4)
function isValidSpaceId(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

// Helpers para cookies
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  // Cookie segura: HttpOnly no se puede establecer desde JS, pero SameSite=Lax protege contra CSRF
  // En producción, el servidor debería establecer esta cookie con HttpOnly
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

// Eliminar cookie (para pruebas o logout manual)
export function clearSpaceCookie(): void {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// ============================================
// LÍMITES DE USO POR ESPACIO
// ============================================

export interface SpaceLimits {
  maxMissions: number;
  maxDocumentsPerMission: number;
  maxDocumentSizeMB: number;
  maxExecutionsPerHour: number;
  maxAICallsPerDay: number;
  maxStorageMB: number;
}

const DEFAULT_LIMITS: SpaceLimits = {
  maxMissions: 50,
  maxDocumentsPerMission: 20,
  maxDocumentSizeMB: 10,
  maxExecutionsPerHour: 30,
  maxAICallsPerDay: 100,
  maxStorageMB: 500,
};

export function getSpaceLimits(): SpaceLimits {
  return DEFAULT_LIMITS;
}

// Verificar límites antes de operaciones
export function checkLimits(operation: 'create_mission' | 'upload_document' | 'execute_task', context: {
  currentMissions?: number;
  currentDocuments?: number;
  documentSizeMB?: number;
  currentExecutionsThisHour?: number;
}): { allowed: boolean; reason?: string } {
  const limits = getSpaceLimits();
  
  switch (operation) {
    case 'create_mission':
      if (context.currentMissions && context.currentMissions >= limits.maxMissions) {
        return { allowed: false, reason: `Límite de misiones alcanzado (${limits.maxMissions})` };
      }
      break;
      
    case 'upload_document':
      if (context.currentDocuments && context.currentDocuments >= limits.maxDocumentsPerMission) {
        return { allowed: false, reason: `Límite de documentos por misión alcanzado (${limits.maxDocumentsPerMission})` };
      }
      if (context.documentSizeMB && context.documentSizeMB > limits.maxDocumentSizeMB) {
        return { allowed: false, reason: `Tamaño de archivo excede el límite (${limits.maxDocumentSizeMB} MB)` };
      }
      break;
      
    case 'execute_task':
      if (context.currentExecutionsThisHour && context.currentExecutionsThisHour >= limits.maxExecutionsPerHour) {
        return { allowed: false, reason: `Límite de ejecuciones por hora alcanzado (${limits.maxExecutionsPerHour})` };
      }
      break;
  }
  
  return { allowed: true };
}

// ============================================
// INFORMACIÓN PARA EL USUARIO
// ============================================

export function getSpaceInfoMessage(): string {
  return 'Tus datos están aislados en este navegador. Si eliminas las cookies, perderás acceso a tus misiones. No hay sincronización entre dispositivos.';
}
