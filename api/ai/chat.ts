/**
 * Serverless function para proxy de IA
 * 
 * Esta función actúa como proxy entre el cliente y el proveedor de IA.
 * La API key se mantiene en el servidor y nunca llega al cliente.
 * 
 * Variables de entorno necesarias:
 * - AI_PROVIDER: 'openai' | 'anthropic' | 'none'
 * - AI_API_KEY: Clave del proveedor
 * - AI_MODEL: Modelo a usar (opcional)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  provider: 'openai' | 'anthropic';
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  spaceId?: string; // Para límites por espacio
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar configuración
  const provider = process.env.AI_PROVIDER || 'none';
  const apiKey = process.env.AI_API_KEY;

  if (provider === 'none' || !apiKey) {
    return res.status(503).json({ 
      error: 'AI provider not configured',
      message: 'Configura AI_PROVIDER y AI_API_KEY en las variables de entorno'
    });
  }

  try {
    const body: RequestBody = req.body;

    // Validar espacio (protección contra abuso)
    const spaceId = body.spaceId || req.cookies?.atiende_space_id;
    if (!spaceId) {
      return res.status(401).json({ error: 'Missing space ID' });
    }

    // Validar entrada
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages' });
    }

    // Sanitizar mensajes (protección contra inyección)
    const sanitizedMessages = body.messages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 50000), // Limitar tamaño
    }));

    let response;

    if (provider === 'openai') {
      response = await callOpenAI(apiKey, sanitizedMessages, body);
    } else if (provider === 'anthropic') {
      response = await callAnthropic(apiKey, sanitizedMessages, body);
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }

    // Log de uso (sin contenido sensible)
    console.log(`[AI] Provider: ${provider}, Model: ${body.model}, Space: ${spaceId.substring(0, 8)}...`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('[AI] Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      if (error.message.includes('timeout')) {
        return res.status(504).json({ error: 'Request timeout' });
      }
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function callOpenAI(apiKey: string, messages: ChatMessage[], body: RequestBody) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model || process.env.AI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: body.maxTokens || 4000,
      temperature: body.temperature || 0.3,
    }),
    signal: AbortSignal.timeout(60000), // 60s timeout
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${error}`);
  }

  return response.json();
}

async function callAnthropic(apiKey: string, messages: ChatMessage[], body: RequestBody) {
  // Separar system message
  const systemMessage = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: body.model || process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: body.maxTokens || 4000,
      system: systemMessage?.content,
      messages: chatMessages,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${error}`);
  }

  return response.json();
}
