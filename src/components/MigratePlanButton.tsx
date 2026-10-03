import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Archive } from 'lucide-react';
import type { Mission } from '../types';
import { migrateMissionPlan, isPlanAlreadyMigrated, getBackups, type MigrationResult } from '../migration';
import { saveMission } from '../store';

interface MigratePlanButtonProps {
  mission: Mission;
  onMigrated: () => void;
}

export default function MigratePlanButton({ mission, onMigrated }: MigratePlanButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const alreadyMigrated = isPlanAlreadyMigrated(mission);
  const backups = getBackups(mission.id);

  const handleMigrate = () => {
    setMigrating(true);
    
    try {
      // Ejecutar migración
      const migrationResult = migrateMissionPlan(mission);
      
      if (migrationResult.success) {
        // Guardar misión actualizada
        saveMission(mission);
        setResult(migrationResult);
        onMigrated();
      } else {
        setResult(migrationResult);
      }
    } catch (error) {
      setResult({
        success: false,
        missionId: mission.id,
        previousVersion: mission.contract.version,
        newVersion: mission.contract.version,
        tasksCreated: 0,
        tasksArchived: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        warnings: [],
      });
    } finally {
      setMigrating(false);
    }
  };

  if (alreadyMigrated && !result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <strong>Plan actualizado:</strong> Esta misión ya tiene el plan específico de 11 tareas.
          {backups.length > 0 && (
            <span className="block text-xs mt-1">
              Backups disponibles: {backups.length}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    if (result.success) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <strong>Migración completada</strong>
              <div className="mt-2 space-y-1 text-xs">
                <div>✓ Contrato versionado: v{result.previousVersion} → v{result.newVersion}</div>
                <div>✓ Tareas creadas: {result.tasksCreated}</div>
                {result.tasksArchived > 0 && (
                  <div>✓ Tareas archivadas: {result.tasksArchived}</div>
                )}
                <div>✓ Backup creado automáticamente</div>
              </div>
              {result.warnings.length > 0 && (
                <div className="mt-2 text-xs text-amber-700">
                  <strong>Avisos:</strong>
                  <ul className="list-disc list-inside">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-xs text-green-700 hover:text-green-900 underline"
          >
            Cerrar
          </button>
        </div>
      );
    } else {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Migración fallida</strong>
              <div className="mt-2 space-y-1 text-xs">
                <div>La misión original se ha conservado.</div>
                {result.errors.length > 0 && (
                  <div>
                    <strong>Errores:</strong>
                    <ul className="list-disc list-inside">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-xs text-red-700 hover:text-red-900 underline"
          >
            Cerrar
          </button>
        </div>
      );
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Actualizar plan de esta misión
      </button>
    );
  }

  return (
    <div className="bg-white border-2 border-indigo-300 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-indigo-600" />
        Confirmar actualización del plan
      </h4>
      
      <div className="space-y-3 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="font-medium text-blue-900 mb-1">¿Qué se va a hacer?</p>
          <ul className="list-disc list-inside text-blue-800 text-xs space-y-1">
            <li>Separar resultado esperado de criterios de aceptación</li>
            <li>Eliminar frase accidental del objetivo</li>
            <li>Versionar contrato (v{mission.contract.version} → v{mission.contract.version + 1})</li>
            <li>Reemplazar plan con 11 tareas específicas</li>
            <li>Conservar documentos, evidencias y entregables</li>
            {mission.plan?.tasks.some(t => t.status === 'completed') && (
              <li>Archivar plan anterior con tareas ejecutadas</li>
            )}
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="font-medium text-green-900 mb-1">¿Qué se conserva?</p>
          <ul className="list-disc list-inside text-green-800 text-xs space-y-1">
            <li>Identificador de la misión</li>
            <li>Documentos cargados ({mission.documents.length})</li>
            <li>Evidencias ({mission.evidence.length})</li>
            <li>Entregables ({mission.deliverables.length})</li>
            <li>Historial de ejecuciones ({mission.executions.length})</li>
            <li>Backup automático recuperable</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <p className="font-medium text-amber-900 mb-1">Importante</p>
          <ul className="list-disc list-inside text-amber-800 text-xs space-y-1">
            <li>Esta acción es reversible (backup disponible)</li>
            <li>Repetirla no duplicará tareas (idempotente)</li>
            <li>Si falla, la misión original se conserva</li>
            <li>El plan anterior se archiva si tenía tareas ejecutadas</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleMigrate}
          disabled={migrating}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {migrating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Confirmar actualización
            </>
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={migrating}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {backups.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 flex items-center gap-1">
            <Archive className="w-3 h-3" />
            Backups anteriores disponibles: {backups.length}
          </p>
        </div>
      )}
    </div>
  );
}
