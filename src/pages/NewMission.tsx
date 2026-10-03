import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveMission, createMissionFromNeed } from '../store';
import type { Mission } from '../types';

type Step = 'need' | 'context' | 'objective' | 'limits' | 'review';

interface FormData {
  title: string;
  description: string;
  context: string;
  expectedResult: string;
  targetDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  closureCriteria: string;
  allowedSources: string;
  actionLimits: string;
}

const INITIAL_FORM: FormData = {
  title: '',
  description: '',
  context: '',
  expectedResult: '',
  targetDate: '',
  priority: 'medium',
  closureCriteria: '',
  allowedSources: '',
  actionLimits: 'No realizar acciones externas sin autorización explícita',
};

export default function NewMission() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('need');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saved, setSaved] = useState(false);

  const steps: { key: Step; label: string; number: number }[] = [
    { key: 'need', label: 'Necesidad', number: 1 },
    { key: 'context', label: 'Contexto', number: 2 },
    { key: 'objective', label: 'Objetivo', number: 3 },
    { key: 'limits', label: 'Alcance', number: 4 },
    { key: 'review', label: 'Revisar', number: 5 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'need': return form.title.trim().length > 0 && form.description.trim().length > 0;
      case 'context': return true; // optional
      case 'objective': return form.expectedResult.trim().length > 0;
      case 'limits': return true; // optional
      case 'review': return true;
      default: return false;
    }
  };

  const nextStep = () => {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1].key);
    }
  };

  const prevStep = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setStep(steps[idx - 1].key);
    }
  };

  const handleSave = () => {
    const mission = createMissionFromNeed({
      title: form.title,
      description: form.description,
      context: form.context,
      expectedResult: form.expectedResult,
      targetDate: form.targetDate,
      priority: form.priority,
      closureCriteria: form.closureCriteria,
      allowedSources: form.allowedSources.split('\n').filter(s => s.trim()),
      actionLimits: form.actionLimits,
    });
    saveMission(mission);
    setSaved(true);
    setTimeout(() => navigate(`/mision/${mission.id}`), 1500);
  };

  const handleSaveDraft = () => {
    const mission = createMissionFromNeed({
      title: form.title || 'Misión sin título',
      description: form.description || 'Borrador',
      context: form.context,
      expectedResult: form.expectedResult,
      targetDate: form.targetDate,
      priority: form.priority,
      closureCriteria: form.closureCriteria,
      allowedSources: form.allowedSources.split('\n').filter(s => s.trim()),
      actionLimits: form.actionLimits,
    });
    mission.status = 'draft';
    saveMission(mission);
    navigate(`/mision/${mission.id}`);
  };

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Misión creada</h2>
        <p className="text-gray-600">Redirigiendo a la misión...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Atender una necesidad</h1>
        <p className="text-gray-600 mt-1">Describe lo que necesitas. El sistema creará una misión con un agente dedicado.</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= currentStepIndex ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s.number}
              </div>
              <span className={`text-sm hidden sm:block ${i <= currentStepIndex ? 'text-indigo-700 font-medium' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < currentStepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {step === 'need' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título de la necesidad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => updateForm('title', e.target.value)}
                placeholder="Ej: Preparar informe de cumplimiento normativo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => updateForm('description', e.target.value)}
                placeholder="Describe la necesidad con el mayor detalle posible. ¿Qué problema resuelve? ¿Para quién es?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => updateForm('priority', p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      form.priority === p
                        ? p === 'critical' ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                        : p === 'high' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300'
                        : p === 'medium' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-700 ring-2 ring-gray-300'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : 'Crítica'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 'context' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contexto adicional</label>
              <textarea
                value={form.context}
                onChange={e => updateForm('context', e.target.value)}
                placeholder="Información de fondo, antecedentes, restricciones conocidas, partes implicadas..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Opcional. Aporta contexto que ayude a comprender mejor la necesidad.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha objetivo</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={e => updateForm('targetDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </>
        )}

        {step === 'objective' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resultado esperado <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.expectedResult}
                onChange={e => updateForm('expectedResult', e.target.value)}
                placeholder="¿Qué resultado concreto esperas obtener? Describe el entregable o la situación final deseada."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Criterios de cierre</label>
              <textarea
                value={form.closureCriteria}
                onChange={e => updateForm('closureCriteria', e.target.value)}
                placeholder={"¿Cómo sabrás que la necesidad está resuelta? Escribe un criterio por línea.\nEj:\nEl informe incluye todos los apartados requeridos\nLas cifras son coherentes con los documentos aportados\nEl formato es compatible con el sistema de destino"}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Un criterio por línea. Estos criterios se usarán para verificar la resolución.</p>
            </div>
          </>
        )}

        {step === 'limits' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuentes permitidas</label>
              <textarea
                value={form.allowedSources}
                onChange={e => updateForm('allowedSources', e.target.value)}
                placeholder={"¿Qué fuentes puede consultar el agente? Una por línea.\nEj:\nDocumentos aportados por el usuario\nBúsqueda web (si está configurada)"}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Límites de actuación</label>
              <textarea
                value={form.actionLimits}
                onChange={e => updateForm('actionLimits', e.target.value)}
                placeholder="¿Qué NO debe hacer el agente? ¿Qué requiere tu aprobación previa?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Nivel de permiso: Solo análisis</p>
                  <p className="text-xs text-amber-700 mt-1">
                    El agente analizará la información y preparará resultados. Las acciones externas requerirán tu aprobación explícita.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Resumen de la misión</h3>
            <div className="space-y-3">
              <ReviewField label="Título" value={form.title} />
              <ReviewField label="Descripción" value={form.description} />
              <ReviewField label="Prioridad" value={form.priority === 'low' ? 'Baja' : form.priority === 'medium' ? 'Media' : form.priority === 'high' ? 'Alta' : 'Crítica'} />
              {form.context && <ReviewField label="Contexto" value={form.context} />}
              <ReviewField label="Resultado esperado" value={form.expectedResult} />
              {form.closureCriteria && <ReviewField label="Criterios de cierre" value={form.closureCriteria} />}
              {form.targetDate && <ReviewField label="Fecha objetivo" value={form.targetDate} />}
              {form.allowedSources && <ReviewField label="Fuentes permitidas" value={form.allowedSources} />}
              <ReviewField label="Límites" value={form.actionLimits} />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Se creará un contrato de misión</strong> con esta información. Podrás modificarlo antes de ejecutar el agente.
                Los documentos se podrán añadir en el siguiente paso.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {step !== 'need' && (
            <button onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-1"
          >
            <Save className="w-4 h-4" /> Guardar borrador
          </button>
          {step !== 'review' ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Crear misión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-gray-100 pb-3">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  );
}
