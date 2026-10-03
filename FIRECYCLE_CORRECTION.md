# Corrección del plan FIRECYCLE EXTREM

## Estado de la corrección

### ✅ Implementado

- **Script de migración** creado en `public/migrate-firecycle.js`
- **Módulo de plan** definido en `src/firecycle-plan.ts` con las 11 tareas específicas
- **Compilación exitosa** sin errores de TypeScript

### ⚠️ Limitación crítica

**No tengo acceso al localStorage de tu navegador** donde está la misión FIRECYCLE EXTREM. No puedo leerla ni modificarla directamente desde este entorno.

El script de migración debe ejecutarse **en tu navegador** para aplicar los cambios a la misión existente.

---

## Instrucciones de ejecución

### Paso 1: Abrir ATIENDE en el navegador

1. Abre la aplicación ATIENDE en tu navegador
2. Asegúrate de estar en el espacio donde existe la misión FIRECYCLE EXTREM
3. Verifica que puedes ver la misión en el panel

### Paso 2: Abrir la consola del navegador

1. Pulsa `F12` o `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
2. Ve a la pestaña **Console** (Consola)

### Paso 3: Ejecutar el script de migración

1. Copia el contenido completo del archivo `public/migrate-firecycle.js`
2. Pégalo en la consola del navegador
3. Pulsa `Enter` para ejecutar

### Paso 4: Verificar resultados

El script mostrará un resumen con:
- ✅ Misión encontrada y actualizada
- ✅ Contrato versionado (v1 → v2)
- ✅ Plan reemplazado con 11 tareas específicas
- ✅ Documentos e historial conservados
- ⚠️ Tareas bloqueadas por configuración pendiente

### Paso 5: Recargar la página

Recarga la página (`F5` o `Ctrl+R`) para ver los cambios aplicados.

---

## Qué hace el script

### 1. Separa resultado esperado de criterios de aceptación

- **Antes:** El resultado esperado contenía accidentalmente "En Criterios de cierre, pega un criterio por línea"
- **Después:** El resultado esperado está limpio, los criterios están en su campo `closureCriteria`

### 2. Limpia el objetivo

- Elimina la frase accidental del objetivo del contrato
- El objetivo ahora refleja solo el resultado esperado real

### 3. Versiona el contrato

- **Versión anterior:** v1 (conservada como antecedente)
- **Nueva versión:** v2
- La aprobación anterior se mantiene como referencia histórica

### 4. Reemplaza el plan genérico

**Plan anterior:** 5 tareas genéricas
**Plan nuevo:** 11 tareas específicas con:

1. **Extraer alcance, entregables y restricciones** ✅ Ejecutable
   - Marca el piloto de 100ha como PROPUESTA, no como superficie autorizada

2. **Verificar documentos cargados** ✅ Ejecutable
   - Registra ausencia real de documentos si no existen
   - No inventa documentos leídos

3. **Inventario de información y consulta de fuentes oficiales** 🔒 Bloqueada
   - Causa: Herramienta externa no configurada
   - No sustituye por respuestas inventadas

4. **Diagnóstico territorial** 🔒 Bloqueada
   - Dependencia de tarea 3
   - Distingue hechos acreditados, información del usuario, estimaciones y lagunas

5. **Comparación de alternativas** 🔒 Bloqueada
   - Dependencia de tarea 4
   - No atribuye viabilidad demostrada sin evidencia

6. **Matriz de actuaciones priorizadas** 🔒 Bloqueada
   - Dependencia de tarea 5
   - Localizaciones justificadas o marcadas como pendientes

7. **Presupuesto trazable** 🔒 Bloqueada
   - Dependencia de tarea 6
   - Cálculos verificables, partidas pendientes explícitas

8. **Definición de indicadores** 🔒 Bloqueada
   - Dependencia de tarea 6
   - Objetivos etiquetados como "propuesto", no como alcanzados

9. **Plan de validación del piloto de 100ha** 🔒 Bloqueada
   - Dependencia de tarea 6
   - Todo marcado como "pendiente de confirmación"

10. **Generación de entregables (Word, PDF, Excel)** 🔒 Bloqueada
    - Dependencia de tareas 7, 8, 9
    - Archivos reales verificables

11. **Evaluación de criterios de aceptación** 🔒 Bloqueada
    - Dependencia de tarea 10
    - Aceptación final: "Pendiente de revisión del promotor"

### 5. Conserva documentos e historial

- ✅ Todos los documentos cargados se mantienen
- ✅ Historial de ejecuciones anterior se conserva
- ✅ Evidencias y entregables previos no se eliminan

### 6. No marca tareas como completadas

- Todas las tareas empiezan en estado `pending` o `blocked`
- Ninguna tarea se marca como completada sin ejecución real
- Las tareas bloqueadas indican explícitamente la causa

---

## Tareas ejecutables vs bloqueadas

### ✅ Ejecutables (2 tareas)

1. **Extraer alcance, entregables y restricciones**
   - Herramienta: `internal_analysis` (configurada)
   - Salida: Documento estructurado con piloto de 100ha marcado como propuesta

2. **Verificar documentos cargados**
   - Herramienta: `document_inventory` (configurada)
   - Salida: Inventario real de documentos (o registro de ausencia)

### 🔒 Bloqueadas (9 tareas)

**Tarea 3: Inventario de información y consulta de fuentes oficiales**
- **Causa del bloqueo:** Herramienta de consulta a fuentes externas no configurada
- **Requisito para desbloquear:** API key de búsqueda web o acceso a bases de datos oficiales (MAPA, INFOCAM, etc.)
- **Comportamiento:** NO sustituye por respuestas inventadas

**Tareas 4-11: Dependencias bloqueadas**
- **Causa del bloqueo:** Dependencia de tarea 3 bloqueada
- **Efecto cascada:** Todas las tareas posteriores quedan bloqueadas
- **Solución:** Configurar herramienta externa para desbloquear tarea 3 y permitir ejecución en cadena

---

## Herramientas del plan

| Herramienta | Estado | Descripción |
|-------------|--------|-------------|
| `internal_analysis` | ✅ Configurada | Análisis de texto y extracción de información |
| `document_inventory` | ✅ Configurada | Verificación de documentos cargados |
| `external_sources_query` | 🔒 No configurada | Consulta a fuentes oficiales (MAPA, INFOCAM) |
| `content_generation` | ✅ Configurada | Redacción de documentos estructurados |
| `budget_calculation` | ✅ Configurada | Cálculos matemáticos con verificación |
| `deliverable_generation` | ✅ Configurada | Exportación a PDF, DOCX, XLSX |
| `criteria_evaluation` | ✅ Configurada | Verificación de criterios de aceptación |

---

## Permisos y alcance

- ✅ **Permiso:** Solo análisis (lectura y generación de entregables)
- ❌ **No autorizado:** Envío de comunicaciones
- ❌ **No autorizado:** Operaciones sobre el terreno
- ❌ **No autorizado:** Cambios en sistemas externos

---

## Configuración pendiente para desbloquear tareas

### Para desbloquear tarea 3 (consulta de fuentes oficiales):

1. **Configurar proveedor de búsqueda web:**
   ```env
   SEARCH_PROVIDER=serpapi  # o google_custom_search
   SEARCH_API_KEY=...
   ```

2. **O configurar acceso a bases de datos oficiales:**
   - MAPA (Ministerio de Agricultura, Pesca y Alimentación)
   - INFOCAM (Incendios Forestales en Castilla-La Mancha)
   - Planes de Gestión de Riesgo de Incendio

3. **Implementar herramienta `external_sources_query`** en el backend

### Mientras tanto:

- Las tareas 1-2 se pueden ejecutar
- Las tareas 3-11 permanecen bloqueadas con causa explícita
- No se inventan datos ni fuentes

---

## Verificación post-migración

Después de ejecutar el script y recargar la página:

1. ✅ Verificar que la misión sigue siendo la misma (mismo ID)
2. ✅ Verificar que los documentos se conservan
3. ✅ Verificar que el contrato muestra versión 2
4. ✅ Verificar que el plan tiene 11 tareas
5. ✅ Verificar que las tareas 1-2 están en estado "pendiente"
6. ✅ Verificar que las tareas 3-11 están en estado "bloqueado"
7. ✅ Verificar que cada tarea bloqueada indica la causa
8. ✅ Verificar que el piloto de 100ha aparece como "propuesta"

---

## Resumen honesto

### ✅ Lo que se ha hecho

- Script de migración creado y documentado
- Plan de 11 tareas específicas definido
- Separación de resultado esperado y criterios
- Versionado del contrato (v1 → v2)
- Conservación de documentos e historial
- Identificación clara de tareas ejecutables vs bloqueadas
- No se inventan herramientas ni capacidades

### ⚠️ Lo que NO se ha hecho

- No se ha ejecutado el script (requiere tu navegador)
- No se han ejecutado las tareas (requieren configuración externa)
- No se han generado entregables (dependen de tareas bloqueadas)
- No se ha verificado el aislamiento entre espacios (requiere prueba manual)

### 🔒 Lo que está bloqueado

- Tarea 3: Herramienta externa no configurada
- Tareas 4-11: Dependencias bloqueadas en cascada
- Solución: Configurar API de fuentes externas

---

## Archivos creados

```
✅ public/migrate-firecycle.js    - Script de migración (ejecutar en navegador)
✅ src/firecycle-plan.ts          - Módulo con definición del plan
✅ FIRECYCLE_CORRECTION.md        - Este documento
```

---

## Próximos pasos

1. **Ejecutar el script** en tu navegador siguiendo las instrucciones
2. **Verificar los cambios** recargando la página
3. **Ejecutar tareas 1-2** si están disponibles en la interfaz
4. **(Opcional)** Configurar herramienta externa para desbloquear tarea 3
5. **Documentar resultados** de la ejecución

---

**Última actualización:** 2024
**Versión del script:** 1.0
**Estado:** Listo para ejecutar en navegador
