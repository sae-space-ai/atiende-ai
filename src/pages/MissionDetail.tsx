import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, XCircle, Upload, FileText, Download,
  CheckCircle2, AlertTriangle, Clock, Target, Eye, Edit3,
  ChevronRight, RefreshCw, Loader2, FileSpreadsheet, File
} from 'lucide-react';
import { getMission, saveMission, updateMissionStatus, generateId, computeHash } from '../store';
import { generatePlanFromNeed, formatDate, getStatusColor, getStatusLabel, formatFileSize, timeAgo } from '../utils';
import type { Mission, Document as MissionDoc, TaskStatus, Deliverable } from '../types';
import { getAIProviderInfo, isAIConfigured, analyzeNeed } from '../ai-client';
import { 
  createJob, getJob, getJobsByMission, saveJob, updateJobProgress, 
  updateTaskStatus, cancelJob, pauseJob, resumeJob,
  checkConcurrencyLimits, checkAILimits, reserveAIUsage, incrementActiveJobs,
  type Job, type JobTask
} from '../jobs';
import { generatePDF, generateDOCX, generatePlanXLSX, type ReportContent, type PlanContent } from '../deliverables';

type Tab = 'summary' | 'plan' | 'documents' | 'evidence' | 'deliverables' | 'activity';

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [aiInfo, setAiInfo] = useState(getAIProviderInfo());

  const loadMission = useCallback(() => {
    if (id) {
      const m = getMission(id);
      if (m) {
        setMission(m);
        // Cargar trabajo activo si existe
        const jobs = getJobsByMission(m.id);
        const activeJob = jobs.find(j => j.status === 'running' || j.status === 'paused');
        if (activeJob) setCurrentJob(activeJob);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  useEffect(() => { loadMission(); }, [loadMission]);

  // Polling para actualizar progreso del trabajo
  useEffect(() => {
    if (!currentJob || currentJob.status !== 'running') return;
    
    const interval = setInterval(() => {
      const job = getJob(currentJob.id);
      if (job) {
        setCurrentJob(job);
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          setIsExecuting(false);
          incrementActiveJobs(-1);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentJob]);

  if (!mission) return null;

  const handlePreparePlan = async () => {
    if (!isAIConfigured()) {
      alert('La ejecución con IA está pendiente de configuración. Configura AI_PROVIDER en el servidor.\n\nPuedes generar un plan básico sin IA.');
      handleGeneratePlanBasic();
      return;
    }

    const limits = checkConcurrencyLimits();
    if (!limits.allowed) {
      alert(limits.reason);
      return;
    }

    const aiLimits = checkAILimits();
    if (!aiLimits.allowed) {
      alert(aiLimits.reason);
      return;
    }

    setIsExecuting(true);

    // Crear trabajo
    const job = createJob(mission.id, 'analyze', [
      {
        title: 'Analizar necesidad',
        description: 'Comprender la necesidad y contexto',
        dependencies: [],
      },
      {
        title: 'Revisar documentos',
        description: 'Extraer información de documentos cargados',
        dependencies: [],
      },
      {
        title: 'Identificar información pendiente',
        description: 'Detectar lagunas de información',
        dependencies: ['Analizar necesidad', 'Revisar documentos'],
      },
      {
        title: 'Generar plan de tareas',
        description: 'Proponer tareas concretas',
        dependencies: ['Identificar información pendiente'],
      },
    ]);

    setCurrentJob(job);
    incrementActiveJobs(1);
    reserveAIUsage(1);

    try {
      // Preparar contexto
      const documents = mission.documents.map(d => ({
        name: d.name,
        content: d.extractedText || '[Sin contenido extraído]',
      }));

      updateJobProgress(job.id, {
        currentStep: 'Analizando necesidad con IA...',
        message: 'Enviando petición al proveedor de IA',
      });

      const response = await analyzeNeed(
        mission.need.title,
        mission.need.description,
        mission.need.context,
        documents
      );

      // Parsear respuesta
      let planData;
      try {
        planData = JSON.parse(response.content);
      } catch {
        throw new Error('La IA devolvió una respuesta no válida');
      }

      // Generar plan
      const { tasks } = generatePlanFromNeed(mission.need);
      
      // Actualizar tareas con información de IA
      if (planData.tasks && Array.isArray(planData.tasks)) {
        planData.tasks.forEach((aiTask: any, i: number) => {
          if (i < tasks.length) {
            tasks[i].title = aiTask.title || tasks[i].title;
            tasks[i].description = aiTask.description || tasks[i].description;
            tasks[i].inputs = aiTask.inputs || tasks[i].inputs;
            tasks[i].expectedOutputs = aiTask.outputs || tasks[i].expectedOutputs;
          }
        });
      }

      mission.plan = {
        id: generateId(),
        missionId: mission.id,
        contractVersion: mission.contract.version,
        tasks,
        createdAt: new Date().toISOString(),
      };

      // Actualizar objetivo si la IA lo propuso
      if (planData.objective) {
        mission.contract.objective = planData.objective;
      }

      // Añadir información pendiente como criterios
      if (planData.missingInfo && Array.isArray(planData.missingInfo)) {
        planData.missingInfo.forEach((info: string) => {
          mission.contract.acceptanceCriteria.push({
            id: generateId(),
            description: `Información pendiente: ${info}`,
            type: 'human_review',
            status: 'pending_review',
            evidence: '',
          });
        });
      }

      mission.status = 'planning';
      mission.nextStep = 'Revisar plan generado y aprobar';

      updateTaskStatus(job.id, job.tasks[0].id, 'completed', 'Análisis completado');
      updateJobProgress(job.id, {
        percent: 100,
        currentStep: 'Plan generado',
        message: 'Plan preparado con éxito',
      });

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      saveJob(job);

      saveMission(mission);
      setMission({ ...mission });

    } catch (error) {
      console.error('Error preparing plan:', error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Error desconocido';
      saveJob(job);
      alert(`Error al preparar el plan: ${job.error}`);
    }

    setIsExecuting(false);
    incrementActiveJobs(-1);
  };

  const handleGeneratePlanBasic = () => {
    const { tasks } = generatePlanFromNeed(mission.need);
    mission.plan = {
      id: generateId(),
      missionId: mission.id,
      contractVersion: mission.contract.version,
      tasks,
      createdAt: new Date().toISOString(),
    };
    mission.status = 'planning';
    mission.nextStep = 'Aprobar contrato y comenzar ejecución';
    saveMission(mission);
    setMission({ ...mission });
  };

  const handleApproveContract = () => {
    mission.contract.approvedAt = new Date().toISOString();
    mission.status = 'active';
    mission.nextStep = 'Ejecutar tareas del plan';
    saveMission(mission);
    setMission({ ...mission });
  };

  const handleExecute = async () => {
    if (!mission.plan) return;
    
    if (!isAIConfigured()) {
      alert('La ejecución con IA está pendiente de configuración.\n\nEjecutando en modo simulado (sin IA real).');
      handleExecuteSimulated();
      return;
    }

    const limits = checkConcurrencyLimits();
    if (!limits.allowed) {
      alert(limits.reason);
      return;
    }

    setIsExecuting(true);

    const pendingTasks = mission.plan.tasks.filter(t => t.status === 'pending');
    
    const job = createJob(mission.id, 'execute_plan', pendingTasks.map(t => ({
      title: t.title,
      description: t.description,
      dependencies: t.dependencies,
    })));

    setCurrentJob(job);
    incrementActiveJobs(1);

    for (const task of pendingTasks) {
      // Verificar cancelación
      const currentJobState = getJob(job.id);
      if (currentJobState?.status === 'cancelled') break;

      // Verificar dependencias
      const deps = mission.plan!.tasks.filter(t => task.dependencies.includes(t.id));
      const allDepsCompleted = deps.every(d => d.status === 'completed');
      if (!allDepsCompleted && deps.length > 0) {
        task.status = 'blocked';
        task.blockedReason = 'Dependencias no completadas';
        updateTaskStatus(job.id, job.tasks.find(t => t.title === task.title)!.id, 'blocked', undefined, 'Dependencias no completadas');
        continue;
      }

      task.status = 'in_progress';
      task.startedAt = new Date().toISOString();
      saveMission(mission);
      setMission({ ...mission });

      const jobTask = job.tasks.find(t => t.title === task.title);
      if (jobTask) {
        updateTaskStatus(job.id, jobTask.id, 'in_progress');
        updateJobProgress(job.id, {
          currentStep: `Ejecutando: ${task.title}`,
          message: `Procesando tarea ${task.order} de ${mission.plan!.tasks.length}`,
        });
      }

      // Simular ejecución (en producción, llamar a IA real)
      await new Promise(r => setTimeout(r, 1000));

      task.status = 'completed';
      task.completedAt = new Date().toISOString();

      if (jobTask) {
        updateTaskStatus(job.id, jobTask.id, 'completed', 'Tarea completada');
      }

      saveMission(mission);
      setMission({ ...mission });
    }

    // Completar trabajo
    const allCompleted = mission.plan.tasks.every(t => t.status === 'completed');
    job.status = allCompleted ? 'completed' : 'failed';
    job.completedAt = new Date().toISOString();
    saveJob(job);

    if (allCompleted) {
      mission.status = 'completed';
      mission.nextStep = 'Revisar resultados y cerrar misión';
    } else {
      mission.status = 'blocked';
      mission.nextStep = 'Resolver tareas bloqueadas';
    }
    saveMission(mission);
    setMission({ ...mission });

    setIsExecuting(false);
    incrementActiveJobs(-1);
  };

  const handleExecuteSimulated = () => {
    if (!mission.plan) return;
    
    setIsExecuting(true);
    
    const pendingTasks = mission.plan.tasks.filter(t => t.status === 'pending');
    
    pendingTasks.forEach((task, i) => {
      setTimeout(() => {
        task.status = 'completed';
        task.startedAt = new Date().toISOString();
        task.completedAt = new Date().toISOString();
        
        saveMission(mission);
        setMission({ ...mission });
        
        if (i === pendingTasks.length - 1) {
          mission.status = 'completed';
          mission.nextStep = 'Revisar resultados y cerrar misión';
          saveMission(mission);
          setMission({ ...mission });
          setIsExecuting(false);
        }
      }, (i + 1) * 1000);
    });
  };

  const handleCancelJob = () => {
    if (currentJob) {
      cancelJob(currentJob.id);
      setCurrentJob(null);
      setIsExecuting(false);
    }
  };

  const handlePauseJob = () => {
    if (currentJob) {
      pauseJob(currentJob.id);
      setCurrentJob({ ...currentJob, status: 'paused' });
    }
  };

  const handleResumeJob = () => {
    if (currentJob) {
      resumeJob(currentJob.id);
      setCurrentJob({ ...currentJob, status: 'running' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const allowedExts = ['.pdf', '.docx', '.txt', '.csv', '.xlsx'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        alert(`Formato no permitido: ${ext}. Use: ${allowedExts.join(', ')}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Archivo demasiado grande (máx. 10 MB)');
        continue;
      }

      const hash = await computeHash(file);
      let extractedText = '';

      if (ext === '.txt' || ext === '.csv') {
        extractedText = await file.text();
      } else {
        extractedText = `[Contenido del archivo: ${file.name}]\nNota: El procesamiento completo requiere configuración de servidor.`;
      }

      const doc: MissionDoc = {
        id: generateId(),
        missionId: mission.id,
        name: file.name,
        type: file.type || ext,
        size: file.size,
        hash,
        uploadedAt: new Date().toISOString(),
        owner: 'anonymous',
        extractedText,
        status: 'processed',
      };

      mission.documents.push(doc);
    }

    saveMission(mission);
    setMission({ ...mission });
  };

  const handleGenerateReport = (format: 'pdf' | 'docx') => {
    const content: ReportContent = {
      title: `Informe: ${mission.need.title}`,
      missionId: mission.id,
      missionTitle: mission.need.title,
      objective: mission.contract.objective,
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'Resumen ejecutivo',
          content: mission.need.description,
          sources: ['Usuario'],
        },
        {
          title: 'Contexto',
          content: mission.need.context || 'No proporcionado',
          sources: ['Usuario'],
        },
        {
          title: 'Documentos analizados',
          content: mission.documents.length > 0
            ? mission.documents.map(d => `- ${d.name} (${formatFileSize(d.size)})`).join('\n')
            : 'No se aportaron documentos',
          sources: mission.documents.map(d => d.name),
        },
        {
          title: 'Resultados',
          content: mission.plan?.tasks.filter(t => t.status === 'completed').map(t => `- ${t.title}: Completado`).join('\n') || 'Sin resultados',
          sources: ['Ejecución del agente'],
        },
      ],
      conclusions: [
        'Informe generado basado en la información proporcionada',
        `${mission.documents.length} documentos analizados`,
        `${mission.plan?.tasks.filter(t => t.status === 'completed').length || 0} tareas completadas`,
      ],
      pendingInfo: mission.contract.acceptanceCriteria
        .filter(c => c.status === 'pending_review')
        .map(c => c.description),
      sources: mission.evidence.map(e => ({
        type: e.type as any,
        content: e.content,
        verified: e.verified,
      })),
    };

    if (format === 'pdf') {
      generatePDF(content);
    } else {
      generateDOCX(content);
    }

    const deliverable: Deliverable = {
      id: generateId(),
      missionId: mission.id,
      title: `${mission.need.title} - Informe ${format.toUpperCase()}`,
      format: format === 'pdf' ? 'pdf' : 'docx',
      version: 1,
      content: JSON.stringify(content),
      generatedAt: new Date().toISOString(),
      sources: content.sources.map(s => s.content),
      pendingIssues: content.pendingInfo,
    };

    mission.deliverables.push(deliverable);
    saveMission(mission);
    setMission({ ...mission });
  };

  const handleGeneratePlan = () => {
    if (!mission.plan) return;

    const content: PlanContent = {
      title: `Plan de actuación: ${mission.need.title}`,
      missionId: mission.id,
      missionTitle: mission.need.title,
      objective: mission.contract.objective,
      generatedAt: new Date().toISOString(),
      tasks: mission.plan.tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        order: t.order,
        inputs: t.inputs,
        outputs: t.expectedOutputs,
      })),
      dependencies: mission.plan.tasks.flatMap(t => 
        t.dependencies.map(d => ({
          from: mission.plan!.tasks.find(task => task.id === d)?.title || d,
          to: t.title,
        }))
      ),
    };

    generatePlanXLSX(content);

    const deliverable: Deliverable = {
      id: generateId(),
      missionId: mission.id,
      title: `${mission.need.title} - Plan XLSX`,
      format: 'xlsx',
      version: 1,
      content: JSON.stringify(content),
      generatedAt: new Date().toISOString(),
      sources: [],
      pendingIssues: [],
    };

    mission.deliverables.push(deliverable);
    saveMission(mission);
    setMission({ ...mission });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver al panel
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(mission.status)}`}>
                {getStatusLabel(mission.status)}
              </span>
              <span className="text-xs text-gray-500">v{mission.contract.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{mission.need.title}</h1>
            {mission.nextStep && (
              <p className="text-sm text-indigo-600 mt-1 flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> {mission.nextStep}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {mission.status === 'draft' && !mission.plan && (
              <button 
                onClick={handlePreparePlan} 
                disabled={isExecuting}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                Preparar plan
              </button>
            )}
            {mission.status === 'draft' && mission.plan && (
              <button onClick={handleApproveContract} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Aprobar contrato
              </button>
            )}
            {mission.status === 'active' && (
              <>
                <button onClick={handleExecute} disabled={isExecuting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                  {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isExecuting ? 'Ejecutando...' : 'Ejecutar'}
                </button>
                {currentJob && currentJob.status === 'running' && (
                  <>
                    <button onClick={handlePauseJob} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 flex items-center gap-1">
                      <Pause className="w-4 h-4" /> Pausar
                    </button>
                    <button onClick={handleCancelJob} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Cancelar
                    </button>
                  </>
                )}
                {currentJob && currentJob.status === 'paused' && (
                  <button onClick={handleResumeJob} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1">
                    <Play className="w-4 h-4" /> Reanudar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Status Banner */}
      {!aiInfo.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>IA no configurada:</strong> {aiInfo.message}
          </div>
        </div>
      )}

      {/* Job Progress */}
      {currentJob && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Progreso del trabajo</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentJob.status)}`}>
              {getStatusLabel(currentJob.status)}
            </span>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{currentJob.progress.currentStep}</span>
              <span>{currentJob.progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all" 
                style={{ width: `${currentJob.progress.percent}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">{currentJob.progress.message}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-900">{currentJob.consumption.stepsCompleted}/{currentJob.progress.totalSteps}</div>
              <div className="text-gray-500">Pasos</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-900">{currentJob.consumption.aiCalls}</div>
              <div className="text-gray-500">Llamadas IA</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-900">{currentJob.consumption.tokensUsed}</div>
              <div className="text-gray-500">Tokens</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {([
            { key: 'summary', label: 'Resumen', icon: Eye },
            { key: 'plan', label: 'Plan', icon: Target },
            { key: 'documents', label: 'Documentos', icon: FileText },
            { key: 'evidence', label: 'Evidencias', icon: CheckCircle2 },
            { key: 'deliverables', label: 'Entregables', icon: Download },
            { key: 'activity', label: 'Actividad', icon: Clock },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {tab === 'summary' && <SummaryTab mission={mission} />}
        {tab === 'plan' && <PlanTab mission={mission} currentJob={currentJob} />}
        {tab === 'documents' && <DocumentsTab mission={mission} onUpload={handleFileUpload} />}
        {tab === 'evidence' && <EvidenceTab mission={mission} />}
        {tab === 'deliverables' && (
          <DeliverablesTab 
            mission={mission} 
            onGenerateReport={handleGenerateReport}
            onGeneratePlan={handleGeneratePlan}
          />
        )}
        {tab === 'activity' && <ActivityTab mission={mission} currentJob={currentJob} />}
      </div>
    </div>
  );
}

// Componentes de pestañas (simplificados para el ejemplo)
function SummaryTab({ mission }: { mission: Mission }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Necesidad</h3>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-gray-500">Descripción</dt><dd className="text-gray-900 mt-0.5">{mission.need.description}</dd></div>
          {mission.need.context && <div><dt className="text-gray-500">Contexto</dt><dd className="text-gray-900 mt-0.5">{mission.need.context}</dd></div>}
          <div><dt className="text-gray-500">Resultado esperado</dt><dd className="text-gray-900 mt-0.5">{mission.need.expectedResult}</dd></div>
          <div><dt className="text-gray-500">Prioridad</dt><dd className="text-gray-900 mt-0.5">{getStatusLabel(mission.need.priority)}</dd></div>
        </dl>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Contrato de misión</h3>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-gray-500">Objetivo</dt><dd className="text-gray-900 mt-0.5">{mission.contract.objective}</dd></div>
          <div><dt className="text-gray-500">Permisos</dt><dd className="text-gray-900 mt-0.5">{getStatusLabel(mission.contract.permissionLevel)}</dd></div>
          <div><dt className="text-gray-500">Aprobado</dt><dd className="text-gray-900 mt-0.5">
            {mission.contract.approvedAt ? `Sí, ${formatDate(mission.contract.approvedAt)}` : 'Pendiente'}
          </dd></div>
        </dl>
      </div>
    </div>
  );
}

function PlanTab({ mission, currentJob }: { mission: Mission; currentJob: Job | null }) {
  if (!mission.plan) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay plan generado. Pulsa "Preparar plan" para generar uno.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mission.plan.tasks.sort((a, b) => a.order - b.order).map(task => {
        const jobTask = currentJob?.tasks.find(t => t.title === task.title);
        return (
          <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-400">#{task.order}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocumentsTab({ mission, onUpload }: { mission: Mission; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Cargar documentos</h3>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">Haz clic o arrastra archivos aquí</span>
          <input type="file" multiple accept=".pdf,.docx,.txt,.csv,.xlsx" onChange={onUpload} className="hidden" />
        </label>
      </div>
      {mission.documents.length > 0 && (
        <div className="space-y-2">
          {mission.documents.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                {getStatusLabel(doc.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceTab({ mission }: { mission: Mission }) {
  return (
    <div className="space-y-3">
      {mission.evidence.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No hay evidencias registradas</p>
        </div>
      ) : (
        mission.evidence.map(ev => (
          <div key={ev.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-900">{ev.content}</p>
            <p className="text-xs text-gray-500 mt-1">Fuente: {ev.source}</p>
          </div>
        ))
      )}
    </div>
  );
}

function DeliverablesTab({ mission, onGenerateReport, onGeneratePlan }: { 
  mission: Mission; 
  onGenerateReport: (format: 'pdf' | 'docx') => void;
  onGeneratePlan: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Generar entregables</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onGenerateReport('pdf')} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1.5">
            <File className="w-4 h-4" /> Informe PDF
          </button>
          <button onClick={() => onGenerateReport('docx')} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Informe Word
          </button>
          {mission.plan && (
            <button onClick={onGeneratePlan} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" /> Plan Excel
            </button>
          )}
        </div>
      </div>
      {mission.deliverables.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 text-sm">Entregables generados</h4>
          {mission.deliverables.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <Download className="w-6 h-6 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{d.title}</p>
                <p className="text-xs text-gray-500">{formatDate(d.generatedAt)}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase">{d.format}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTab({ mission, currentJob }: { mission: Mission; currentJob: Job | null }) {
  return (
    <div className="space-y-3">
      {currentJob && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-2">Trabajo actual</h4>
          <div className="space-y-2">
            {currentJob.tasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'in_progress' ? 'bg-blue-500' :
                  task.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                }`} />
                <span className="text-gray-700">{task.title}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {mission.executions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 text-sm">Historial de ejecuciones</h4>
          {mission.executions.map(exec => (
            <div key={exec.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-900">Ejecución completada</p>
              <p className="text-xs text-gray-500">{formatDate(exec.startedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
