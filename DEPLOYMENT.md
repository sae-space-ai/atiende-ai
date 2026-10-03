# Instrucciones de despliegue para ATIENDE

## Estado del proyecto

✅ **Compilación exitosa** - El proyecto compila sin errores
✅ **Recorrido funcional completo** implementado
✅ **Acceso libre sin autenticación** - Espacio anónimo aislado por visitante
✅ **Archivos de configuración** creados

## Modelo de acceso

**Sin autenticación.** Cada visitante recibe un espacio anónimo aislado mediante un identificador aleatorio seguro (UUID v4) almacenado en una cookie protegida.

- Acceso directo al panel desde la URL pública
- No requiere registro, login, contraseña ni proveedores de identidad
- Los datos de cada visitante están aislados y no son accesibles por otros
- Si se eliminan las cookies, se pierde el acceso (no hay recuperación)
- No hay sincronización entre dispositivos

## Lo que funciona en este entorno

1. ✅ **Acceso directo** - Sin login, acceso inmediato al panel
2. ✅ **Espacio anónimo** - Identificador único por visitante en cookie segura
3. ✅ **Aislamiento de datos** - Cada espacio tiene sus propias misiones, documentos y ejecuciones
4. ✅ **Crear necesidad** - Formulario guiado en 5 pasos
5. ✅ **Guardar contrato** - Contrato de misión versionado con criterios de aceptación
6. ✅ **Consultar estado** - Panel con estadísticas y filtros
7. ✅ **Generar plan** - Descomposición automática en tareas
8. ✅ **Ejecutar tareas** - Simulación con registro de actividad
9. ✅ **Cargar documentos** - Validación de formato y tamaño
10. ✅ **Generar entregables** - PDF, CSV, JSON descargables
11. ✅ **Trazabilidad** - Evidencias vinculadas a fuentes
12. ✅ **Configuración** - Estado de servicios, límites de uso y preferencias
13. ✅ **Límites de uso** - Protección contra abuso por espacio

## Lo que NO se ha ejecutado (requiere acceso externo)

❌ Conexión con repositorio GitHub `sae-space-ai/atiende-ai`
❌ Creación de rama de trabajo
❌ Push de cambios
❌ Creación de pull request
❌ Despliegue en Vercel
❌ Configuración de Supabase
❌ Configuración de proveedor de IA
❌ Verificación de aislamiento entre navegadores (requiere prueba manual)

## Pasos para completar el despliegue

### 1. Conectar con GitHub

```bash
# Clonar el repositorio
git clone https://github.com/sae-space-ai/atiende-ai.git
cd atiende-ai

# Copiar los archivos de este proyecto al repositorio
# (los archivos están en este entorno de desarrollo)

# Crear rama de trabajo
git checkout -b feature/atiende-anonymous-access

# Añadir cambios
git add .
git commit -m "feat: eliminar autenticación e implementar espacio anónimo

- Acceso libre sin registro ni login
- Espacio anónimo aislado por visitante (UUID v4 en cookie)
- Aislamiento de datos: misiones, documentos, ejecuciones
- Límites de uso por espacio y globales
- Sin sincronización entre dispositivos
- Si se eliminan cookies, se pierde acceso (no hay recuperación)
- Claves y credenciales solo en servidor

Persistencia en localStorage aislada por espacio (migrar a Supabase con RLS para producción)"

# Push
git push origin feature/atiende-anonymous-access
```

### 2. Crear Pull Request

```bash
# Usar GitHub CLI
gh pr create --title "Acceso libre con espacio anónimo aislado" --body "Elimina autenticación. Implementa espacio anónimo con aislamiento de datos por visitante mediante cookie segura. Límites de uso incluidos."
```

### 3. Configurar Vercel

1. Ir a https://vercel.com
2. Importar repositorio `sae-space-ai/atiende-ai`
3. Seleccionar rama `feature/atiende-anonymous-access`
4. Framework preset: Vite
5. Build command: `npm run build`
6. Output directory: `dist`
7. **Importante**: Desactivar "Deployment Protection" para que la URL pública sea accesible sin cuenta de Vercel
8. Añadir variables de entorno (ver `.env.example`)
9. Deploy

**Nota sobre protección de despliegue:**
Si tienes acceso a la configuración de Vercel, verifica que "Deployment Protection" esté desactivada para producción. Si no tienes acceso, identifica este ajuste como pendiente.

### 4. Configurar Supabase (para producción)

1. Crear proyecto en https://supabase.com
2. Ejecutar migración: `supabase/migrations/001_initial_schema.sql`
3. **Importante**: Adaptar políticas RLS para usar `space_id` en lugar de `auth.uid()`
4. Crear bucket de storage: `atiende-documents` con políticas por espacio
5. Obtener URL y keys
6. Añadir a variables de entorno en Vercel

**Ejemplo de política RLS para espacio anónimo:**

```sql
-- Añadir columna space_id a todas las tablas
ALTER TABLE missions ADD COLUMN space_id UUID NOT NULL;
ALTER TABLE documents ADD COLUMN space_id UUID NOT NULL;
-- ... etc

-- Política de ejemplo
CREATE POLICY "Users can only access their own space data" ON missions
  FOR ALL USING (space_id = current_setting('app.space_id')::uuid);
```

### 5. Implementar verificación de espacio en servidor

**Crítico**: La verificación actual del espacio anónimo es solo en cliente (JavaScript). Para producción:

1. El servidor debe leer la cookie `atiende_space_id` en cada petición
2. Validar que el espacio_id existe y es válido
3. Filtrar todas las consultas de BD por `space_id`
4. Validar que los archivos descargados pertenecen al espacio
5. Aplicar límites de uso en servidor (no solo cliente)

### 6. Configurar proveedor de IA (opcional)

Para ejecución autónoma del agente:

```env
AI_PROVIDER=openai  # o anthropic
AI_API_KEY=sk-...
AI_MODEL=gpt-4
```

## Variables de entorno necesarias

Ver archivo `.env.example` para la lista completa.

**Mínimas para funcionamiento básico:**
- `NEXT_PUBLIC_APP_URL` - URL de la aplicación

**Para producción completa:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `AI_PROVIDER`
- `AI_API_KEY`

## Pruebas realizadas

✅ Compilación TypeScript sin errores
✅ Build de producción exitoso
✅ Estructura de archivos correcta
✅ Tipos definidos y validados
✅ Persistencia en localStorage funcional
✅ Espacio anónimo creado con UUID v4
✅ Aislamiento de datos por espacio (en cliente)
✅ Límites de uso definidos y verificados

## Pruebas pendientes

- [ ] Verificación de aislamiento entre navegadores (prueba manual)
- [ ] Pruebas de integración con Supabase y RLS por espacio
- [ ] Pruebas de verificación de espacio en servidor
- [ ] Pruebas de carga de documentos en storage con aislamiento
- [ ] Pruebas de ejecución con proveedor de IA
- [ ] Pruebas de límites de uso en servidor
- [ ] Pruebas de recuperación tras fallos
- [ ] Verificación de que eliminación de cookies impide acceso

## Archivos creados/modificados

```
✅ README.md - Documentación actualizada (acceso libre)
✅ DEPLOYMENT.md - Instrucciones de despliegue
✅ .gitignore - Exclusión de archivos sensibles
✅ vercel.json - Configuración de despliegue
✅ .env.example - Plantilla de variables de entorno
✅ supabase/migrations/001_initial_schema.sql - Esquema de BD
✅ src/types.ts - Modelos de datos
✅ src/space.ts - Sistema de espacio anónimo con cookie
✅ src/store.ts - Capa de persistencia aislada por espacio
✅ src/utils.ts - Utilidades y generación de plan
✅ src/App.tsx - Router sin autenticación
✅ src/index.css - Estilos base
✅ src/components/Layout.tsx - Layout sin login/logout
✅ src/pages/Dashboard.tsx - Panel de control
✅ src/pages/NewMission.tsx - Asistente de nueva misión
✅ src/pages/MissionDetail.tsx - Detalle y ejecución
✅ src/pages/Settings.tsx - Configuración y límites
✅ package.json - Dependencias actualizadas
✅ index.html - Título actualizado
```

## Siguiente paso inmediato

**Ejecutar los comandos git** listados en la sección 1 para publicar los cambios en el repositorio `sae-space-ai/atiende-ai`.

**Verificar en Vercel** que "Deployment Protection" esté desactivada para que la URL pública sea accesible sin cuenta.
