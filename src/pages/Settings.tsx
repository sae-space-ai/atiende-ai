import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Shield, Database, Globe, Cpu, Save } from 'lucide-react';
import { getSettings, saveSettings } from '../store';
import type { AppSettings } from '../types';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const services = [
    {
      name: 'Proveedor de IA',
      description: 'Modelo de lenguaje para interpretar necesidades, planificar y ejecutar tareas.',
      icon: Cpu,
      configured: settings.aiConfigured,
      detail: settings.aiConfigured ? `Proveedor: ${settings.aiProvider}` : 'No configurado. El agente no puede ejecutar tareas automáticas.',
      action: 'Configurar',
    },
    {
      name: 'Almacenamiento de documentos',
      description: 'Servicio para guardar documentos de forma privada y segura.',
      icon: Database,
      configured: settings.storageConfigured,
      detail: settings.storageConfigured ? 'Configurado' : 'No configurado. Los documentos se almacenan localmente en el navegador.',
      action: 'Configurar',
    },
    {
      name: 'Fuentes externas',
      description: 'Acceso a fuentes de información externas (búsqueda web, APIs).',
      icon: Globe,
      configured: settings.externalSourcesConfigured,
      detail: settings.externalSourcesConfigured ? 'Configurado' : 'No configurado. El agente solo puede usar información aportada por el usuario.',
      action: 'Configurar',
    },
    {
      name: 'Reconocimiento óptico (OCR)',
      description: 'Extracción de texto de imágenes y PDFs escaneados.',
      icon: Shield,
      configured: settings.ocrConfigured,
      detail: settings.ocrConfigured ? 'Configurado' : 'No configurado. Los PDFs escaneados no podrán procesarse automáticamente.',
      action: 'Configurar',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">Verifica qué servicios están disponibles y configura las integraciones.</p>
      </div>

      {/* Services status */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Estado de servicios</h2>
        {services.map(service => (
          <div key={service.name} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                service.configured ? 'bg-green-50' : 'bg-gray-50'
              }`}>
                <service.icon className={`w-5 h-5 ${service.configured ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  {service.configured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      <XCircle className="w-3 h-3" /> No disponible
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                <p className="text-xs text-gray-500 mt-2">{service.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* General settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Preferencias generales</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zona horaria</label>
          <input
            type="text"
            value={settings.timezone}
            onChange={e => setSettings({ ...settings, timezone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">Detectada automáticamente: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño máximo de documento</label>
          <select
            value={settings.maxDocumentSize}
            onChange={e => setSettings({ ...settings, maxDocumentSize: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value={5242880}>5 MB</option>
            <option value={10485760}>10 MB</option>
            <option value={20971520}>20 MB</option>
            <option value={52428800}>50 MB</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Extensiones permitidas</label>
          <div className="flex flex-wrap gap-2">
            {settings.allowedExtensions.map(ext => (
              <span key={ext} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">{ext}</span>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Guardado ✓' : 'Guardar preferencias'}
        </button>
      </div>

      {/* Security info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Seguridad y privacidad</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>Los datos se almacenan localmente en tu navegador. No se envían a servidores externos.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>Los documentos procesados en cliente no salen de tu dispositivo.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>El agente no puede concederse permisos adicionales ni ejecutar acciones no autorizadas.</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p>La autenticación externa (Supabase, etc.) requiere configuración de servidor. Actualmente se usa sesión local.</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p>El seguimiento automático requiere un servicio de cola programada (no disponible en este entorno).</p>
          </div>
        </div>
      </div>

      {/* Pending configuration */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Configuración pendiente para producción
        </h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">1</span>
            Configurar proveedor de IA (variable <code className="bg-amber-100 px-1 rounded">AI_PROVIDER_KEY</code>)
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">2</span>
            Configurar base de datos PostgreSQL (Supabase o similar)
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">3</span>
            Configurar almacenamiento de archivos (Supabase Storage, S3)
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">4</span>
            Configurar autenticación (Supabase Auth, Auth0)
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">5</span>
            Configurar cola de trabajos para ejecución persistente (Vercel Cron, Inngest)
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">6</span>
            Configurar servicio OCR para PDFs escaneados
          </li>
        </ul>
      </div>
    </div>
  );
}
