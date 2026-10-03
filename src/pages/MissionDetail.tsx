import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, XCircle, Upload, FileText, Download,
  CheckCircle2, AlertTriangle, Clock, Target, Eye, Edit3,
  ChevronDown, ChevronRight, RefreshCw, Trash2, PlusCircle
} from 'lucide-react';
import { getMission, saveMission, updateMissionStatus, generateId, computeHash } from '../store';
import { generatePlanFromNeed, formatDate, getStatusColor, getStatusLabel, formatFileSize, timeAgo } from '../utils';
import type { Mission, Document as MissionDoc, TaskStatus, Deliverable } from '../types';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

type Tab = 'summary' | 'plan' | 'documents' | 'evidence' | 'deliverables' | 'activity';

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [showContractEdit, setShowContractEdit] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const loadMission = useCallback(() => {
    if (id) {
      const m = getMission(id);
      if (m) setMission(m);
      else navigate('/');
    }
  }, [id, navigate]);

  useEffect(() => { loadMission(); }, [loadMission]);

  if (!mission) return null;

  const handleGeneratePlan = () => {
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
    setIsExecuting(true);
    
    const pendingTasks = mission.plan.tasks.filter(t => t.status === 'pending');
    
    for (const task of pendingTasks) {
      // Check dependencies
      const deps = mission.plan.tasks.filter(t => task.dependencies.includes(t.id));
      const allDepsCompleted = deps.every(d => d.status === 'completed');
      if (!allDepsCompleted && deps.length > 0) {
        task.status = 'blocked';
        task.blockedReason = 'Dependencias no completadas';
        continue;
      }

      task.status = 'in_progress';
      task.startedAt = new Date().toISOString();
      saveMission(mission);
      setMission({ ...mission });

      // Simulate execution
      await new Promise(r => setTimeout(r, 800));

      // Create execution record
      const execution = {
        id: generateId(),
        missionId: mission.id,
        taskId: task.id,
        contractVersion: mission.contract.version,
        status: 'completed' as const,
        startedAt: task.startedAt!,
        completedAt: new Date().toISOString(),
        duration: 800,
        steps: [{
          id: generateId(),
          executionId: '',
          timestamp: new Date().toISOString(),
          action: `Tarea ejecutada: ${task.title}`,
          tool: task.tool,
          input: task.inputs.join(', '),
          output: task.expectedOutputs,
          status: 'success' as const,
        }],
        consumption: { toolCalls: 1, steps: 1 },
      };
      execution.steps[0].executionId = execution.id;
      mission.executions.push(execution);

      task.status = 'completed';
      task.completedAt = new Date().toISOString();

      // Add evidence
      mission.evidence.push({
        id: generateId(),
        missionId: mission.id,
        type: 'inference',
        content: `Resultado de "${task.title}": ${task.expectedOutputs}`,
        source: task.tool,
        sourceDate: new Date().toISOString(),
        verified: false,
        createdAt: new Date().toISOString(),
      });

      saveMission(mission);
      setMission({ ...mission });
    }

    // Check if all done
    const allCompleted = mission.plan.tasks.every(t => t.status === 'completed');
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
  };

  const handleStatusChange = (status: 'paused' | 'active' | 'cancelled') => {
    updateMissionStatus(mission.id, status);
    mission.status = status;
    if (status === 'paused') mission.nextStep = 'Reanudar ejecución';
    if (status === 'cancelled') mission.nextStep = 'Misión cancelada';
    saveMission(mission);
    setMission({ ...mission });
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

      // Extract text based on type
      if (ext === '.txt' || ext === '.csv') {
        extractedText = await file.text();
      } else if (ext === '.pdf') {
        extractedText = `[Contenido del PDF: ${file.name} - ${formatFileSize(file.size)}]\nNota: El procesamiento completo de PDF requiere un servicio OCR configurado.`;
      } else if (ext === '.docx') {
        extractedText = `[Contenido del documento: ${file.name}]\nNota: El procesamiento de DOCX requiere la biblioteca mammoth configurada en servidor.`;
      } else if (ext === '.xlsx') {
        extractedText = `[Contenido de la hoja de cálculo: ${file.name}]\nNota: El procesamiento de XLSX requiere configuración de servidor.`;
      }

      const doc: MissionDoc = {
        id: generateId(),
        missionId: mission.id,
        name: file.name,
        type: file.type || ext,
        size: file.size,
        hash,
        uploadedAt: new Date().toISOString(),
        owner: 'local-user',
        extractedText,
        status: 'processed',
      };

      mission.documents.push(doc);

      // Add evidence for document
      mission.evidence.push({
        id: generateId(),
        missionId: mission.id,
        type: 'document',
        content: `Documento cargado: ${file.name}`,
        source: 'user_upload',
        sourceDate: new Date().toISOString(),
        documentId: doc.id,
        verified: true,
        createdAt: new Date().toISOString(),
      });
    }

    mission.nextStep = mission.contract.approvedAt ? 'Ejecutar tareas del plan' : 'Confirmar contrato de misión';
    saveMission(mission);
    setMission({ ...mission });
  };

  const handleGenerateDeliverable = (format: 'pdf' | 'csv' | 'json') => {
    const title = mission.need.title;
    const now = new Date().toISOString();
    const content = generateDeliverableContent(mission, format);
    
    const deliverable: Deliverable = {
      id: generateId(),
      missionId: mission.id,
      title: `${title} - ${format.toUpperCase()}`,
      format,
      version: 1,
      content,
      generatedAt: now,
      sources: mission.evidence.map(e => e.source),
      pendingIssues: mission.contract.acceptanceCriteria
        .filter(c => c.status === 'pending_review')
        .map(c => c.description),
    };

    // Generate actual file
    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 20, 20);
      doc.setFontSize(10);
      doc.text(`Generado: ${formatDate(now)}`, 20, 30);
      doc.text(`Misión: ${mission.id}`, 20, 37);
      doc.setFontSize(12);
      doc.text('Objetivo:', 20, 50);
      doc.setFontSize(10);
      const splitObj = doc.splitTextToSize(mission.contract.objective, 170);
      doc.text(splitObj, 20, 57);
      
      let y = 57 + splitObj.length * 5 + 10;
      doc.setFontSize(12);
      doc.text('Descripción:', 20, y);
      doc.setFontSize(10);
      y += 7;
      const splitDesc = doc.splitTextToSize(mission.need.description, 170);
      doc.text(splitDesc, 20, y);
      y += splitDesc.length * 5 + 10;

      doc.setFontSize(12);
      doc.text('Documentos:', 20, y);
      doc.setFontSize(10);
      y += 7;
      mission.documents.forEach(d => {
        doc.text(`• ${d.name} (${formatFileSize(d.size)})`, 25, y);
        y += 5;
      });
      y += 5;

      doc.setFontSize(12);
      doc.text('Criterios de aceptación:', 20, y);
      doc.setFontSize(10);
      y += 7;
      mission.contract.acceptanceCriteria.forEach(c => {
        doc.text(`• ${c.description}`, 25, y);
        y += 5;
      });

      doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      deliverable.fileUrl = 'generated';
      deliverable.fileSize = 0;
    } else if (format === 'csv') {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    } else if (format === 'json') {
      const blob = new Blob([content], { type: 'application/json' });
      saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    }

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
            {mission.status === 'draft' && (
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
                <button onClick={() => handleStatusChange('paused')} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 flex items-center gap-1">
                  <Pause className="w-4 h-4" /> Pausar
                </button>
              </>
            )}
            {mission.status === 'paused' && (
              <button onClick={() => handleStatusChange('active')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1">
                <Play className="w-4 h-4" /> Reanudar
              </button>
            )}
            {(mission.status === 'active' || mission.status === 'paused' || mission.status === 'blocked') && (
              <button onClick={() => handleStatusChange('cancelled')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

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
        {tab === 'summary' && <SummaryTab mission={mission} onGeneratePlan={handleGeneratePlan} showContractEdit={showContractEdit} setShowContractEdit={setShowContractEdit} />}
        {tab === 'plan' && <PlanTab mission={mission} />}
        {tab === 'documents' && <DocumentsTab mission={mission} onUpload={handleFileUpload} />}
        {tab === 'evidence' && <EvidenceTab mission={mission} />}
        {tab === 'deliverables' && <DeliverablesTab mission={mission} onGenerate={handleGenerateDeliverable} />}
        {tab === 'activity' && <ActivityTab mission={mission} />}
      </div>
    </div>
  );
}

// --- Tab Components ---

function SummaryTab({ mission, onGeneratePlan, showContractEdit, setShowContractEdit }: {
  mission: Mission;
  onGeneratePlan: () => void;
  showContractEdit: boolean;
  setShowContractEdit: (v: boolean) => void;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Necesidad</h3>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-gray-500">Descripción</dt><dd className="text-gray-900 mt-0.5">{mission.need.description}</dd></div>
          {mission.need.context && <div><dt className="text-gray-500">Contexto</dt><dd className="text-gray-900 mt-0.5">{mission.need.context}</dd></div>}
          <div><dt className="text-gray-500">Resultado esperado</dt><dd className="text-gray-900 mt-0.5">{mission.need.expectedResult}</dd></div>
          {mission.need.targetDate && <div><dt className="text-gray-500">Fecha objetivo</dt><dd className="text-gray-900 mt-0.5">{mission.need.targetDate}</dd></div>}
          <div><dt className="text-gray-500">Prioridad</dt><dd className="text-gray-900 mt-0.5">{getStatusLabel(mission.need.priority)}</dd></div>
        </dl>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Contrato de misión</h3>
          <button onClick={() => setShowContractEdit(!showContractEdit)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> {showContractEdit ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-gray-500">Objetivo</dt><dd className="text-gray-900 mt-0.5">{mission.contract.objective}</dd></div>
          <div><dt className="text-gray-500">Permisos</dt><dd className="text-gray-900 mt-0.5">{getStatusLabel(mission.contract.permissionLevel)}</dd></div>
          <div><dt className="text-gray-500">Límites</dt><dd className="text-gray-900 mt-0.5">
            {mission.contract.consumptionLimits.maxSteps} pasos máx., {mission.contract.consumptionLimits.maxToolCalls} llamadas a herramientas
          </dd></div>
          <div><dt className="text-gray-500">Aprobado</dt><dd className="text-gray-900 mt-0.5">
            {mission.contract.approvedAt ? `Sí, ${formatDate(mission.contract.approvedAt)}` : 'Pendiente'}
          </dd></div>
        </dl>
        {showContractEdit && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Criterios de aceptación</h4>
            <ul className="space-y-1.5">
              {mission.contract.acceptanceCriteria.map(c => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${c.status === 'met' ? 'bg-green-500' : c.status === 'unmet' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span className="text-gray-700">{c.description}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span>
                </li>
              ))}
              {mission.contract.acceptanceCriteria.length === 0 && (
                <li className="text-gray-400 text-sm">Sin criterios definidos</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {!mission.plan && (
        <div className="md:col-span-2 bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-center">
          <Target className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <h3 className="font-semibold text-indigo-900 mb-1">Plan no generado</h3>
          <p className="text-sm text-indigo-700 mb-4">Genera un plan de tareas para ejecutar esta misión.</p>
          <button onClick={onGeneratePlan} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Generar plan
          </button>
        </div>
      )}
    </div>
  );
}

function PlanTab({ mission }: { mission: Mission }) {
  if (!mission.plan) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay plan generado. Ve a la pestaña Resumen para generar uno.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mission.plan.tasks.sort((a, b) => a.order - b.order).map(task => (
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
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                <span>Herramienta: <strong>{task.tool}</strong></span>
                <span>Entradas: {task.inputs.join(', ')}</span>
              </div>
              {task.blockedReason && (
                <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Bloqueada: {task.blockedReason}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ mission, onUpload }: { mission: Mission; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Cargar documentos</h3>
        <p className="text-sm text-gray-600 mb-3">Formatos admitidos: PDF, DOCX, TXT, CSV, XLSX. Tamaño máximo: 10 MB.</p>
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
                <p className="text-xs text-gray-500">{formatFileSize(doc.size)} · {formatDate(doc.uploadedAt)}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                {getStatusLabel(doc.status)}
              </span>
            </div>
          ))}
        </div>
      )}
      {mission.documents.length === 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No hay documentos cargados</p>
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
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${ev.type === 'document' ? 'bg-blue-500' : ev.type === 'user_provided' ? 'bg-green-500' : ev.type === 'inference' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
              <span className="text-xs font-medium text-gray-500 uppercase">{ev.type.replace('_', ' ')}</span>
              {ev.verified && <CheckCircle2 className="w-3 h-3 text-green-500" />}
            </div>
            <p className="text-sm text-gray-900">{ev.content}</p>
            <p className="text-xs text-gray-500 mt-1">Fuente: {ev.source} · {timeAgo(ev.createdAt)}</p>
          </div>
        ))
      )}
    </div>
  );
}

function DeliverablesTab({ mission, onGenerate }: { mission: Mission; onGenerate: (format: 'pdf' | 'csv' | 'json') => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Generar entregable</h3>
        <p className="text-sm text-gray-600 mb-4">Genera un archivo con los resultados de la misión.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onGenerate('pdf')} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => onGenerate('csv')} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => onGenerate('json')} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> JSON
          </button>
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
                <p className="text-xs text-gray-500">v{d.version} · {formatDate(d.generatedAt)}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase">{d.format}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTab({ mission }: { mission: Mission }) {
  const activities = [
    ...mission.executions.map(e => ({
      id: e.id,
      type: 'execution' as const,
      timestamp: e.startedAt,
      description: `Ejecución completada (${e.duration}ms)`,
      status: e.status,
    })),
    ...mission.documents.map(d => ({
      id: d.id,
      type: 'document' as const,
      timestamp: d.uploadedAt,
      description: `Documento cargado: ${d.name}`,
      status: d.status,
    })),
    ...mission.deliverables.map(d => ({
      id: d.id,
      type: 'deliverable' as const,
      timestamp: d.generatedAt,
      description: `Entregable generado: ${d.title}`,
      status: 'completed' as const,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No hay actividad registrada</p>
        </div>
      ) : (
        activities.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${a.status === 'completed' || a.status === 'processed' ? 'bg-green-500' : a.status === 'failed' || a.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
            <div className="flex-1">
              <p className="text-sm text-gray-900">{a.description}</p>
              <p className="text-xs text-gray-500">{formatDate(a.timestamp)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Helper to generate deliverable content
function generateDeliverableContent(mission: Mission, format: string): string {
  if (format === 'json') {
    return JSON.stringify({
      mission: {
        id: mission.id,
        title: mission.need.title,
        status: mission.status,
        created: mission.createdAt,
      },
      objective: mission.contract.objective,
      documents: mission.documents.map(d => ({ name: d.name, size: d.size, type: d.type })),
      tasks: mission.plan?.tasks.map(t => ({ title: t.title, status: t.status, order: t.order })),
      evidence: mission.evidence.map(e => ({ type: e.type, content: e.content, source: e.source })),
      acceptanceCriteria: mission.contract.acceptanceCriteria.map(c => ({ description: c.description, status: c.status })),
    }, null, 2);
  }
  
  if (format === 'csv') {
    let csv = 'Campo,Valor\n';
    csv += `Título,"${mission.need.title}"\n`;
    csv += `Estado,${mission.status}\n`;
    csv += `Objetivo,"${mission.contract.objective}"\n`;
    csv += `Prioridad,${mission.need.priority}\n`;
    csv += `Documentos,${mission.documents.length}\n`;
    csv += `Tareas completadas,${mission.plan?.tasks.filter(t => t.status === 'completed').length || 0}\n`;
    csv += `Total tareas,${mission.plan?.tasks.length || 0}\n`;
    csv += '\nDocumentos\n';
    csv += 'Nombre,Tamaño,Tipo,Estado\n';
    mission.documents.forEach(d => {
      csv += `"${d.name}",${d.size},"${d.type}",${d.status}\n`;
    });
    csv += '\nCriterios de aceptación\n';
    csv += 'Descripción,Estado\n';
    mission.contract.acceptanceCriteria.forEach(c => {
      csv += `"${c.description}",${c.status}\n`;
    });
    return csv;
  }

  // PDF text content (used for reference, actual PDF generated with jsPDF)
  return `${mission.need.title}\n\nObjetivo: ${mission.contract.objective}\n\nEstado: ${mission.status}`;
}
