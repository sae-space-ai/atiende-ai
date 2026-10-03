/**
 * Middleware de verificación de espacio anónimo
 * 
 * Valida que la cookie del espacio existe y es válida.
 * Se usa en todas las rutas protegidas.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function verifySpaceCookie(req: VercelRequest): string | null {
  const spaceId = req.cookies?.atiende_space_id;
  
  if (!spaceId) return null;
  if (!UUID_V4_REGEX.test(spaceId)) return null;
  
  return spaceId;
}

export function requireSpace(req: VercelRequest, res: VercelResponse): string | null {
  const spaceId = verifySpaceCookie(req);
  
  if (!spaceId) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Espacio anónimo no válido. Recarga la página para obtener un nuevo espacio.'
    });
    return null;
  }
  
  return spaceId;
}

/**
 * Protección CSRF: verificar que la petición viene del mismo origen
 */
export function verifyOrigin(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  
  // En desarrollo, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // En producción, verificar que el origen coincide con el host
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        res.status(403).json({ error: 'Forbidden', message: 'Origen no válido' });
        return false;
      }
    } catch {
      res.status(403).json({ error: 'Forbidden', message: 'Origen inválido' });
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitizar ID para prevenir inyección
 */
export function sanitizeId(id: string): string | null {
  if (typeof id !== 'string') return null;
  if (id.length > 100) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}
