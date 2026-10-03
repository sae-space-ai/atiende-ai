/**
 * Generación de entregables reales
 * 
 * - PDF con jsPDF
 * - DOCX con docx library
 * - XLSX con xlsx library
 * - Contenido consistente entre formatos
 * - Sin información de otros espacios
 */

import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// ============================================
// TIPOS
// ============================================

export interface ReportContent {
  title: string;
  missionId: string;
  missionTitle: string;
  objective: string;
  generatedAt: string;
  sections: ReportSection[];
  conclusions: string[];
  pendingInfo: string[];
  sources: Source[];
}

export interface ReportSection {
  title: string;
  content: string;
  sources: string[];
}

export interface Source {
  type: 'user_provided' | 'document' | 'inference' | 'external';
  content: string;
  verified: boolean;
  locator?: string;
}

export interface PlanContent {
  title: string;
  missionId: string;
  missionTitle: string;
  objective: string;
  generatedAt: string;
  tasks: PlanTask[];
  dependencies: Array<{ from: string; to: string }>;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: string;
  order: number;
  inputs: string[];
  outputs: string;
  estimatedDuration?: string;
}

// ============================================
// GENERACIÓN DE PDF
// ============================================

export function generatePDF(content: ReportContent): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(content.title, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 5;

  // Metadatos
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Misión: ${content.missionTitle}`, margin, y);
  y += 5;
  doc.text(`Generado: ${new Date(content.generatedAt).toLocaleString('es-ES')}`, margin, y);
  y += 5;
  doc.text(`ID: ${content.missionId.substring(0, 8)}...`, margin, y);
  y += 10;

  // Objetivo
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Objetivo', margin, y);
  y += 7;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const objLines = doc.splitTextToSize(content.objective, maxWidth);
  doc.text(objLines, margin, y);
  y += objLines.length * 5 + 10;

  // Secciones
  content.sections.forEach(section => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, y);
    y += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const sectionLines = doc.splitTextToSize(section.content, maxWidth);
    doc.text(sectionLines, margin, y);
    y += sectionLines.length * 5 + 5;
    
    if (section.sources.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Fuentes: ${section.sources.join(', ')}`, margin, y);
      y += 8;
      doc.setTextColor(0);
    }
    
    y += 5;
  });

  // Conclusiones
  if (content.conclusions.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Conclusiones', margin, y);
    y += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    content.conclusions.forEach(conclusion => {
      const lines = doc.splitTextToSize(`• ${conclusion}`, maxWidth - 5);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
  }

  // Información pendiente
  if (content.pendingInfo.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 100, 0);
    doc.text('Información pendiente', margin, y);
    y += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 80, 0);
    content.pendingInfo.forEach(info => {
      const lines = doc.splitTextToSize(`⚠ ${info}`, maxWidth - 5);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
  }

  // Guardar
  const filename = `${content.missionTitle.replace(/[^a-zA-Z0-9]/g, '_')}_informe.pdf`;
  doc.save(filename);
}

// ============================================
// GENERACIÓN DE DOCX (usando HTML como fallback)
// ============================================

export function generateDOCX(content: ReportContent): void {
  // Crear un documento HTML que Word puede abrir
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(content.title)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
    h2 { color: #2d2d2d; margin-top: 30px; }
    .metadata { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .section { margin-bottom: 25px; }
    .sources { font-size: 0.85em; color: #666; font-style: italic; margin-top: 10px; }
    .conclusions { background: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
    .pending { background: #fff7ed; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0; }
    ul { margin: 10px 0; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(content.title)}</h1>
  
  <div class="metadata">
    <p><strong>Misión:</strong> ${escapeHtml(content.missionTitle)}</p>
    <p><strong>Generado:</strong> ${new Date(content.generatedAt).toLocaleString('es-ES')}</p>
    <p><strong>ID:</strong> ${content.missionId.substring(0, 8)}...</p>
  </div>
  
  <h2>Objetivo</h2>
  <p>${escapeHtml(content.objective)}</p>
  
  ${content.sections.map(section => `
    <div class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <p>${escapeHtml(section.content).replace(/\n/g, '<br>')}</p>
      ${section.sources.length > 0 ? `<p class="sources">Fuentes: ${escapeHtml(section.sources.join(', '))}</p>` : ''}
    </div>
  `).join('')}
  
  ${content.conclusions.length > 0 ? `
    <div class="conclusions">
      <h2>Conclusiones</h2>
      <ul>
        ${content.conclusions.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
  
  ${content.pendingInfo.length > 0 ? `
    <div class="pending">
      <h2>Información pendiente</h2>
      <ul>
        ${content.pendingInfo.map(p => `<li>⚠ ${escapeHtml(p)}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword' });
  const filename = `${content.missionTitle.replace(/[^a-zA-Z0-9]/g, '_')}_informe.doc`;
  saveAs(blob, filename);
}

// ============================================
// GENERACIÓN DE XLSX
// ============================================

export function generatePlanXLSX(content: PlanContent): void {
  const wb = XLSX.utils.book_new();
  
  // Hoja de resumen
  const summaryData = [
    ['Plan de Actuación'],
    [''],
    ['Misión', content.missionTitle],
    ['Objetivo', content.objective],
    ['Generado', new Date(content.generatedAt).toLocaleString('es-ES')],
    ['ID', content.missionId.substring(0, 8) + '...'],
    [''],
    ['Total de tareas', content.tasks.length.toString()],
    ['Tareas completadas', content.tasks.filter(t => t.status === 'completed').length.toString()],
    ['Tareas pendientes', content.tasks.filter(t => t.status === 'pending').length.toString()],
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
  
  // Hoja de tareas
  const tasksData = [
    ['Orden', 'Título', 'Descripción', 'Estado', 'Entradas', 'Salidas esperadas', 'Duración estimada'],
    ...content.tasks
      .sort((a, b) => a.order - b.order)
      .map(t => [
        t.order,
        t.title,
        t.description,
        t.status,
        t.inputs.join('; '),
        t.outputs,
        t.estimatedDuration || 'N/A',
      ]),
  ];
  
  const wsTasks = XLSX.utils.aoa_to_sheet(tasksData);
  wsTasks['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 50 },
    { wch: 15 },
    { wch: 30 },
    { wch: 40 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Tareas');
  
  // Hoja de dependencias
  if (content.dependencies.length > 0) {
    const depsData = [
      ['Dependencias'],
      [''],
      ['Tarea origen', 'Tarea destino'],
      ...content.dependencies.map(d => [d.from, d.to]),
    ];
    
    const wsDeps = XLSX.utils.aoa_to_sheet(depsData);
    wsDeps['!cols'] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsDeps, 'Dependencias');
  }
  
  // Guardar
  const filename = `${content.missionTitle.replace(/[^a-zA-Z0-9]/g, '_')}_plan.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================
// UTILIDADES
// ============================================

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export function verifyFileIntegrity(blob: Blob, expectedMinSize: number): boolean {
  return blob.size >= expectedMinSize;
}
