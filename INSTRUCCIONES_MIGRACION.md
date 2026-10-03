# Instrucciones para aplicar la migración de FIRECYCLE EXTREM

## ✅ La migración está integrada en la interfaz

Ya no necesitas abrir la consola ni pegar código. La migración se aplica directamente desde la interfaz de ATIENDE.

---

## 📋 Pasos para aplicar la migración

### 1. Abrir ATIENDE en tu navegador

Abre la aplicación ATIENDE en el navegador donde tienes la misión FIRECYCLE EXTREM.

### 2. Navegar a la misión

Desde el panel principal, haz clic en la misión FIRECYCLE EXTREM para abrir su detalle.

### 3. Ir a la pestaña "Resumen"

En la vista de detalle de la misión, asegúrate de estar en la pestaña **"Resumen"** (primera pestaña).

### 4. Buscar el botón de migración

En la sección **"Gestión del plan"**, verás un botón que dice:

```
🔄 Actualizar plan de esta misión
```

### 5. Hacer clic en el botón

Al hacer clic, aparecerá un panel de confirmación con:

- **Qué se va a hacer:** Lista de cambios que se aplicarán
- **Qué se conserva:** Documentos, evidencias, entregables, historial
- **Importante:** Información sobre seguridad y reversibilidad

### 6. Revisar la confirmación

Lee cuidadosamente la información:

✅ **Se va a:**
- Separar resultado esperado de criterios de aceptación
- Eliminar frase accidental del objetivo
- Versionar contrato (v1 → v2)
- Reemplazar plan con 11 tareas específicas
- Conservar todos los documentos y datos

✅ **Se conserva:**
- Identificador de la misión
- Documentos cargados
- Evidencias y entregables
- Historial de ejecuciones
- Backup automático

✅ **Seguridad:**
- Acción reversible (backup disponible)
- Idempotente (repetirla no duplica)
- Si falla, la misión original se conserva

### 7. Confirmar la actualización

Si estás de acuerdo con los cambios, haz clic en:

```
✓ Confirmar actualización
```

### 8. Ver el resultado

Después de la migración, verás uno de estos mensajes:

#### ✅ Si fue exitoso:
```
Migración completada

✓ Contrato versionado: v1 → v2
✓ Tareas creadas: 11
✓ Backup creado automáticamente
```

#### ❌ Si hubo un error:
```
Migración fallida

La misión original se ha conservado.

Errores:
- [lista de errores específicos]
```

### 9. Recargar la página (opcional)

Para ver los cambios reflejados completamente, puedes recargar la página con `F5` o `Ctrl+R`.

---

## 🔍 Qué verificar después de la migración

### 1. Contrato versionado

En la sección **"Contrato de misión"**, verifica que:
- Versión: **v2** (antes era v1)
- Objetivo: Ya no contiene la frase accidental

### 2. Plan actualizado

Ve a la pestaña **"Plan"** y verifica que:
- Hay **11 tareas** (antes eran 5)
- Las tareas tienen títulos específicos
- La tarea 1 es "Extraer alcance, entregables y restricciones"

### 3. Documentos conservados

Ve a la pestaña **"Documentos"** y verifica que:
- Todos los documentos cargados siguen ahí
- No se han perdido archivos

### 4. Estado de las tareas

En la pestaña **"Plan"**, verifica los estados:

✅ **Ejecutables (10 tareas):**
- Tareas 1-3: Ejecutables inmediatamente
- Tareas 5-11: Ejecutables (aunque la tarea 4 esté bloqueada)

🔒 **Bloqueada (1 tarea):**
- Tarea 4: "Consulta de fuentes oficiales"
- Causa: Herramienta externa no configurada

---

## 🔄 Si necesitas revertir la migración

Si algo salió mal y necesitas volver al estado anterior:

### Opción 1: Desde la interfaz (si está implementado)

Busca un botón "Restaurar desde backup" en la sección de gestión del plan.

### Opción 2: Manualmente (avanzado)

Los backups se guardan en localStorage con la clave `atiende_migration_backups`. Puedes acceder a ellos desde la consola del navegador si es necesario.

---

## ⚠️ Solución de problemas

### El botón no aparece

**Posibles causas:**
- No estás en la pestaña "Resumen"
- La misión ya está migrada (verás un mensaje verde)
- Hay un error de carga

**Solución:**
- Recarga la página con `F5`
- Asegúrate de estar en la pestaña "Resumen"
- Verifica que puedes ver la misión correctamente

### La migración falla

**Posibles causas:**
- Estructura de datos corrupta
- Error de validación
- Problema de almacenamiento

**Solución:**
- Lee el mensaje de error específico
- La misión original se conserva automáticamente
- Contacta con soporte si el problema persiste

### Los cambios no se ven después de migrar

**Posibles causas:**
- La página no se ha recargado
- Cache del navegador

**Solución:**
- Recarga la página con `F5` o `Ctrl+R`
- Limpia la cache si es necesario

---

## 📊 Resumen de lo que cambia

### Antes de la migración:
- ❌ Objetivo con frase accidental
- ❌ Resultado esperado y criterios mezclados
- ❌ Plan genérico de 5 tareas
- ❌ Contrato versión 1

### Después de la migración:
- ✅ Objetivo limpio
- ✅ Criterios separados en su campo
- ✅ Plan específico de 11 tareas
- ✅ Contrato versión 2
- ✅ Backup automático disponible

---

## 🎯 Próximos pasos después de migrar

### 1. Ejecutar tareas ejecutables

Las tareas 1-3 pueden ejecutarse inmediatamente:
- Tarea 1: Extraer alcance, entregables y restricciones
- Tarea 2: Verificar documentos cargados
- Tarea 3: Inventario de información necesaria

### 2. Entender el bloqueo de tarea 4

La tarea 4 (consulta de fuentes oficiales) está bloqueada porque:
- Requiere configuración de API externa
- No se sustituye por respuestas inventadas
- Las tareas 5-11 pueden ejecutarse con información disponible

### 3. Generar dossier parcial

La tarea 11 generará un dossier con:
- Información disponible
- Secciones marcadas como "pendiente de datos"
- Sin cifras ni fuentes inventadas

---

## 📞 Soporte

Si tienes problemas con la migración:

1. **Verifica los pasos** de esta guía
2. **Recarga la página** con `F5`
3. **Revisa el mensaje de error** si la migración falla
4. **Contacta con soporte** si el problema persiste

---

## ✅ Checklist final

Después de aplicar la migración, verifica:

- [ ] El botón "Actualizar plan" muestra que ya está migrado
- [ ] El contrato muestra versión 2
- [ ] El plan tiene 11 tareas
- [ ] Los documentos se conservan
- [ ] Las tareas 1-3 están en estado "pendiente"
- [ ] La tarea 4 está en estado "bloqueado" con causa clara
- [ ] Las tareas 5-11 están en estado "pendiente"
- [ ] Puedes ejecutar las tareas ejecutables

---

**Última actualización:** 2024
**Versión de la migración:** 1.0
**Estado:** Lista para aplicar desde la interfaz
