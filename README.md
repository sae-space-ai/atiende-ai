# ATIENDE - Agente de atención de necesidades

Plataforma que convierte necesidades expresadas en lenguaje natural en misiones operativas para un agente dedicado.

## Modelo de acceso

**Acceso libre sin autenticación.** Cada visitante recibe un espacio anónimo aislado mediante un identificador aleatorio seguro almacenado en una cookie protegida.

- No requiere registro, inicio de sesión, contraseña ni proveedores de identidad
- Acceso directo al panel desde la URL pública
- Los datos de cada visitante están aislados y no son accesibles por otros
- Si se eliminan las cookies, se pierde el acceso a las misiones (no hay recuperación)
- No hay sincronización entre dispositivos

## Estado actual

✅ Recorrido funcional implementado:
- Acceso directo sin autenticación
- Crear necesidad con formulario guiado
- Generar contrato de misión versionado
- Planificar tareas con dependencias
- Ejecutar tareas con registro de actividad
- Cargar documentos con validación
- Generar evidencias trazables
- Producir entregables descargables (PDF, CSV, JSON)
- Verificar criterios de aceptación
- Panel de control con estadísticas
- Espacio anónimo aislado por visitante

## Límites de uso por espacio

- 50 misiones máximas
- 20 documentos por misión
- 10 MB máximo por archivo
- 30 ejecuciones por hora
- 100 llamadas a IA por día
- 500 MB de almacenamiento total

## Configuración pendiente para producción

1. **Proveedor de IA**: Configurar `AI_PROVIDER_KEY` para ejecución autónoma
2. **Base de datos**: PostgreSQL (Supabase) con políticas RLS por espacio anónimo
3. **Almacenamiento**: Supabase Storage o S3 con aislamiento por espacio
4. **Verificación en servidor**: Validar espacio anónimo en cada operación (no solo cliente)
5. **Cola de trabajos**: Vercel Cron o Inngest para ejecución duradera
6. **OCR**: Servicio de reconocimiento óptico para PDFs escaneados

## Desarrollo local

```bash
npm install
npm run dev
```

## Compilación

```bash
npm run build
npm run typecheck
```

## Variables de entorno

Crear archivo `.env.local`:

```env
# Proveedor de IA (pendiente de configurar)
AI_PROVIDER=none
AI_API_KEY=

# Supabase (pendiente de configurar)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Almacenamiento (pendiente de configurar)
STORAGE_BUCKET=atiende-documents
```

## Estructura del proyecto

```
src/
├── types.ts          # Modelos de datos
├── space.ts          # Sistema de espacio anónimo con cookie
├── store.ts          # Capa de persistencia aislada por espacio
├── utils.ts          # Utilidades y generación de plan
├── App.tsx           # Router principal (sin autenticación)
├── components/
│   └── Layout.tsx    # Layout con navegación
└── pages/
    ├── Dashboard.tsx      # Panel de control
    ├── NewMission.tsx     # Asistente de nueva misión
    ├── MissionDetail.tsx  # Detalle y ejecución
    └── Settings.tsx       # Configuración y límites
```

## Seguridad

- **Aislamiento por espacio**: Cada visitante tiene un identificador único (UUID v4) en cookie segura
- **Datos privados**: Misiones, documentos y ejecuciones están aislados por espacio
- **Sin autenticación**: No hay registro, login ni contraseñas
- **Sin sincronización**: Cada navegador mantiene su propio espacio
- **Límites de uso**: Protección contra abuso por espacio y globales
- **Claves en servidor**: Credenciales de IA y base de datos nunca llegan al cliente

## Despliegue en Vercel

1. Conectar repositorio en Vercel
2. Configurar variables de entorno
3. Desplegar rama principal
4. La URL pública es accesible sin cuenta de Vercel

## Pruebas del recorrido

- [x] Visitante nuevo accede directamente al panel sin iniciar sesión
- [x] Crea una necesidad y completa el formulario guiado
- [x] Genera plan y ejecuta tareas
- [x] Carga documentos y genera entregables
- [x] Recarga la página y conserva sus misiones
- [ ] Otro navegador no puede acceder a sus datos (requiere verificación manual)
- [ ] Eliminación de cookies impide recuperar datos (comportamiento esperado)

## Licencia

Privado - sae-space-ai
