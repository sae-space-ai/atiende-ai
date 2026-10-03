import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, AlertTriangle, CheckCircle2, Clock, Target, FileText, PlayCircle, PauseCircle } from 'lucide-react';
import { getMissions } from '../store';
import type { Mission } from '../types';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, truncateText } from '../utils';
import type { MissionStatus } from '../types';

export default function Dashboard() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filter, setFilter] = useState<MissionStatus | 'all'>('all');

  useEffect(() => {
    setMissions(getMissions());
  }, []);

  const filteredMissions = filter === 'all' ? missions : missions.filter(m => m.status === filter);
  
  const activeCount = missions.filter(m => m.status === 'active').length;
  const blockedCount = missions.filter(m => m.status === 'blocked').length;
  const pendingDecisions = missions.reduce((acc, m) => acc + m.approvals.filter(a => a.status === 'pending').length, 0);
  const completedCount = missions.filter(m => m.status === 'completed').length;

  const statusCounts: Record<string, number> = {};
  missions.forEach(m => {
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
  });

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de misiones</h1>
          <p className="text-gray-600 mt-1">Gestiona las necesidades activas y sus resultados</p>
        </div>
        <Link
          to="/nueva"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Atender una necesidad
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">Activas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{blockedCount}</p>
              <p className="text-xs text-gray-500">Bloqueadas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingDecisions}</p>
              <p className="text-xs text-gray-500">Decisiones pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              <p className="text-xs text-gray-500">Completadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todas ({missions.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status as MissionStatus)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === status ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {getStatusLabel(status)} ({count})
          </button>
        ))}
      </div>

      {/* Mission list */}
      {filteredMissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {missions.length === 0 ? 'No hay misiones todavía' : 'No hay misiones con este filtro'}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {missions.length === 0
              ? 'Crea tu primera misión para atender una necesidad. El agente te ayudará a definir el objetivo, planificar las tareas y producir resultados.'
              : 'Prueba con otro filtro o crea una nueva misión.'}
          </p>
          {missions.length === 0 && (
            <Link
              to="/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Crear primera misión
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMissions.map(mission => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </div>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="w-4 h-4" />;
      case 'paused': return <PauseCircle className="w-4 h-4" />;
      case 'blocked': return <AlertTriangle className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const completedTasks = mission.plan?.tasks.filter(t => t.status === 'completed').length || 0;
  const totalTasks = mission.plan?.tasks.length || 0;

  return (
    <Link
      to={`/mision/${mission.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(mission.status)}`}>
              {getStatusIcon(mission.status)}
              {getStatusLabel(mission.status)}
            </span>
            <span className={`text-xs font-medium ${getPriorityColor(mission.need.priority)}`}>
              ● {getStatusLabel(mission.need.priority)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 truncate">{mission.need.title}</h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {truncateText(mission.need.description, 150)}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {mission.documents.length} documentos
            </span>
            {totalTasks > 0 && (
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                {completedTasks}/{totalTasks} tareas
              </span>
            )}
            <span>Creada {formatDate(mission.createdAt)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {mission.nextStep && (
            <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md max-w-[200px]">
              <span className="font-medium">Siguiente:</span> {truncateText(mission.nextStep, 40)}
            </div>
          )}
          {mission.deliverables.length > 0 && (
            <div className="mt-2 text-xs text-green-600">
              {mission.deliverables.length} entregable{mission.deliverables.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
