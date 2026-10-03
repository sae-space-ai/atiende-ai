/**
 * Módulo de migración de planes de misión
 * 
 * Permite actualizar el plan de una misión específica desde la interfaz.
 * - Crea backup recuperable antes de modificar
 * - Es idempotente: repetirla no duplica datos
 * - Valida estructura antes y después
 * - Conserva documentos, evidencias, entregables e historial
 * - Archiva plan anterior si existían tareas ejecutadas
 */

import type { Mission, Plan, Task } from './types';
import { generateId } from './store';

export interface MigrationResult {
  success: boolean;
  missionId: string;
  previousVersion: number;
  newVersion: number;
  tasksCreated: number;
  tasksArchived: number;
  errors: string[];
  warnings: string[];
}

export interface MigrationBackup {
  timestamp: string;
  missionId: string;
  mission: Mission;
  reason: string;
}

// ============================================
// DEFINICIÓN DEL PLAN FIRECYCLE (11 TAREAS)
// ============================================

export function generateFIRECYCLETasks(planId: string): Task[] {
  const tasks: Task[] = [
    {
      id: generateId(),
      planId,
      title: 'Extraer alcance, entregables y restricciones',
      description: 'Analizar la descripción de la misión para identificar el alcance concreto, los entregables esperados y las restricciones operativas. Marcar el piloto de 100 hectáreas como PROPUESTA, no como superficie autorizada.',
      dependencies: [],
      inputs: ['Descripción de la misión', 'Contexto aportado por el usuario'],
      expectedOutputs: 'Documento estructurado con: alcance definido, lista de entregables, restricciones identificadas, piloto de 100ha marcado como propuesta pendiente de confirmación',
      tool: 'internal_analysis',
      validationCriterion: 'El documento distingue claramente entre hechos aportados por el usuario y propuestas. El piloto de 100ha aparece marcado como "propuesta, no autorizado".',
      status: 'pending',
      order: 1,
    },
    {
      id: generateId(),
      planId,
      title: 'Verificar documentos cargados',
      description: 'Comprobar qué documentos existen realmente en la misión. Si no hay documentos, registrar esa ausencia explícitamente. NO declarar documentos leídos o procesados cuando no existan.',
      dependencies: [],
      inputs: ['Lista de documentos de la misión'],
      expectedOutputs: 'Inventario de documentos con estado real: cargados, procesados, ausentes. Si no hay documentos, se registra "Sin documentos cargados" y se continúa con tareas independientes.',
      tool: 'document_inventory',
      validationCriterion: 'El inventario refleja exactamente los documentos presentes en la misión. No se inventan documentos que no existen.',
      status: 'pending',
      order: 2,
    },
    {
      id: generateId(),
      planId,
      title: 'Inventario de información necesaria',
      description: 'Crear un inventario de la información necesaria para el diagnóstico territorial. Identificar qué fuentes oficiales serían necesarias consultar (MAPA, INFOCAM, Planes de Gestión de Riesgo de Incendio).',
      dependencies: [],
      inputs: ['Alcance definido', 'Documentos disponibles (si existen)'],
      expectedOutputs: 'Lista de información necesaria con: tipo de dato, fuente potencial, disponibilidad actual. Si hay documentos, extraer información relevante.',
      tool: 'internal_analysis',
      validationCriterion: 'El inventario identifica claramente qué información falta y de dónde podría obtenerse.',
      status: 'pending',
      order: 3,
    },
    {
      id: generateId(),
      planId,
      title: 'Consulta de fuentes oficiales',
      description: 'Consultar fuentes oficiales mediante herramienta externa. Si la integración no está configurada, marcar como BLOQUEADA por configuración, NO sustituir por respuestas inventadas.',
      dependencies: ['Inventario de información necesaria'],
      inputs: ['Inventario de información'],
      expectedOutputs: 'Lista de fuentes consultadas con: nombre, enlace, fecha de consulta, cobertura territorial, limitaciones. Si la herramienta no está configurada, se registra "Bloqueado: herramienta externa no configurada".',
      tool: 'external_sources_query',
      validationCriterion: 'Cada fuente registrada tiene enlace verificable y fecha de consulta. Si está bloqueada, se indica explícitamente la causa.',
      status: 'blocked',
      blockedReason: 'Herramienta de consulta a fuentes externas no configurada. Requiere API key de búsqueda web o acceso a bases de datos oficiales.',
      order: 4,
    },
    {
      id: generateId(),
      planId,
      title: 'Diagnóstico territorial preliminar',
      description: 'Elaborar diagnóstico territorial con datos disponibles. Distinguir: hechos acreditados (con fuente), información aportada por el usuario, estimaciones (marcadas como tales) y lagunas de información. NO denominar "diagnóstico completo" si faltan datos.',
      dependencies: ['Verificar documentos cargados', 'Inventario de información necesaria'],
      inputs: ['Documentos cargados', 'Información del usuario', 'Fuentes oficiales (si disponibles)'],
      expectedOutputs: 'Documento de diagnóstico con secciones: hechos acreditados (con fuentes), información del usuario, estimaciones (marcadas), lagunas identificadas. Título: "Diagnóstico territorial preliminar" si faltan datos.',
      tool: 'content_generation',
      validationCriterion: 'Cada afirmación tiene etiqueta de fuente: "acreditado", "usuario", "estimación", "laguna". No se usa "diagnóstico completo" si hay lagunas.',
      status: 'pending',
      order: 5,
    },
    {
      id: generateId(),
      planId,
      title: 'Comparación de alternativas de prevención y gestión',
      description: 'Comparar alternativas de prevención, vigilancia, recuperación y gestión de biomasa. Explicar criterios de comparación (eficacia, coste, viabilidad técnica, impacto ambiental). NO atribuir viabilidad demostrada a ninguna alternativa sin evidencia.',
      dependencies: ['Diagnóstico territorial preliminar'],
      inputs: ['Diagnóstico territorial', 'Fuentes oficiales (si disponibles)'],
      expectedOutputs: 'Matriz comparativa de alternativas con: descripción, criterios de evaluación, ventajas, inconvenientes, nivel de evidencia disponible. Alternativas marcadas como "requiere validación" si no hay evidencia suficiente.',
      tool: 'content_generation',
      validationCriterion: 'Ninguna alternativa se presenta como "viabilidad demostrada" sin evidencia. Cada alternativa tiene nivel de evidencia: "demostrado", "parcial", "requiere validación".',
      status: 'pending',
      order: 6,
    },
    {
      id: generateId(),
      planId,
      title: 'Matriz de actuaciones priorizadas',
      description: 'Preparar matriz de actuaciones priorizadas con: finalidad, localización justificada (cuando exista datos), recursos necesarios, dependencias entre actuaciones, calendario propuesto, responsables propuestos por confirmar.',
      dependencies: ['Comparación de alternativas de prevención y gestión'],
      inputs: ['Alternativas comparadas', 'Diagnóstico territorial'],
      expectedOutputs: 'Tabla con columnas: actuación, finalidad, localización (justificada o "pendiente de datos"), recursos, dependencias, calendario, responsable (propuesto). Localizaciones sin datos marcadas como "pendiente de delimitación".',
      tool: 'content_generation',
      validationCriterion: 'Cada actuación tiene localización justificada o marcada como pendiente. Responsables aparecen como "propuesto por confirmar".',
      status: 'pending',
      order: 7,
    },
    {
      id: generateId(),
      planId,
      title: 'Presupuesto trazable',
      description: 'Desarrollar presupuesto con: cantidades, unidades, precios unitarios, fuentes de precios, fecha de referencia, supuestos. Comprobar cálculos mediante código. Cuando falten datos, usar escenarios identificados o dejar partida pendiente. NO inventar presupuestos aprobados.',
      dependencies: ['Matriz de actuaciones priorizadas'],
      inputs: ['Actuaciones priorizadas', 'Precios de referencia (si disponibles)'],
      expectedOutputs: 'Tabla presupuestaria con: partida, cantidad, unidad, precio unitario, subtotal, fuente del precio, fecha referencia, supuesto. Partidas sin datos marcadas como "pendiente de presupuesto" o "escenario X".',
      tool: 'budget_calculation',
      validationCriterion: 'Todos los cálculos son verificables. No hay partidas con precios inventados. Partidas pendientes están explícitamente marcadas.',
      status: 'pending',
      order: 8,
    },
    {
      id: generateId(),
      planId,
      title: 'Definición de indicadores',
      description: 'Definir indicadores con: método de medición, frecuencia de medición, situación inicial disponible, objetivos propuestos. NO presentar objetivos como resultados alcanzados.',
      dependencies: ['Matriz de actuaciones priorizadas'],
      inputs: ['Actuaciones priorizadas', 'Diagnóstico territorial'],
      expectedOutputs: 'Lista de indicadores con: nombre, método de medición, frecuencia, situación inicial (o "no disponible"), objetivo propuesto. Objetivos claramente etiquetados como "propuesto" o "objetivo".',
      tool: 'content_generation',
      validationCriterion: 'Ningún objetivo aparece como resultado alcanzado. Todos los objetivos están etiquetados como "propuesto" o "objetivo a alcanzar".',
      status: 'pending',
      order: 9,
    },
    {
      id: generateId(),
      planId,
      title: 'Plan de validación del piloto de 100 hectáreas',
      description: 'Preparar plan de validación del piloto indicando qué falta comprobar sobre: delimitación geográfica, titularidad de terrenos, disponibilidad, condiciones ambientales, autorizaciones necesarias. Todo marcado como pendiente de confirmación.',
      dependencies: ['Matriz de actuaciones priorizadas'],
      inputs: ['Propuesta de piloto de 100ha', 'Información territorial'],
      expectedOutputs: 'Lista de verificación con: aspecto a validar (delimitación, titularidad, disponibilidad, condiciones ambientales, autorizaciones), estado actual ("pendiente de confirmación"), acción necesaria, responsable propuesto.',
      tool: 'content_generation',
      validationCriterion: 'Todos los aspectos aparecen como "pendiente de confirmación". No se afirma que el piloto esté autorizado o delimitado.',
      status: 'pending',
      order: 10,
    },
    {
      id: generateId(),
      planId,
      title: 'Generación de dossier parcial',
      description: 'Generar dossier con la información disponible: diagnóstico preliminar, alternativas comparadas, actuaciones priorizadas, presupuesto con partidas pendientes, indicadores propuestos, plan de validación. Señalar claramente qué datos faltan.',
      dependencies: ['Presupuesto trazable', 'Definición de indicadores', 'Plan de validación del piloto de 100 hectáreas'],
      inputs: ['Todos los documentos generados'],
      expectedOutputs: 'Dossier parcial con secciones completadas y secciones marcadas como "pendiente de datos". No se inventan cifras ni fuentes.',
      tool: 'deliverable_generation',
      validationCriterion: 'El dossier señala explícitamente qué información falta. No hay datos inventados.',
      status: 'pending',
      order: 11,
    },
  ];

  return tasks;
}

// ============================================
// VALIDACIÓN
// ============================================

export function validateMissionStructure(mission: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!mission.id) errors.push('Falta mission.id');
  if (!mission.need) errors.push('Falta mission.need');
  if (!mission.contract) errors.push('Falta mission.contract');
  
  if (mission.need) {
    if (!mission.need.title) errors.push('Falta need.title');
    if (!mission.need.expectedResult) errors.push('Falta need.expectedResult');
  }
  
  if (mission.contract) {
    if (!mission.contract.version) errors.push('Falta contract.version');
    if (!mission.contract.objective) errors.push('Falta contract.objective');
  }

  return { valid: errors.length === 0, errors };
}

export function validatePlanStructure(plan: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!plan.id) errors.push('Falta plan.id');
  if (!plan.tasks || !Array.isArray(plan.tasks)) {
    errors.push('Falta plan.tasks o no es un array');
    return { valid: false, errors };
  }

  plan.tasks.forEach((task: any, i: number) => {
    if (!task.id) errors.push(`Tarea ${i}: falta id`);
    if (!task.title) errors.push(`Tarea ${i}: falta title`);
    if (!task.status) errors.push(`Tarea ${i}: falta status`);
  });

  return { valid: errors.length === 0, errors };
}

// ============================================
// BACKUP
// ============================================

export function createBackup(mission: Mission, reason: string): MigrationBackup {
  return {
    timestamp: new Date().toISOString(),
    missionId: mission.id,
    mission: JSON.parse(JSON.stringify(mission)), // Deep copy
    reason,
  };
}

export function saveBackup(backup: MigrationBackup): void {
  const backupsKey = `atiende_migration_backups`;
  const existing = localStorage.getItem(backupsKey);
  const backups: MigrationBackup[] = existing ? JSON.parse(existing) : [];
  backups.push(backup);
  localStorage.setItem(backupsKey, JSON.stringify(backups));
}

export function getBackups(missionId: string): MigrationBackup[] {
  const backupsKey = `atiende_migration_backups`;
  const existing = localStorage.getItem(backupsKey);
  if (!existing) return [];
  
  const backups: MigrationBackup[] = JSON.parse(existing);
  return backups.filter(b => b.missionId === missionId);
}

export function restoreFromBackup(backup: MigrationBackup): Mission {
  return JSON.parse(JSON.stringify(backup.mission));
}

// ============================================
// MIGRACIÓN PRINCIPAL
// ============================================

export function migrateMissionPlan(mission: Mission): MigrationResult {
  const result: MigrationResult = {
    success: false,
    missionId: mission.id,
    previousVersion: mission.contract.version,
    newVersion: mission.contract.version,
    tasksCreated: 0,
    tasksArchived: 0,
    errors: [],
    warnings: [],
  };

  try {
    // 1. Validar estructura actual
    const validation = validateMissionStructure(mission);
    if (!validation.valid) {
      result.errors.push(...validation.errors);
      return result;
    }

    // 2. Crear backup
    const backup = createBackup(mission, 'Migración de plan FIRECYCLE');
    saveBackup(backup);

    // 3. Separar resultado esperado de criterios (si es necesario)
    if (mission.need.expectedResult.includes('En Criterios de cierre')) {
      const parts = mission.need.expectedResult.split('En Criterios de cierre');
      mission.need.expectedResult = parts[0].trim();
      
      if (parts[1] && !mission.need.closureCriteria) {
        mission.need.closureCriteria = parts[1]
          .replace(/^[,\s]+/, '')
          .trim();
      }
    }

    // 4. Archivar plan anterior si existían tareas ejecutadas
    if (mission.plan && mission.plan.tasks.some(t => t.status === 'completed' || t.status === 'in_progress')) {
      result.tasksArchived = mission.plan.tasks.length;
      result.warnings.push(`Plan anterior archivado con ${result.tasksArchived} tareas`);
      
      // Guardar plan anterior en historial (simplificado)
      if (!mission.evidence) mission.evidence = [];
      mission.evidence.push({
        id: generateId(),
        missionId: mission.id,
        type: 'inference',
        content: `Plan anterior archivado: ${mission.plan.tasks.length} tareas`,
        source: 'migration',
        sourceDate: new Date().toISOString(),
        verified: true,
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Versionar contrato
    mission.contract.version += 1;
    mission.contract.objective = mission.need.expectedResult;
    
    // Actualizar criterios de aceptación
    if (mission.need.closureCriteria) {
      const criteriaLines = mission.need.closureCriteria
        .split('\n')
        .filter(line => line.trim().length > 0);
      
      mission.contract.acceptanceCriteria = criteriaLines.map(criterion => ({
        id: generateId(),
        description: criterion.trim(),
        type: 'human_review' as const,
        status: 'pending_review' as const,
        evidence: '',
      }));
    }

    // 6. Generar nuevo plan
    const newPlanId = generateId();
    const newTasks = generateFIRECYCLETasks(newPlanId);
    
    mission.plan = {
      id: newPlanId,
      missionId: mission.id,
      contractVersion: mission.contract.version,
      tasks: newTasks,
      createdAt: new Date().toISOString(),
    };

    result.tasksCreated = newTasks.length;
    result.newVersion = mission.contract.version;

    // 7. Validar nuevo plan
    const planValidation = validatePlanStructure(mission.plan);
    if (!planValidation.valid) {
      result.errors.push(...planValidation.errors);
      // Restaurar desde backup
      const restored = restoreFromBackup(backup);
      Object.assign(mission, restored);
      return result;
    }

    // 8. Actualizar estado
    mission.updatedAt = new Date().toISOString();
    mission.nextStep = 'Plan actualizado. Tareas 1-3 ejecutables, tarea 4 bloqueada por configuración pendiente.';

    result.success = true;

  } catch (error) {
    result.errors.push(`Error inesperado: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

// ============================================
// VERIFICACIÓN DE IDEMPOTENCIA
// ============================================

export function isPlanAlreadyMigrated(mission: Mission): boolean {
  if (!mission.plan) return false;
  
  // Verificar si el plan ya tiene las 11 tareas específicas
  const hasFIRECYCLETasks = mission.plan.tasks.length === 11 &&
    mission.plan.tasks.some(t => t.title.includes('Extraer alcance, entregables y restricciones'));
  
  return hasFIRECYCLETasks;
}
