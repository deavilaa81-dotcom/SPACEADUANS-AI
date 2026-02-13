
import React, { useState } from 'react';
import { RevisionReport, PedimentoError } from '../types';

// Componente para el Modal de Detalle del Reporte
const ReportDetailModal: React.FC<{ report: RevisionReport, onClose: () => void }> = ({ report, onClose }) => {
  const stats = getErrorReportStats(report.errors);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-scaleIn">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Detalle de Auditoría</h3>
          <p className="text-sm text-slate-500">Pedimento: {report.pedimentoNumber}</p>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-600 mb-2">Resumen</h4>
              <p><strong>Revisor:</strong> {report.userName}</p>
              <p><strong>Fecha:</strong> {new Date(report.date).toLocaleString()}</p>
              <p><strong>Incidencias:</strong> {stats.total}</p>
              <p><strong>Resultado:</strong> <span className={`font-bold ${report.isConforme ? 'text-green-600' : 'text-red-600'}`}>{report.isConforme ? 'CONFORME' : 'NO CONFORME'}</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-600 mb-2">Estadísticas de Errores</h4>
              <p><strong>Campo con más errores:</strong> {stats.topField}</p>
              <p><strong>Error más frecuente:</strong> {stats.topError}</p>
            </div>
          </div>
          <div className="mt-6">
            <h4 className="font-bold text-slate-700 mb-3">Lista de Incidencias</h4>
            <div className="space-y-3">
              {report.errors.filter(e => e.status === 'error').length > 0 ? (
                report.errors.filter(e => e.status === 'error').map((error, index) => (
                  <div key={index} className="bg-red-50/50 p-3 rounded-lg border border-red-200 text-xs">
                    <p><strong>Campo:</strong> <span className="font-mono bg-red-100 px-1 rounded">{error.field}</span></p>
                    <p><strong>Error:</strong> {error.error}</p>
                    <p><strong>Valor Esperado:</strong> {error.expected}</p>
                    <p><strong>Valor Encontrado:</strong> {error.found}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No se encontraron incidencias en esta auditoría.</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-bold">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// Función auxiliar fuera del componente principal para que no se redeclare
const getErrorReportStats = (errors: PedimentoError[]) => {
  const errorList = errors.filter(e => e.status === 'error');
  if (errorList.length === 0) return { total: 0, topField: 'N/A', topError: 'N/A' };

  const fieldCounts: Record<string, number> = {};
  const errorCounts: Record<string, number> = {};

  errorList.forEach(e => {
    fieldCounts[e.field] = (fieldCounts[e.field] || 0) + 1;
    errorCounts[e.error] = (errorCounts[e.error] || 0) + 1;
  });

  const topField = Object.entries(fieldCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const topError = Object.entries(errorCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

  return { total: errorList.length, topField, topError };
};

const GlobalHistory: React.FC<GlobalHistoryProps> = ({ reports }) => {
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [selectedReport, setSelectedReport] = useState<RevisionReport | null>(null);

  const filteredReports = reports.filter(r => r.date.startsWith(filterMonth));

  const downloadCSV = () => {
    // ... (la función CSV se mantiene igual)
  };

  const downloadWordDoc = (report: RevisionReport) => {
    const stats = getErrorReportStats(report.errors);
    const errorsHtml = report.errors.filter(e => e.status === 'error').map(e => 
      `<div style="border:1px solid #FECACA; background-color:#FEF2F2; padding:10px; margin-bottom:10px; border-radius:5px;">
        <p><b>Campo:</b> ${e.field}</p>
        <p><b>Error:</b> ${e.error}</p>
        <p><b>Valor Esperado:</b> ${e.expected}</p>
        <p><b>Valor Encontrado:</b> ${e.found}</p>
      </div>`
    ).join('') || '<p>No se encontraron incidencias.</p>';

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Reporte de Auditoria</title></head>
        <body>
            <h1>Reporte de Auditoría de Pedimento</h1>
            <p><b>Número de Pedimento:</b> ${report.pedimentoNumber}</p>
            <p><b>Revisado por:</b> ${report.userName}</p>
            <p><b>Fecha:</b> ${new Date(report.date).toLocaleString()}</p>
            <h2>Resultado: <span style="color:${report.isConforme ? 'green' : 'red'};">${report.isConforme ? 'CONFORME' : 'NO CONFORME'}</span></h2>
            <hr/>
            <h3>Detalle de Incidencias (${stats.total})</h3>
            ${errorsHtml}
            <hr/>
            <h3>Recomendaciones de IA</h3>
            <p>${report.recommendations || 'N/A'}</p>
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_${report.pedimentoNumber}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
        {/* ... (Cabecera y filtros se mantienen igual) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b">
                <th className="px-6 py-5">N° Pedimento</th>
                <th className="px-6 py-5">Revisor</th>
                <th className="px-6 py-5">Auditado en</th>
                <th className="px-6 py-5 text-center">Incidencias</th>
                <th className="px-6 py-5 text-center">Validación</th>
                <th className="px-6 py-5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((r) => {
                  const stats = getErrorReportStats(r.errors);
                  const date = new Date(r.date);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700 text-sm">{r.pedimentoNumber}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{r.userName}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black ${stats.total > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {stats.total}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${r.isConforme ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.isConforme ? 'CONFORME' : 'NO CONFORME'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => setSelectedReport(r)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => downloadWordDoc(r)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
      {selectedReport && <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </>
  );
};

export default GlobalHistory;
