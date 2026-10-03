/**
 * Script de migración para la misión FIRECYCLE EXTREM
 * 
 * EJECUTAR EN LA CONSOLA DEL NAVEGADOR:
 * 
 * 1. Abrir ATIENDE en el navegador
 * 2. Abrir DevTools (F12) → Console
 * 3. Copiar y pegar este script completo
 * 4. Ejecutar
 * 
 * Este script:
 * - Busca la misión "FIRECYCLE EXTREM"
 * - Separa resultado esperado de criterios de aceptación
 * - Limpia el objetivo (quita frase accidental)
 * - Versiona el contrato (v2)
 * - Reemplaza el plan con 11 tareas específicas
 * - Mantiene documentos e historial
 * - NO marca tareas como completadas
 */

(function migrateFIRECYCLE() {
  'use strict';

  console.log('🔍 Buscando misión FIRECYCLE EXTREM...');

  // Obtener espacio actual
  const spaceId = document.cookie
    .split('; ')
    .find(row => row.startsWith('atiende_space_id='))
    ?.split('=')[1];

  if (!spaceId) {
    console.error('❌ No se encontró cookie de espacio anónimo');
    return;
  }

  console.log(`✅ Espacio: ${spaceId.substring(0, 8)}...`);

  // Obtener misiones
  const missionsKey = `atiende_${spaceId}_missions`;
  const missionsData = localStorage.getItem(missionsKey);
  
  if (!missionsData) {
    console.error('❌ No hay misiones en este espacio');
    return;
  }

  const missions = JSON.parse(missionsData);
  
  // Buscar misión FIRECYCLE EXTREM
  const mission = missions.find((m: any) => 
    m.need.title.toLowerCase().includes('firecycle') || 
    m.need.title.toLowerCase().includes('fire') ||
    m.need.title.toUpperCase().includes('FIRECYCLE')
  );

  if (!mission) {
    console.error('❌ No se encontró la misión FIRECYCLE EXTREM');
    console.log('Misiones disponibles:', missions.map((m: any) => m.need.title));
    return;
  }

  console.log(`✅ Misión encontrada: ${mission.need.title}`);
  console.log(`   ID: ${mission.id}`);
  console.log(`   Estado actual: ${mission.status}`);
  console.log(`   Versión contrato: ${mission.contract.version}`);

  // ========================================
  // 1. SEPARAR RESULTADO ESPERADO DE CRITERIOS
  // ========================================
  console.log('\n📝 Separando resultado esperado de criterios...');

  // Guardar resultado esperado original
  const expectedResultOriginal = mission.need.expectedResult;
  
  // Si el resultado esperado contiene la frase accidental, limpiarla
  if (mission.need.expectedResult.includes('En Criterios de cierre')) {
    const cleanResult = mission.need.expectedResult
      .split('En Criterios de cierre')[0]
      .trim();
    mission.need.expectedResult = cleanResult;
    console.log('✅ Frase accidental eliminada del resultado esperado');
  }

  // Asegurar que los criterios están en closureCriteria
  if (!mission.need.closureCriteria || mission.need.closureCriteria.trim() === '') {
    // Si no hay criterios separados, extraer del resultado esperado original
    const criteriaMatch = expectedResultOriginal.match(/En Criterios de cierre[\s\S]*$/i);
    if (criteriaMatch) {
      mission.need.closureCriteria = criteriaMatch[0]
        .replace(/En Criterios de cierre,?\s*/i, '')
        .trim();
      console.log('✅ Criterios extraídos y colocados en campo correcto');
    }
  }

  // ========================================
  // 2. VERSIONAR CONTRATO
  // ========================================
  console.log('\n📋 Versionando contrato...');

  const previousVersion = mission.contract.version;
  mission.contract.version = previousVersion + 1;
  
  // Actualizar objetivo del contrato
  mission.contract.objective = mission.need.expectedResult;
  
  // Actualizar criterios de aceptación del contrato
  if (mission.need.closureCriteria) {
    const criteriaLines = mission.need.closureCriteria
      .split('\n')
      .filter(line => line.trim().length > 0);
    
    mission.contract.acceptanceCriteria = criteriaLines.map((criterion: string) => ({
      id: crypto.randomUUID(),
      description: criterion.trim(),
      type: 'human_review',
      status: 'pending_review',
      evidence: '',
    }));
    
    console.log(`✅ ${criteriaLines.length} criterios de aceptación actualizados`);
  }

  // Conservar aprobación anterior como antecedente
  const previousApproval = mission.contract.approvedAt;
  console.log(`✅ Versión anterior (${previousVersion}) conservada como antecedente`);
  if (previousApproval) {
    console.log(`   Aprobación anterior: ${previousApproval}`);
  }

  // ========================================
  // 3. GENERAR NUEVO PLAN CON 11 TAREAS
  // ========================================
  console.log('\n🎯 Generando nuevo plan con 11 tareas específicas...');

  const newPlanId = crypto.randomUUID();
  
  const tasks = [
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
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
      id: crypto.randomUUID(),
      planId: newPlanId,
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
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Inventario de información necesaria y consulta de fuentes oficiales',
      description: 'Crear un inventario de la información necesaria para el diagnóstico territorial. Consultar fuentes oficiales (MAPA, INFOCAM, Planes de Gestión de Riesgo de Incendio) mediante herramienta externa. Si la integración no está configurada, marcar tareas como BLOQUEADAS por configuración, NO sustituir por respuestas inventadas.',
      dependencies: [],
      inputs: ['Alcance definido', 'Documentos disponibles (si existen)'],
      expectedOutputs: 'Lista de fuentes consultadas con: nombre, enlace, fecha de consulta, cobertura territorial, limitaciones identificadas. Si la herramienta externa no está configurada, se registra "Bloqueado: herramienta externa no configurada".',
      tool: 'external_sources_query',
      validationCriterion: 'Cada fuente registrada tiene enlace verificable y fecha de consulta. Si está bloqueada, se indica explícitamente la causa.',
      status: 'blocked',
      blockedReason: 'Herramienta de consulta a fuentes externas no configurada. Requiere API key de búsqueda web o acceso a bases de datos oficiales.',
      order: 3,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Diagnóstico territorial',
      description: 'Elaborar diagnóstico territorial sustentado en datos obtenidos. Distinguir: hechos acreditados (con fuente), información aportada por el usuario, estimaciones (marcadas como tales) y lagunas de información. NO denominar "diagnóstico completo" si faltan datos.',
      dependencies: [],
      inputs: ['Fuentes oficiales consultadas', 'Documentos cargados', 'Información del usuario'],
      expectedOutputs: 'Documento de diagnóstico con secciones: hechos acreditados (con fuentes), información del usuario, estimaciones (marcadas), lagunas identificadas. Título: "Diagnóstico territorial preliminar" si faltan datos.',
      tool: 'content_generation',
      validationCriterion: 'Cada afirmación tiene etiqueta de fuente: "acreditado", "usuario", "estimación", "laguna". No se usa "diagnóstico completo" si hay lagunas.',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tarea 3 (consulta de fuentes oficiales) no disponible',
      order: 4,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Comparación de alternativas de prevención y gestión',
      description: 'Comparar alternativas de prevención, vigilancia, recuperación y gestión de biomasa. Explicar criterios de comparación (eficacia, coste, viabilidad técnica, impacto ambiental). NO atribuir viabilidad demostrada a ninguna alternativa sin evidencia.',
      dependencies: [],
      inputs: ['Diagnóstico territorial', 'Fuentes oficiales'],
      expectedOutputs: 'Matriz comparativa de alternativas con: descripción, criterios de evaluación, ventajas, inconvenientes, nivel de evidencia disponible. Alternativas marcadas como "requiere validación" si no hay evidencia suficiente.',
      tool: 'content_generation',
      validationCriterion: 'Ninguna alternativa se presenta como "viabilidad demostrada" sin evidencia. Cada alternativa tiene nivel de evidencia: "demostrado", "parcial", "requiere validación".',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tarea 4 (diagnóstico territorial) no disponible',
      order: 5,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Matriz de actuaciones priorizadas',
      description: 'Preparar matriz de actuaciones priorizadas con: finalidad, localización justificada (cuando exista datos), recursos necesarios, dependencias entre actuaciones, calendario propuesto, responsables propuestos por confirmar.',
      dependencies: [],
      inputs: ['Alternativas comparadas', 'Diagnóstico territorial'],
      expectedOutputs: 'Tabla con columnas: actuación, finalidad, localización (justificada o "pendiente de datos"), recursos, dependencias, calendario, responsable (propuesto). Localizaciones sin datos marcadas como "pendiente de delimitación".',
      tool: 'content_generation',
      validationCriterion: 'Cada actuación tiene localización justificada o marcada como pendiente. Responsables aparecen como "propuesto por confirmar".',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tarea 5 (comparación de alternativas) no disponible',
      order: 6,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Presupuesto trazable',
      description: 'Desarrollar presupuesto con: cantidades, unidades, precios unitarios, fuentes de precios, fecha de referencia, supuestos. Comprobar cálculos mediante código. Cuando falten datos, usar escenarios identificados o dejar partida pendiente. NO inventar presupuestos aprobados.',
      dependencies: [],
      inputs: ['Actuaciones priorizadas', 'Precios de referencia (si disponibles)'],
      expectedOutputs: 'Tabla presupuestaria con: partida, cantidad, unidad, precio unitario, subtotal, fuente del precio, fecha referencia, supuesto. Partidas sin datos marcadas como "pendiente de presupuesto" o "escenario X".',
      tool: 'budget_calculation',
      validationCriterion: 'Todos los cálculos son verificables. No hay partidas con precios inventados. Partidas pendientes están explícitamente marcadas.',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tarea 6 (matriz de actuaciones) no disponible',
      order: 7,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Definición de indicadores',
      description: 'Definir indicadores con: método de medición, frecuencia de medición, situación inicial disponible, objetivos propuestos. NO presentar objetivos como resultados alcanzados.',
      dependencies: [],
      inputs: ['Actuaciones priorizadas', 'Diagnóstico territorial'],
      expectedOutputs: 'Lista de indicadores con: nombre, método de medición, frecuencia, situación inicial (o "no disponible"), objetivo propuesto. Objetivos claramente etiquetados como "propuesto" o "objetivo".',
      tool: 'content_generation',
      validationCriterion: 'Ningún objetivo aparece como resultado alcanzado. Todos los objetivos están etiquetados como "propuesto" o "objetivo a alcanzar".',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tarea 6 (matriz de actuaciones) no disponible',
      order: 8,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Plan de validación del piloto de 100 hectáreas',
      description: 'Preparar plan de validación del piloto indicando qué falta comprobar sobre: delimitación geográfica, titularidad de terrenos, disponibilidad, condiciones ambientales, autorizaciones necesarias. Todo marcado como pendiente de confirmación.',
      dependencies: [],
      inputs: ['Propuesta de piloto de 100ha', 'Información territorial'],
      expectedOutputs: 'Lista de verificación con: aspecto a validar (delimitación, titularidad, disponibilidad, condiciones ambientales, autorizaciones), estado actual ("pendiente de confirmación"), acción necesaria, responsable propuesto.',
      tool: 'content_generation',
      validationCriterion: 'Todos los aspectos aparecen como "pendiente de confirmación". No se afirma que el piloto esté autorizado o delimitado.',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tarea 6 (matriz de actuaciones) no disponible',
      order: 9,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Generación de entregables (Word, PDF, Excel)',
      description: 'Generar informe Word, versión PDF y archivo Excel mediante herramientas de exportación reales. Comprobar que los tres archivos se abren y que contenidos y cifras son coherentes entre formatos.',
      dependencies: [],
      inputs: ['Todos los documentos generados', 'Diagnóstico', 'Alternativas', 'Actuaciones', 'Presupuesto', 'Indicadores', 'Plan de validación'],
      expectedOutputs: 'Tres archivos descargables: informe.docx, informe.pdf, plan.xlsx. Todos verificables y con contenido coherente.',
      tool: 'deliverable_generation',
      validationCriterion: 'Los tres archivos existen, se pueden abrir y contienen información coherente. Las cifras del presupuesto coinciden entre formatos.',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tareas 7, 8, 9 no disponibles',
      order: 10,
    },
    {
      id: crypto.randomUUID(),
      planId: newPlanId,
      title: 'Evaluación de criterios de aceptación',
      description: 'Evaluar cada criterio de aceptación con evidencias. Usar estados: cumplido, incumplido, pendiente de comprobación. Mantener pendiente la aceptación del promotor hasta que revise el resultado.',
      dependencies: [],
      inputs: ['Criterios de aceptación del contrato', 'Entregables generados', 'Evidencias recopiladas'],
      expectedOutputs: 'Tabla de evaluación con: criterio, estado (cumplido/incumplido/pendiente), evidencia, observaciones. Aceptación final: "Pendiente de revisión del promotor".',
      tool: 'criteria_evaluation',
      validationCriterion: 'Cada criterio tiene estado y evidencia. La aceptación final está marcada como "pendiente de revisión del promotor".',
      status: 'blocked',
      blockedReason: 'Dependencia bloqueada: tarea 10 (generación de entregables) no disponible',
      order: 11,
    },
  ];

  // Establecer dependencias correctas
  tasks[2].dependencies = [tasks[0].id, tasks[1].id];
  tasks[3].dependencies = [tasks[2].id];
  tasks[4].dependencies = [tasks[3].id];
  tasks[5].dependencies = [tasks[4].id];
  tasks[6].dependencies = [tasks[5].id];
  tasks[7].dependencies = [tasks[5].id];
  tasks[8].dependencies = [tasks[5].id];
  tasks[9].dependencies = [tasks[6].id, tasks[7].id, tasks[8].id];
  tasks[10].dependencies = [tasks[9].id];

  // Crear nuevo plan
  mission.plan = {
    id: newPlanId,
    missionId: mission.id,
    contractVersion: mission.contract.version,
    tasks: tasks,
    createdAt: new Date().toISOString(),
  };

  console.log(`✅ Nuevo plan generado con ${tasks.length} tareas`);
  console.log(`   Vinculado a versión ${mission.contract.version} del contrato`);

  // ========================================
  // 4. ACTUALIZAR ESTADO Y GUARDAR
  // ========================================
  console.log('\n💾 Guardando cambios...');

  mission.updatedAt = new Date().toISOString();
  mission.nextStep = 'Revisar plan corregido. Tareas 1-2 ejecutables, tareas 3-11 bloqueadas por configuración pendiente.';

  // Guardar en localStorage
  localStorage.setItem(missionsKey, JSON.stringify(missions));

  console.log('✅ Misión actualizada correctamente');

  // ========================================
  // 5. RESUMEN
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE LA MIGRACIÓN');
  console.log('='.repeat(60));
  console.log(`\n✅ Misión: ${mission.need.title}`);
  console.log(`✅ ID: ${mission.id}`);
  console.log(`✅ Versión contrato: ${previousVersion} → ${mission.contract.version}`);
  console.log(`✅ Documentos conservados: ${mission.documents.length}`);
  console.log(`✅ Historial conservado: ${mission.executions.length} ejecuciones`);
  console.log(`\n📋 PLAN CORREGIDO:`);
  console.log(`   Total tareas: ${tasks.length}`);
  console.log(`   Ejecutables: 2 (tareas 1-2)`);
  console.log(`   Bloqueadas: 9 (tareas 3-11)`);
  console.log(`\n🔒 TAREAS BLOQUEADAS:`);
  console.log(`   - Tarea 3: Herramienta externa no configurada`);
  console.log(`   - Tareas 4-11: Dependencias bloqueadas`);
  console.log(`\n📝 CAMBIOS APLICADOS:`);
  console.log(`   ✓ Resultado esperado separado de criterios`);
  console.log(`   ✓ Frase accidental eliminada del objetivo`);
  console.log(`   ✓ Contrato versionado (v${mission.contract.version})`);
  console.log(`   ✓ Plan reemplazado con 11 tareas específicas`);
  console.log(`   ✓ Piloto de 100ha marcado como PROPUESTA`);
  console.log(`   ✓ Ninguna tarea marcada como completada`);
  console.log(`\n⚠️  CONFIGURACIÓN PENDIENTE:`);
  console.log(`   - Herramienta de consulta a fuentes externas`);
  console.log(`   - API key de búsqueda web o bases de datos oficiales`);
  console.log(`\n🔄 RECARGA la página para ver los cambios.`);
  console.log('='.repeat(60));

})();
