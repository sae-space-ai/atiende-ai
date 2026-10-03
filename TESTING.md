# Pruebas y verificaciones de ATIENDE

## Estado de verificación

Este documento registra honestamente qué se ha probado, qué funciona y qué queda pendiente de verificación.

---

## ✅ Verificado y funcional

### 1. Acceso libre sin autenticación

**Prueba:** Abrir la URL pública directamente
- ✅ No redirige a login
- ✅ Muestra panel inmediatamente
- ✅ No requiere registro ni contraseña

**Estado:** FUNCIONAL

### 2. Espacio anónimo con cookie

**Prueba:** Abrir aplicación en navegador
- ✅ Se crea cookie `atiende_space_id` con UUID v4
- ✅ Cookie tiene `SameSite=Lax` y `Secure`
- ✅ Identificador se mantiene al recargar

**Estado:** FUNCIONAL (cliente)

### 3. Aislamiento de datos por espacio

**Prueba:** Crear misión, recargar página
- ✅ Misión persiste tras recargar
- ✅ Datos almacenados con prefijo `atiende_{space_id}_`
- ✅ Cada espacio tiene sus propias misiones, documentos, trabajos

**Estado:** FUNCIONAL (cliente)

**Pendiente:** Verificar que otro navegador no puede acceder a los datos (prueba manual requerida)

### 4. Crear necesidad

**Prueba:** Completar formulario de nueva misión
- ✅ Formulario guiado en 5 pasos
- ✅ Validación de campos obligatorios
- ✅ Guardado de borrador
- ✅ Creación de contrato de misión versionado

**Estado:** FUNCIONAL

### 5. Cargar documentos

**Prueba:** Subir archivos PDF, DOCX, TXT, CSV, XLSX
- ✅ Validación de formato (rechaza extensiones no permitidas)
- ✅ Validación de tamaño (máx 10 MB)
- ✅ Cálculo de hash SHA-256
- ✅ Extracción de texto para TXT/CSV
- ✅ Mensaje claro para formatos que requieren procesamiento server-side

**Estado:** FUNCIONAL

### 6. Preparar plan

**Prueba:** Pulsar "Preparar plan"
- ✅ Si IA no configurada: genera plan básico local
- ✅ Si IA configurada: llama a `/api/ai/chat` con contexto
- ✅ Muestra mensaje claro si falta configuración
- ✅ Actualiza objetivo y criterios de aceptación

**Estado:** FUNCIONAL (modo básico sin IA)

**Pendiente:** Probar con IA real (requiere API key configurada)

### 7. Ejecución con progreso real

**Prueba:** Ejecutar plan de tareas
- ✅ Crea trabajo persistente con estado
- ✅ Muestra progreso en tiempo real (porcentaje, paso actual)
- ✅ Estados: pendiente, en curso, completada, bloqueada, fallida
- ✅ Avances se guardan y persisten al recargar
- ✅ Polling cada 1 segundo para actualizar UI

**Estado:** FUNCIONAL

### 8. Controles de concurrencia

**Prueba:** Intentar múltiples ejecuciones simultáneas
- ✅ Límite de 3 trabajos activos por espacio
- ✅ Límite de 100 llamadas IA por día
- ✅ Intervalo mínimo de 2 segundos entre inicios
- ✅ Reserva atómica de presupuesto

**Estado:** FUNCIONAL

### 9. Cancelación y reanudación

**Prueba:** Cancelar/pausar trabajo en ejecución
- ✅ Botón de cancelar detiene nuevas tareas
- ✅ Botón de pausar/reanudar funciona
- ✅ Tareas pendientes marcadas como canceladas
- ✅ Resultados parciales se conservan

**Estado:** FUNCIONAL

### 10. Generación de entregables

**Prueba:** Descargar informe PDF, DOCX y plan XLSX
- ✅ PDF generado con jsPDF (contenido real, no simulado)
- ✅ DOCX generado como HTML compatible con Word
- ✅ XLSX generado con xlsx library (hojas: Resumen, Tareas, Dependencias)
- ✅ Contenido consistente entre formatos
- ✅ Archivos se pueden abrir correctamente
- ✅ No incluye información de otros espacios

**Estado:** FUNCIONAL

### 11. Compilación y tipos

**Prueba:** `npm run typecheck` y `npm run build`
- ✅ TypeScript sin errores
- ✅ Build de producción exitoso
- ✅ Tamaño bundle: ~960 KB (principal)

**Estado:** FUNCIONAL

---

## ⚠️ Pendiente de verificación externa

### 1. Aislamiento entre navegadores

**Prueba requerida:**
1. Abrir ATIENDE en navegador A
2. Crear misión con documentos
3. Abrir ATIENDE en navegador B (o ventana incógnito)
4. Intentar acceder a la misión del navegador A usando su ID

**Estado:** NO VERIFICADO (requiere prueba manual)

**Nota:** El aislamiento está implementado en cliente mediante prefijo de localStorage. Para verificación completa, se necesita probar con dos navegadores distintos.

### 2. Ejecución con IA real

**Prueba requerida:**
1. Configurar `AI_PROVIDER=openai` y `AI_API_KEY` en Vercel
2. Crear misión
3. Pulsar "Preparar plan"
4. Verificar que se llama a `/api/ai/chat`
5. Verificar que la respuesta de IA se parsea correctamente
6. Verificar que el plan se actualiza con información de IA

**Estado:** NO VERIFICADO (requiere API key)

**Nota:** El código está implementado y listo. Solo falta configurar las credenciales.

### 3. Verificación server-side del espacio

**Prueba requerida:**
1. Desplegar en Vercel
2. Intentar acceder a `/api/ai/chat` sin cookie
3. Verificar que devuelve 401 Unauthorized
4. Intentar con cookie válida
5. Verificar que funciona correctamente

**Estado:** NO VERIFICADO (requiere despliegue)

**Nota:** El middleware está implementado en `api/middleware/space.ts`. Falta integrarlo en todas las rutas.

### 4. Descargas verifican pertenencia al espacio

**Prueba requerida:**
1. Crear misión en espacio A
2. Generar entregable
3. Intentar descargar desde espacio B (manipulando cookie)
4. Verificar que se rechaza la descarga

**Estado:** NO VERIFICADO (requiere backend)

**Nota:** Actualmente las descargas se generan en cliente. Para verificación server-side, se necesita migrar a almacenamiento en Supabase/S3 con políticas RLS.

### 5. Políticas RLS en Supabase

**Prueba requerida:**
1. Migrar de localStorage a Supabase
2. Añadir columna `space_id` a todas las tablas
3. Crear políticas RLS que filtren por `space_id`
4. Verificar que las consultas solo devuelven datos del espacio actual

**Estado:** NO IMPLEMENTADO (requiere migración)

**Nota:** El esquema SQL está preparado en `supabase/migrations/001_initial_schema.sql`. Falta adaptar las políticas para espacio anónimo.

### 6. Cola de trabajos persistente

**Prueba requerida:**
1. Iniciar ejecución larga
2. Cerrar navegador
3. Verificar que el trabajo continúa en servidor
4. Reabrir navegador y ver progreso actualizado

**Estado:** NO IMPLEMENTADO (requiere Vercel Cron/Inngest)

**Nota:** Actualmente los trabajos se ejecutan en cliente. Para ejecución duradera, se necesita un sistema de cola server-side.

---

## 🧪 Pruebas de seguridad

### ✅ Implementado

- [x] Cookie con `SameSite=Lax` y `Secure`
- [x] UUID v4 con entropía criptográfica
- [x] Validación de formato UUID
- [x] Sanitización de entradas en API
- [x] Límites de uso por espacio
- [x] Protección CSRF (verificación de origen)
- [x] API key solo en servidor (nunca en cliente)

### ⚠️ Pendiente

- [ ] Cookie `HttpOnly` (requiere establecer desde servidor)
- [ ] Rate limiting server-side (actualmente solo cliente)
- [ ] Auditoría de accesos (log de operaciones)
- [ ] Rotación de API keys
- [ ] Backup automático de datos

---

## 📊 Resumen

| Categoría | Estado | Notas |
|-----------|--------|-------|
| Acceso libre | ✅ Funcional | Sin autenticación |
| Espacio anónimo | ✅ Funcional | Cookie + localStorage |
| Aislamiento de datos | ✅ Funcional (cliente) | Pendiente verificación manual |
| Crear misión | ✅ Funcional | Formulario guiado |
| Cargar documentos | ✅ Funcional | Validación completa |
| Preparar plan | ✅ Funcional | Básico sin IA |
| Ejecución | ✅ Funcional | Progreso real |
| Entregables | ✅ Funcional | PDF, DOCX, XLSX reales |
| Controles | ✅ Funcional | Concurrencia y límites |
| IA real | ⚠️ Pendiente | Requiere API key |
| Server-side | ⚠️ Pendiente | Requiere despliegue |
| Supabase RLS | ⚠️ Pendiente | Requiere migración |

---

## 🚀 Siguientes pasos

1. **Desplegar en Vercel** para probar server-side
2. **Configurar API key** para probar IA real
3. **Probar aislamiento** entre navegadores manualmente
4. **Migrar a Supabase** si se necesita persistencia multi-dispositivo
5. **Implementar cola de trabajos** para ejecución duradera

---

**Última actualización:** 2024
**Versión:** 1.0.0
**Compilación:** ✅ Exitosa
**Tipo de IA usada:** Ninguna (modo básico) / Pendiente de configurar
