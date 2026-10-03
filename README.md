# ATIENDE - Agente de atención de necesidades

Plataforma que convierte necesidades expresadas en lenguaje natural en misiones operativas para un agente dedicado.

## Estado actual

✅ Recorrido funcional implementado:
- Crear necesidad con formulario guiado
- Generar contrato de misión versionado
- Planificar tareas con dependencias
- Ejecutar tareas con registro de actividad
- Cargar documentos con validación
- Generar evidencias trazables
- Producir entregables descargables (PDF, CSV, JSON)
- Verificar criterios de aceptación
- Panel de control con estadísticas

## Configuración pendiente para producción

1. **Proveedor de IA**: Configurar `AI_PROVIDER_KEY` para ejecución autónoma
2. **Base de datos**: PostgreSQL (Supabase) para persistencia multi-usuario
3. **Almacenamiento**: Supabase Storage o S3 para documentos privados
4. **Autenticación**: Supabase Auth o Auth0 para gestión de sesiones
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

# Almacenamiento (pendiente de configurar)
STORAGE_BUCKET=atiende-documents
```

## Estructura del proyecto

```
src/
├── types.ts          # Modelos de datos
├── store.ts          # Capa de persistencia
├── utils.ts          # Utilidades y generación de plan
├── App.tsx           # Router principal
├── components/
│   └── Layout.tsx    # Layout con navegación
└── pages/
    ├── Dashboard.tsx      # Panel de control
    ├── NewMission.tsx     # Asistente de nueva misión
    ├── MissionDetail.tsx  # Detalle y ejecución
    └── Settings.tsx       # Configuración
```

## Despliegue en Vercel

1. Conectar repositorio en Vercel
2. Configurar variables de entorno
3. Desplegar rama principal

## Licencia

Privado - sae-space-ai
