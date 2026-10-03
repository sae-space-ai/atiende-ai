/**
 * Funciones internas del store para uso por otros módulos
 * No exportar públicamente - solo para uso interno
 */

const STORAGE_PREFIX = 'atiende_';

export function getSpaceId(): string | null {
  const cookieValue = getCookie('atiende_space_id');
  return cookieValue;
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export function getFromStorage<T>(baseKey: string, fallback: T): T {
  const spaceId = getSpaceId();
  if (!spaceId) return fallback;
  
  try {
    const key = `${STORAGE_PREFIX}${spaceId}_${baseKey}`;
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${baseKey} from storage:`, error);
    return fallback;
  }
}

export function saveToStorage<T>(baseKey: string, value: T): boolean {
  const spaceId = getSpaceId();
  if (!spaceId) return false;
  
  try {
    const key = `${STORAGE_PREFIX}${spaceId}_${baseKey}`;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving ${baseKey} to storage:`, error);
    return false;
  }
}
