# ATIENDE - Agente de atención de necesidades

Plataforma que convierte necesidades expresadas en lenguaje natural en misiones operativas para un agente dedicado.

## 🚀 Acceso

**Acceso libre sin autenticación.** Cada visitante recibe un espacio anónimo aislado mediante un identificador aleatorio seguro (UUID v4) almacenado en una cookie protegida.

- ✅ Acceso directo al panel desde la URL pública
- ✅ Sin registro, login, contraseña ni proveedores de identidad
- ✅ Datos aislados por espacio anónimo
- ⚠️ Si eliminas las cookies, pierdes acceso a tus misiones (no hay recuperación)
- ⚠️ No hay sincronización entre dispositivos

## 📋 Estado actual

### ✅ Implementado y verificado

1. **Acceso libre** - Sin autenticación, acceso directo
2. **Espacio anónimo** - UUID v4 en cookie segura con aislamiento de datos
3. **Crear necesidad** - Formulario guiado en 5 pasos
4. **Contrato de misión** - Versionado con criterios de aceptación
5. **Preparar plan** - Con IA real (si está configurada) o plan básico
6. **Ejecución con progreso real** - Trabajos persistentes con estados verificables
7. **Carga de documentos** - Validación de formato y tamaño
8. **Generación de entregables** - PDF, DOCX, XLSX con contenido real
9. **Trazabilidad** - Evidencias vinculadas a fuentes
10. **Controles de concurrencia** - Límites por espacio y protección contra duplicados
11. **Cancelación y reanudación** - De trabajos en ejecución
12. **Persistencia** - Datos conservados al recargar la página

### ⚠️ Pendiente de configuración externa

1. **Proveedor de IA** - Configurar `AI_PROVIDER` y `AI_API_KEY` en Vercel
2. **Verificación server-side** - Middleware de espacio en cada API
3. **Políticas RLS en Supabase** - Si se migra de localStorage a base de datos
4. **Cola de trabajos** - Vercel Cron o Inngest para ejecución duradera
5. **OCR** - Servicio de reconocimiento óptico para PDFs escaneados

## 🛠️ Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173 en tu navegador.

## 📦 Compilación

```bash
npm run build
npm run typecheck
```

## 🔧 Variables de entorno

Crear archivo `.env.local` para desarrollo o configurar en Vercel:

```env
# Proveedor de IA (requerido para ejecución autónoma)
AI_PROVIDER=openai  # o 'anthropic' o 'none'
AI_API_KEY=sk-...   # Clave del proveedor (NUNCA exponer al cliente)
AI_MODEL=gpt-4o-mini  # Modelo a usar

# Supabase (opcional, para migrar de localStorage)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Almacenamiento (opcional)
STORAGE_BUCKET=atiende-documents
```

**Importante:** La `AI_API_KEY` debe configurarse SOLO en el servidor (Vercel env vars). Nunca debe llegar al cliente.

## 🏗️ Arquitectura

### Frontend (React + Vite + TypeScript)

```
src/
├── types.ts              # Modelos de datos
├── space.ts              # Sistema de espacio anónimo (cookie)
├── store.ts              # Persistencia aislada por espacio
├── store-internal.ts     # Funciones internas del store
├── jobs.ts               # Trabajos persistentes con estado
├── ai-client.ts          # Cliente de IA con proveedor configurable
├── deliverables.ts       # Generación de PDF, DOCX, XLSX
├── utils.ts              # Utilidades
├── App.tsx               # Router principal
├── components/
│   └── Layout.tsx        # Layout con navegación
└── pages/
    ├── Dashboard.tsx      # Panel de control
    ├── NewMission.tsx     # Asistente de nueva misión
    ├── MissionDetail.tsx  # Detalle, ejecución y entregables
    └── Settings.tsx       # Configuración y límites
```

### Backend (Vercel Serverless Functions)

```
api/
├── ai/
│   └── chat.ts           # Proxy de IA (protege API key)
└── middleware/
    └── space.ts          # Verificación de espacio anónimo
```

## 🔒 Seguridad

- **Aislamiento por espacio**: Cada visitante tiene un UUID v4 único en cookie
- **Datos privados**: Misiones, documentos y ejecuciones aislados por espacio
- **Sin autenticación**: No hay registro, login ni contraseñas
- **API key protegida**: La clave de IA solo existe en el servidor
- **CSRF protection**: Verificación de origen en peticiones POST
- **Límites de uso**: Protección contra abuso por espacio y globales
- **Sanitización**: Validación de entradas y prevención de inyección

## 📊 Límites de uso por espacio

- 50 misiones máximas
- 20 documentos por misión
- 10 MB máximo por archivo
- 30 ejecuciones por hora
- 100 llamadas a IA por día
- 500 MB de almacenamiento total

## 🚢 Despliegue en Vercel

### 1. Configurar variables de entorno en Vercel

```
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

### 2. Desactivar Deployment Protection (si es necesario)

En Vercel Dashboard → Settings → Deployment Protection → Desactivar para producción

### 3. Desplegar

```bash
vercel --prod
```

La URL pública será accesible sin cuenta de Vercel.

## 🧪 Pruebas realizadas

### ✅ Verificado en este entorno

- [x] Compilación TypeScript sin errores
- [x] Build de producción exitoso
- [x] Acceso directo sin autenticación
- [x] Creación de espacio anónimo con cookie
- [x] Persistencia de datos en localStorage
- [x] Aislamiento de datos por espacio (cliente)
- [x] Generación de entregables (PDF, DOCX, XLSX)
- [x] Controles de concurrencia y límites
- [x] Cancelación y reanudación de trabajos

### ⚠️ Pendiente de verificación manual

- [ ] Aislamiento entre navegadores (abrir en ventana incógnito)
- [ ] Ejecución con IA real (requiere API key configurada)
- [ ] Verificación server-side del espacio (requiere backend)
- [ ] Políticas RLS en Supabase (si se migra)
- [ ] Descargas verifican pertenencia al espacio (server-side)

## 📝 Flujo de uso

1. **Entrar** → Acceso directo al panel (sin login)
2. **Crear misión** → Describir necesidad con formulario guiado
3. **Aportar documentos** → Cargar archivos (PDF, DOCX, TXT, CSV, XLSX)
4. **Preparar plan** → El sistema analiza y propone tareas (con IA si está configurada)
5. **Revisar y editar** → Ajustar objetivo y plan antes de ejecutar
6. **Ejecutar** → El agente trabaja con progreso visible en tiempo real
7. **Descargar resultados** → Informe PDF/DOCX y plan XLSX

## 🔗 Enlaces

- Repositorio: `sae-space-ai/atiende-ai`
- Documentación de despliegue: `DEPLOYMENT.md`
- Registro de cambios: `CHANGES.md`

## 📄 Licencia

Privado - sae-space-ai
