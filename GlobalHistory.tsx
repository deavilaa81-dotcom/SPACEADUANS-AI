
import React, { useState } from 'react';
import { RevisionReport, PedimentoError } from '../types';

interface GlobalHistoryProps {
  reports: RevisionReport[];
}

const GlobalHistory: React.FC<GlobalHistoryProps> = ({ reports }) => {
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  const filteredReports = reports.filter(r => r.date.startsWith(filterMonth));

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

  const downloadCSV = () => {
    const headers = [
      "Numero de Pedimento",
      "Nombre del Elaborador",
      "Fecha",
      "Hora",
      "Total de Errores",
      "Campo con Mas Errores",
      "Error Mas Frecuente",
      "Estatus Final",
      "Mitigacion (IA)"
    ];

    const rows = filteredReports.map(r => {
      const stats = getErrorReportStats(r.errors);
      const dateObj = new Date(r.date);
      return [
        r.pedimentoNumber,
        r.userName,
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        stats.total,
        stats.topField,
        stats.topError,
        r.isConforme ? "CONFORME" : "NO CONFORME",
        r.recommendations || "N/A"
      ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Mensual_SpaceAduanas_${filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Historial Global de Auditoría</h2>
          <p className="text-xs text-slate-500 font-medium">Control mensual de cumplimiento normativo por agente revisor.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <input 
            type="month" 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={downloadCSV}
            className="flex items-center px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar XLS (CSV)
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b">
              <th className="px-6 py-5">N° Pedimento</th>
              <th className="px-6 py-5">Revisor</th>
              <th className="px-6 py-5">Auditado en</th>
              <th className="px-6 py-5 text-center">Incidencias</th>
              <th className="px-6 py-5">Campo Crítico</th>
              <th className="px-6 py-5 text-center">Validación Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm font-medium italic">
                  No se registran revisiones para el periodo {filterMonth}.
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => {
                const stats = getErrorReportStats(r.errors);
                const date = new Date(r.date);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-6 font-mono font-bold text-blue-700 text-sm">{r.pedimentoNumber}</td>
                    <td className="px-6 py-6">
                      <p className="text-sm font-bold text-slate-800">{r.userName}</p>
                    </td>
                    <td className="px-6 py-6 text-[11px] text-slate-500 font-medium">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{date.toLocaleDateString()}</span>
                        <span>{date.toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black shadow-sm ${stats.total > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                        {stats.total}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-xs font-bold text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">{stats.topField}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                       {/* Contenedor con altura suficiente para la rotación del sello */}
                       <div className="flex justify-center items-center py-4 min-w-[160px]">
                        <span className={`stamp text-[10px] py-1.5 px-4 ${r.isConforme ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                          {r.isConforme ? 'CONFORME' : 'NO CONFORME'}
                        </span>
                       </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlobalHistory;
