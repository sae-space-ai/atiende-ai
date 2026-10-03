import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm', { locale: es });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es });
  } catch {
    return dateStr;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    planning: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    blocked: 'bg-orange-100 text-orange-700',
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    running: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    met: 'bg-green-100 text-green-700',
    unmet: 'bg-red-100 text-red-700',
    pending_review: 'bg-yellow-100 text-yellow-700',
    processed: 'bg-green-100 text-green-700',
    processing: 'bg-blue-100 text-blue-700',
    uploaded: 'bg-gray-100 text-gray-700',
    error: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    planning: 'Planificando',
    active: 'Activa',
    paused: 'Pausada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    blocked: 'Bloqueada',
    pending: 'Pendiente',
    in_progress: 'En progreso',
    running: 'Ejecutando',
    failed: 'Fallida',
    met: 'Cumplido',
    unmet: 'No cumplido',
    pending_review: 'Pendiente de revisión',
    processed: 'Procesado',
    processing: 'Procesando',
    uploaded: 'Cargado',
    error: 'Error',
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
    analyze: 'Solo análisis',
    execute_internal: 'Ejecución interna',
    execute_external: 'Ejecución externa',
  };
  return labels[status] || status;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'text-gray-500',
    medium: 'text-blue-500',
    high: 'text-orange-500',
    critical: 'text-red-500',
  };
  return colors[priority] || 'text-gray-500';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generatePlanFromNeed(need: {
  title: string;
  description: string;
  expectedResult: string;
  context: string;
}): {
  tasks: Array<{
    id: string;
    planId: string;
    title: string;
    description: string;
    dependencies: string[];
    inputs: string[];
    expectedOutputs: string;
    tool: string;
    validationCriterion: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
    order: number;
  }>;
} {
  const planId = String(crypto.randomUUID());
  
  const tasks: Array<{
    id: string;
    planId: string;
    title: string;
    description: string;
    dependencies: string[];
    inputs: string[];
    expectedOutputs: string;
    tool: string;
    validationCriterion: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
    order: number;
  }> = [
    {
      id: String(crypto.randomUUID()),
      planId,
      title: 'Analizar necesidad y contexto',
      description: `Revisar la descripción "${need.title}" y el contexto aportado para identificar información completa y lagunas.`,
      dependencies: [],
      inputs: ['Descripción de la necesidad', 'Contexto proporcionado'],
      expectedOutputs: 'Resumen estructurado de la necesidad con información completa y lagunas identificadas',
      tool: 'internal_query',
      validationCriterion: 'El resumen cubre todos los aspectos de la necesidad sin suposiciones no marcadas',
      status: 'pending' as const,
      order: 1,
    },
    {
      id: String(crypto.randomUUID()),
      planId,
      title: 'Revisar documentos aportados',
      description: 'Extraer y analizar el contenido de los documentos cargados para vincular información relevante con la misión.',
      dependencies: [],
      inputs: ['Documentos cargados'],
      expectedOutputs: 'Índice de documentos con contenido relevante extraído y vinculado a la misión',
      tool: 'document_read',
      validationCriterion: 'Cada documento tiene texto extraído y se ha identificado su relevancia',
      status: 'pending' as const,
      order: 2,
    },
    {
      id: String(crypto.randomUUID()),
      planId,
      title: 'Identificar información pendiente',
      description: 'Comparar lo que se sabe con lo que se necesita para el resultado esperado y listar lagunas.',
      dependencies: [/* will be set after IDs */],
      inputs: ['Resumen de necesidad', 'Contenido de documentos'],
      expectedOutputs: 'Lista de información pendiente con prioridad',
      tool: 'internal_query',
      validationCriterion: 'Cada laguna identificada se vincula a un criterio de aceptación',
      status: 'pending' as const,
      order: 3,
    },
    {
      id: String(crypto.randomUUID()),
      planId,
      title: 'Generar entregable principal',
      description: `Producir el resultado esperado: ${need.expectedResult || 'resultado definido en el contrato'}`,
      dependencies: [],
      inputs: ['Información completa', 'Documentos procesados'],
      expectedOutputs: 'Entregable en el formato solicitado con contenido estructurado',
      tool: 'content_generate',
      validationCriterion: 'El entregable aborda todos los criterios de aceptación definidos',
      status: 'pending' as const,
      order: 4,
    },
    {
      id: String(crypto.randomUUID()),
      planId,
      title: 'Verificar criterios de aceptación',
      description: 'Comprobar cada criterio definido en el contrato y registrar el estado de cumplimiento.',
      dependencies: [],
      inputs: ['Entregable generado', 'Criterios de aceptación'],
      expectedOutputs: 'Informe de verificación con estado de cada criterio',
      tool: 'internal_query',
      validationCriterion: 'Todos los criterios tienen un estado documentado (cumplido, no cumplido o pendiente)',
      status: 'pending' as const,
      order: 5,
    },
  ];

  // Set dependencies
  tasks[2].dependencies = [tasks[0].id, tasks[1].id];
  tasks[3].dependencies = [tasks[2].id];
  tasks[4].dependencies = [tasks[3].id];

  return { tasks };
}
