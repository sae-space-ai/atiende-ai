/**
 * Cliente de IA con proveedor configurable
 * 
 * Soporta OpenAI y Anthropic. Si no hay credencial configurada,
 * informa claramente que la ejecución está pendiente de configuración.
 * NUNCA presenta respuestas predefinidas como resultados de IA.
 */

export interface AIProvider {
  name: string;
  configured: boolean;
  chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  timestamp: string;
}

export interface AIError extends Error {
  code: 'NOT_CONFIGURED' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'TIMEOUT' | 'NETWORK' | 'UNKNOWN';
  retryable: boolean;
}

// ============================================
// CONFIGURACIÓN DEL PROVEEDOR
// ============================================

interface ProviderConfig {
  provider: 'openai' | 'anthropic' | 'none';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

function getProviderConfig(): ProviderConfig {
  // En producción, estas variables vienen del servidor (Vercel env)
  // En cliente, solo leemos flags públicos (nunca la API key)
  const provider = (import.meta.env.VITE_AI_PROVIDER || 'none') as ProviderConfig['provider'];
  
  return {
    provider,
    // La API key NUNCA llega al cliente en producción
    // Se usa un proxy del servidor o se configura en serverless functions
    apiKey: undefined,
    model: import.meta.env.VITE_AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20241022'),
    baseUrl: import.meta.env.VITE_AI_BASE_URL,
  };
}

export function isAIConfigured(): boolean {
  const config = getProviderConfig();
  return config.provider !== 'none';
}

export function getAIProviderInfo(): { name: string; configured: boolean; message: string } {
  const config = getProviderConfig();
  
  if (config.provider === 'none') {
    return {
      name: 'Ninguno',
      configured: false,
      message: 'La ejecución con IA está pendiente de configuración. Configura AI_PROVIDER en el servidor.',
    };
  }
  
  return {
    name: config.provider === 'openai' ? 'OpenAI' : 'Anthropic',
    configured: true,
    message: `Proveedor configurado: ${config.provider}. Modelo: ${config.model}`,
  };
}

// ============================================
// IMPLEMENTACIÓN DE PROVEEDORES
// ============================================

class OpenAIProvider implements AIProvider {
  name = 'openai';
  configured = true;
  
  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    const config = getProviderConfig();
    
    // En producción, esto llama a una serverless function de Vercel
    // que tiene la API key en el servidor
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        messages,
        model: options.model || config.model,
        maxTokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.3,
      }),
    });
    
    if (!response.ok) {
      const error = new Error(`OpenAI error: ${response.statusText}`) as AIError;
      error.code = response.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN';
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      provider: 'openai',
      timestamp: new Date().toISOString(),
    };
  }
}

class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  configured = true;
  
  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    const config = getProviderConfig();
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'anthropic',
        messages,
        model: options.model || config.model,
        maxTokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.3,
      }),
    });
    
    if (!response.ok) {
      const error = new Error(`Anthropic error: ${response.statusText}`) as AIError;
      error.code = response.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN';
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    }
    
    const data = await response.json();
    
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
      provider: 'anthropic',
      timestamp: new Date().toISOString(),
    };
  }
}

class UnconfiguredProvider implements AIProvider {
  name = 'none';
  configured = false;
  
  async chat(): Promise<AIResponse> {
    const error = new Error('Proveedor de IA no configurado') as AIError;
    error.code = 'NOT_CONFIGURED';
    error.retryable = false;
    throw error;
  }
}

// ============================================
// FÁBRICA DE PROVEEDORES
// ============================================

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (providerInstance) return providerInstance;
  
  const config = getProviderConfig();
  
  switch (config.provider) {
    case 'openai':
      providerInstance = new OpenAIProvider();
      break;
    case 'anthropic':
      providerInstance = new AnthropicProvider();
      break;
    default:
      providerInstance = new UnconfiguredProvider();
  }
  
  return providerInstance;
}

// ============================================
// PROMPTS DEL SISTEMA PARA ATIENDE
// ============================================

export const SYSTEM_PROMPTS = {
  ANALYZE_NEED: `Eres un asistente especializado en analizar necesidades y preparar planes de actuación.

Tu tarea:
1. Comprender la necesidad descrita por el usuario
2. Identificar el objetivo concreto y verificable
3. Determinar qué información falta para completar el trabajo
4. Proponer un plan de tareas concreto

Reglas estrictas:
- NO inventes hechos, fuentes o datos
- NO asumas información que no esté explícitamente proporcionada
- Si falta información crítica, indícalo claramente
- Distingue entre hechos aportados, inferencias y propuestas
- Sé específico y accionable en tus recomendaciones

Formato de respuesta (JSON):
{
  "objective": "Objetivo concreto y verificable",
  "expectedResult": "Resultado esperado específico",
  "missingInfo": ["Lista de información que falta"],
  "tasks": [
    {
      "title": "Título de la tarea",
      "description": "Descripción detallada",
      "inputs": ["Entradas necesarias"],
      "outputs": "Salidas esperadas",
      "dependencies": []
    }
  ],
  "risks": ["Riesgos o limitaciones identificados"]
}`,

  EXECUTE_TASK: `Eres un asistente ejecutando una tarea específica dentro de un plan.

Contexto de la misión:
- Objetivo: {{OBJECTIVE}}
- Tarea actual: {{TASK_TITLE}}
- Descripción: {{TASK_DESCRIPTION}}
- Entradas disponibles: {{INPUTS}}

Reglas estrictas:
- Trabaja SOLO con la información proporcionada
- NO inventes datos, fuentes o hechos
- Si no tienes información suficiente, indícalo claramente
- Cita las fuentes de donde obtienes la información
- Distingue entre hechos verificados y propuestas

Formato de respuesta (JSON):
{
  "status": "completed|partial|blocked",
  "result": "Resultado de la tarea",
  "sources": [
    {
      "type": "user_provided|document|inference",
      "content": "Contenido o referencia",
      "verified": true|false
    }
  ],
  "missingInfo": ["Información que falta si status es partial o blocked"],
  "nextSteps": ["Pasos siguientes recomendados"]
}`,

  GENERATE_REPORT: `Eres un asistente generando un informe profesional basado en información verificada.

Contexto:
- Necesidad: {{NEED_TITLE}}
- Objetivo: {{OBJECTIVE}}
- Información disponible: {{AVAILABLE_INFO}}

Reglas estrictas:
- Usa SOLO la información proporcionada
- NO inventes datos, estadísticas o fuentes
- Si hay secciones que no puedes completar por falta de información, indícalo claramente como "Información pendiente"
- Cita las fuentes de cada afirmación
- Estructura el informe de forma clara y profesional

Formato de respuesta (JSON):
{
  "title": "Título del informe",
  "sections": [
    {
      "title": "Título de la sección",
      "content": "Contenido de la sección",
      "sources": ["Fuentes utilizadas"]
    }
  ],
  "pendingInfo": ["Información que falta para completar el informe"],
  "conclusions": ["Conclusiones basadas en la información disponible"]
}`,
};

// ============================================
// FUNCIONES DE ALTO NIVEL
// ============================================

export async function analyzeNeed(
  needTitle: string,
  needDescription: string,
  context: string,
  documents: Array<{ name: string; content: string }>
): Promise<AIResponse> {
  const provider = getAIProvider();
  
  const userMessage = `
Necesidad: ${needTitle}

Descripción:
${needDescription}

Contexto adicional:
${context || 'No proporcionado'}

Documentos disponibles:
${documents.map(d => `- ${d.name}: ${d.content.substring(0, 500)}...`).join('\n\n') || 'Ninguno'}

Analiza esta necesidad y prepara un plan de actuación.
`;

  return provider.chat([
    { role: 'system', content: SYSTEM_PROMPTS.ANALYZE_NEED },
    { role: 'user', content: userMessage },
  ], { temperature: 0.3 });
}

export async function executeTask(
  objective: string,
  taskTitle: string,
  taskDescription: string,
  inputs: string[],
  availableInfo: string
): Promise<AIResponse> {
  const provider = getAIProvider();
  
  const prompt = SYSTEM_PROMPTS.EXECUTE_TASK
    .replace('{{OBJECTIVE}}', objective)
    .replace('{{TASK_TITLE}}', taskTitle)
    .replace('{{TASK_DESCRIPTION}}', taskDescription)
    .replace('{{INPUTS}}', inputs.join(', '));
  
  const userMessage = `
Información disponible:
${availableInfo}

Ejecuta la tarea según las instrucciones.
`;

  return provider.chat([
    { role: 'system', content: prompt },
    { role: 'user', content: userMessage },
  ], { temperature: 0.2 });
}

export async function generateReport(
  needTitle: string,
  objective: string,
  availableInfo: string
): Promise<AIResponse> {
  const provider = getAIProvider();
  
  const prompt = SYSTEM_PROMPTS.GENERATE_REPORT
    .replace('{{NEED_TITLE}}', needTitle)
    .replace('{{OBJECTIVE}}', objective)
    .replace('{{AVAILABLE_INFO}}', availableInfo);
  
  const userMessage = `Genera el informe completo basado en la información proporcionada.`;

  return provider.chat([
    { role: 'system', content: prompt },
    { role: 'user', content: userMessage },
  ], { temperature: 0.3, maxTokens: 6000 });
}
