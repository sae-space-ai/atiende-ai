/**
 * Plan específico para la misión FIRECYCLE EXTREM
 * 
 * Este módulo define las 11 tareas específicas con dependencias,
 * herramientas requeridas y criterios de validación.
 */

import type { Task } from './types';

export interface FIRECYCLETask extends Omit<Task, 'status' | 'startedAt' | 'completedAt'> {
  tool: string;
  toolConfigured: boolean;
  blockedReason?: string;
}

export function generateFIRECYCLEPlan(planId: string): FIRECYCLETask[] {
  const tasks: FIRECYCLETask[] = [
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Extraer alcance, entregables y restricciones',
      description: 'Analizar la descripción de la misión para identificar el alcance concreto, los entregables esperados y las restricciones operativas. Marcar el piloto de 100 hectáreas como PROPUESTA, no como superficie autorizada.',
      dependencies: [],
      inputs: ['Descripción de la misión', 'Contexto aportado por el usuario'],
      expectedOutputs: 'Documento estructurado con: alcance definido, lista de entregables, restricciones identificadas, piloto de 100ha marcado como propuesta pendiente de confirmación',
      tool: 'internal_analysis',
      toolConfigured: true,
      validationCriterion: 'El documento distingue claramente entre hechos aportados por el usuario y propuestas. El piloto de 100ha aparece marcado como "propuesta, no autorizado".',
      order: 1,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Verificar documentos cargados',
      description: 'Comprobar qué documentos existen realmente en la misión. Si no hay documentos, registrar esa ausencia explícitamente. NO declarar documentos leídos o procesados cuando no existan.',
      dependencies: [],
      inputs: ['Lista de documentos de la misión'],
      expectedOutputs: 'Inventario de documentos con estado real: cargados, procesados, ausentes. Si no hay documentos, se registra "Sin documentos cargados" y se continúa con tareas independientes.',
      tool: 'document_inventory',
      toolConfigured: true,
      validationCriterion: 'El inventario refleja exactamente los documentos presentes en la misión. No se inventan documentos que no existen.',
      order: 2,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Inventario de información necesaria y consulta de fuentes oficiales',
      description: 'Crear un inventario de la información necesaria para el diagnóstico territorial. Consultar fuentes oficiales (MAPA, INFOCAM, Planes de Gestión de Riesgo de Incendio) mediante herramienta externa. Si la integración no está configurada, marcar tareas como BLOQUEADAS por configuración, NO sustituir por respuestas inventadas.',
      dependencies: ['Extraer alcance, entregables y restricciones', 'Verificar documentos cargados'],
      inputs: ['Alcance definido', 'Documentos disponibles (si existen)'],
      expectedOutputs: 'Lista de fuentes consultadas con: nombre, enlace, fecha de consulta, cobertura territorial, limitaciones identificadas. Si la herramienta externa no está configurada, se registra "Bloqueado: herramienta externa no configurada".',
      tool: 'external_sources_query',
      toolConfigured: false, // Requiere configuración de API de fuentes externas
      blockedReason: 'Herramienta de consulta a fuentes externas no configurada. Requiere API key de búsqueda web o acceso a bases de datos oficiales.',
      validationCriterion: 'Cada fuente registrada tiene enlace verificable y fecha de consulta. Si está bloqueada, se indica explícitamente la causa.',
      order: 3,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Diagnóstico territorial',
      description: 'Elaborar diagnóstico territorial sustentado en datos obtenidos. Distinguir: hechos acreditados (con fuente), información aportada por el usuario, estimaciones (marcadas como tales) y lagunas de información. NO denominar "diagnóstico completo" si faltan datos.',
      dependencies: ['Inventario de información necesaria y consulta de fuentes oficiales'],
      inputs: ['Fuentes oficiales consultadas', 'Documentos cargados', 'Información del usuario'],
      expectedOutputs: 'Documento de diagnóstico con secciones: hechos acreditados (con fuentes), información del usuario, estimaciones (marcadas), lagunas identificadas. Título: "Diagnóstico territorial preliminar" si faltan datos.',
      tool: 'content_generation',
      toolConfigured: true,
      validationCriterion: 'Cada afirmación tiene etiqueta de fuente: "acreditado", "usuario", "estimación", "laguna". No se usa "diagnóstico completo" si hay lagunas.',
      order: 4,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Comparación de alternativas de prevención y gestión',
      description: 'Comparar alternativas de prevención, vigilancia, recuperación y gestión de biomasa. Explicar criterios de comparación (eficacia, coste, viabilidad técnica, impacto ambiental). NO atribuir viabilidad demostrada a ninguna alternativa sin evidencia.',
      dependencies: ['Diagnóstico territorial'],
      inputs: ['Diagnóstico territorial', 'Fuentes oficiales'],
      expectedOutputs: 'Matriz comparativa de alternativas con: descripción, criterios de evaluación, ventajas, inconvenientes, nivel de evidencia disponible. Alternativas marcadas como "requiere validación" si no hay evidencia suficiente.',
      tool: 'content_generation',
      toolConfigured: true,
      validationCriterion: 'Ninguna alternativa se presenta como "viabilidad demostrada" sin evidencia. Cada alternativa tiene nivel de evidencia: "demostrado", "parcial", "requiere validación".',
      order: 5,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Matriz de actuaciones priorizadas',
      description: 'Preparar matriz de actuaciones priorizadas con: finalidad, localización justificada (cuando exista datos), recursos necesarios, dependencias entre actuaciones, calendario propuesto, responsables propuestos por confirmar.',
      dependencies: ['Comparación de alternativas de prevención y gestión'],
      inputs: ['Alternativas comparadas', 'Diagnóstico territorial'],
      expectedOutputs: 'Tabla con columnas: actuación, finalidad, localización (justificada o "pendiente de datos"), recursos, dependencias, calendario, responsable (propuesto). Localizaciones sin datos marcadas como "pendiente de delimitación".',
      tool: 'content_generation',
      toolConfigured: true,
      validationCriterion: 'Cada actuación tiene localización justificada o marcada como pendiente. Responsables aparecen como "propuesto por confirmar".',
      order: 6,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Presupuesto trazable',
      description: 'Desarrollar presupuesto con: cantidades, unidades, precios unitarios, fuentes de precios, fecha de referencia, supuestos. Comprobar cálculos mediante código. Cuando falten datos, usar escenarios identificados o dejar partida pendiente. NO inventar presupuestos aprobados.',
      dependencies: ['Matriz de actuaciones priorizadas'],
      inputs: ['Actuaciones priorizadas', 'Precios de referencia (si disponibles)'],
      expectedOutputs: 'Tabla presupuestaria con: partida, cantidad, unidad, precio unitario, subtotal, fuente del precio, fecha referencia, supuesto. Partidas sin datos marcadas como "pendiente de presupuesto" o "escenario X".',
      tool: 'budget_calculation',
      toolConfigured: true,
      validationCriterion: 'Todos los cálculos son verificables. No hay partidas con precios inventados. Partidas pendientes están explícitamente marcadas.',
      order: 7,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Definición de indicadores',
      description: 'Definir indicadores con: método de medición, frecuencia de medición, situación inicial disponible, objetivos propuestos. NO presentar objetivos como resultados alcanzados.',
      dependencies: ['Matriz de actuaciones priorizadas'],
      inputs: ['Actuaciones priorizadas', 'Diagnóstico territorial'],
      expectedOutputs: 'Lista de indicadores con: nombre, método de medición, frecuencia, situación inicial (o "no disponible"), objetivo propuesto. Objetivos claramente etiquetados como "propuesto" o "objetivo".',
      tool: 'content_generation',
      toolConfigured: true,
      validationCriterion: 'Ningún objetivo aparece como resultado alcanzado. Todos los objetivos están etiquetados como "propuesto" o "objetivo a alcanzar".',
      order: 8,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Plan de validación del piloto de 100 hectáreas',
      description: 'Preparar plan de validación del piloto indicando qué falta comprobar sobre: delimitación geográfica, titularidad de terrenos, disponibilidad, condiciones ambientales, autorizaciones necesarias. Todo marcado como pendiente de confirmación.',
      dependencies: ['Matriz de actuaciones priorizadas'],
      inputs: ['Propuesta de piloto de 100ha', 'Información territorial'],
      expectedOutputs: 'Lista de verificación con: aspecto a validar (delimitación, titularidad, disponibilidad, condiciones ambientales, autorizaciones), estado actual ("pendiente de confirmación"), acción necesaria, responsable propuesto.',
      tool: 'content_generation',
      toolConfigured: true,
      validationCriterion: 'Todos los aspectos aparecen como "pendiente de confirmación". No se afirma que el piloto esté autorizado o delimitado.',
      order: 9,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Generación de entregables (Word, PDF, Excel)',
      description: 'Generar informe Word, versión PDF y archivo Excel mediante herramientas de exportación reales. Comprobar que los tres archivos se abren y que contenidos y cifras son coherentes entre formatos. Generar texto NO equivale a generar archivos.',
      dependencies: ['Presupuesto trazable', 'Definición de indicadores', 'Plan de validación del piloto de 100 hectáreas'],
      inputs: ['Todos los documentos generados', 'Diagnóstico', 'Alternativas', 'Actuaciones', 'Presupuesto', 'Indicadores', 'Plan de validación'],
      expectedOutputs: 'Tres archivos descargables: informe.docx, informe.pdf, plan.xlsx. Todos verificables y con contenido coherente.',
      tool: 'deliverable_generation',
      toolConfigured: true,
      validationCriterion: 'Los tres archivos existen, se pueden abrir y contienen información coherente. Las cifras del presupuesto coinciden entre formatos.',
      order: 10,
    },
    {
      id: crypto.randomUUID(),
      planId,
      title: 'Evaluación de criterios de aceptación',
      description: 'Evaluar cada criterio de aceptación con evidencias. Usar estados: cumplido, incumplido, pendiente de comprobación. Mantener pendiente la aceptación del promotor hasta que revise el resultado.',
      dependencies: ['Generación de entregables (Word, PDF, Excel)'],
      inputs: ['Criterios de aceptación del contrato', 'Entregables generados', 'Evidencias recopiladas'],
      expectedOutputs: 'Tabla de evaluación con: criterio, estado (cumplido/incumplido/pendiente), evidencia, observaciones. Aceptación final: "Pendiente de revisión del promotor".',
      tool: 'criteria_evaluation',
      toolConfigured: true,
      validationCriterion: 'Cada criterio tiene estado y evidencia. La aceptación final está marcada como "pendiente de revisión del promotor".',
      order: 11,
    },
  ];

  // Establecer dependencias
  tasks[2].dependencies = [tasks[0].id, tasks[1].id];
  tasks[3].dependencies = [tasks[2].id];
  tasks[4].dependencies = [tasks[3].id];
  tasks[5].dependencies = [tasks[4].id];
  tasks[6].dependencies = [tasks[5].id];
  tasks[7].dependencies = [tasks[5].id];
  tasks[8].dependencies = [tasks[5].id];
  tasks[9].dependencies = [tasks[6].id, tasks[7].id, tasks[8].id];
  tasks[10].dependencies = [tasks[9].id];

  return tasks;
}

export const FIRECYCLE_TOOLS = {
  internal_analysis: {
    name: 'Análisis interno',
    description: 'Análisis de texto y extracción de información estructurada',
    configured: true,
  },
  document_inventory: {
    name: 'Inventario de documentos',
    description: 'Verificación de documentos cargados en la misión',
    configured: true,
  },
  external_sources_query: {
    name: 'Consulta a fuentes externas',
    description: 'Búsqueda en bases de datos oficiales (MAPA, INFOCAM, etc.)',
    configured: false,
    requirement: 'Requiere API key de búsqueda web o acceso a bases de datos oficiales',
  },
  content_generation: {
    name: 'Generación de contenido',
    description: 'Redacción de documentos estructurados',
    configured: true,
  },
  budget_calculation: {
    name: 'Cálculo presupuestario',
    description: 'Cálculos matemáticos con verificación',
    configured: true,
  },
  deliverable_generation: {
    name: 'Generación de entregables',
    description: 'Exportación a PDF, DOCX, XLSX',
    configured: true,
  },
  criteria_evaluation: {
    name: 'Evaluación de criterios',
    description: 'Verificación de criterios de aceptación',
    configured: true,
  },
};
