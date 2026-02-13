
import React, { useState, useMemo, useEffect } from 'react';
// import { runAudit } from '../services/geminiService'; // Desactivado para el plan gratuito
import { PedimentoError, RevisionReport, User, FileContent, AppNotification } from '../types';

interface ReviewerProps {
  user: User;
  onSaveReport: (report: RevisionReport) => void;
  onAuditChange?: (result: any) => void;
  notifications?: AppNotification[];
}

// Mock function para reemplazar runAudit en plan gratuito
const runAudit = (files: any, onProgress: any) => new Promise((resolve, reject) => {
  reject(new Error("La auditoría con IA no está disponible en el plan gratuito."));
});

const Reviewer: React.FC<ReviewerProps> = ({ user, onSaveReport, onAuditChange, notifications = [] }) => {
  const [includeCertInAudit, setIncludeCertInAudit] = useState(false);
  const [showIndependentCertModule, setShowIndependentCertModule] = useState(false);
  const [clientOverride, setClientOverride] = useState(false);

  // Estados ahora como Arreglos para soportar multi-upload
  const [pedimentoFiles, setPedimentoFiles] = useState<FileContent[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<FileContent[]>([]);
  const [certInAuditFiles, setCertInAuditFiles] = useState<FileContent[]>([]);
  const [coveFiles, setCoveFiles] = useState<FileContent[]>([]);
  const [soloCertFiles, setSoloCertFiles] = useState<FileContent[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const activeSupport = useMemo(() => 
    notifications.find(n => n.userEmail === user.email && n.status === 'in_progress' && n.auditData),
    [notifications, user.email]
  );

  useEffect(() => {
    if (activeSupport && activeSupport.auditData) {
      setResult(activeSupport.auditData);
      setClientOverride(activeSupport.auditData.clientOverride || false);
    }
  }, [activeSupport]);

  useEffect(() => {
    if (onAuditChange && result) {
      onAuditChange({ ...result, clientOverride });
    }
  }, [result, clientOverride, onAuditChange]);

  const isActuallyConforme = clientOverride || (result && result.validations && result.validations.length > 0
    ? result.validations.every((v: any) => v.status === 'correct')
    : result ? true : false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'pedimento' | 'invoice' | 'cert-audit' | 'cert-solo' | 'cove') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        const b64 = resultString.split(',')[1];
        const mimeType = file.type || 'application/octet-stream';
        const newFile = { data: b64, mimeType, name: file.name };

        if (type === 'pedimento') setPedimentoFiles(prev => [...prev, newFile]);
        else if (type === 'cert-audit') setCertInAuditFiles(prev => [...prev, newFile]);
        else if (type === 'cert-solo') setSoloCertFiles(prev => [...prev, newFile]);
        else if (type === 'cove') setCoveFiles(prev => [...prev, newFile]);
        else setInvoiceFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
  };

  const clearFiles = (type: string) => {
    if (type === 'pedimento') setPedimentoFiles([]);
    else if (type === 'invoice') setInvoiceFiles([]);
    else if (type === 'cove') setCoveFiles([]);
    else if (type === 'cert-audit') setCertInAuditFiles([]);
    else if (type === 'cert-solo') setSoloCertFiles([]);
  };

  const executeAnalysis = async (mode: 'audit' | 'independent-cert') => {
    if (mode === 'audit' && pedimentoFiles.length === 0) { setErrorMsg("Se requiere al menos un archivo de Pedimento."); return; }
    if (mode === 'independent-cert' && soloCertFiles.length === 0) { setErrorMsg("Por favor, carga el certificado de origen."); return; }

    setAnalyzing(true);
    setResult(null);
    setErrorMsg(null);
    setClientOverride(false);
    setProgress(0);
    setProgressMessage("");

    const onProgress = (progress: number, message: string) => {
      setProgress(progress);
      setProgressMessage(message);
    }

    try {
      const filesToAudit = [
        ...pedimentoFiles,
        ...invoiceFiles,
        ...(includeCertInAudit ? certInAuditFiles : []),
        ...coveFiles,
        ...soloCertFiles
      ].map(f => ({ name: f.name, content: f.data }));

      const analysis: any = await runAudit(filesToAudit, onProgress);

      if (analysis) {
        setResult(analysis);
        
        const report: RevisionReport = {
          id: Math.random().toString(36).substr(2, 9),
          pedimentoNumber: analysis.numero_pedimento || 'AUDITORIA_EXTERNAL',
          userName: user.name,
          date: new Date().toISOString(),
          errors: analysis.validations || [],
          isConforme: analysis.statusGeneral === 'CONFORME',
          recommendations: analysis.recommendations,
          totalSavings: analysis.ahorroPotencial,
          totalRisk: analysis.riesgoTotal
        };
        onSaveReport(report);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-report');
    if (!element) return;
    setIsDownloading(true);
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `DICTAMEN_SPACE_${result.pedimentoNumber || 'AUDITORIA'}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', windowWidth: 1200 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => setIsDownloading(false)).catch(() => setIsDownloading(false));
  };

  const handleDownloadWord = () => {
    const element = document.getElementById('printable-report');
    if (!element) return;
    setIsDownloadingWord(true);
    try {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 20px; } table { border-collapse: collapse; width: 100%; margin-bottom: 25px; border: 1px solid #000; } th { background-color: #f1f5f9; border: 1px solid #000; padding: 10px; font-weight: bold; text-transform: uppercase; font-size: 8pt; } td { border: 1px solid #000; padding: 10px; font-size: 8pt; vertical-align: middle; } .stamp { border: 4px solid; padding: 10px 15px; font-weight: 900; display: inline-block; text-transform: uppercase; } .bg-red { background-color: #fef2f2; } .text-red { color: #dc2626; font-weight: bold; } .text-green { color: #16a34a; font-weight: bold; } .bg-dark { background-color: #0f172a; color: #ffffff; padding: 20px; }</style></head><body>";
      const footer = "</body></html>";
      const contentClone = element.cloneNode(true) as HTMLElement;
      contentClone.querySelectorAll('.no-print, [data-html2canvas-ignore]').forEach(el => el.remove());
      const stamps = contentClone.querySelectorAll('.stamp');
      stamps.forEach(s => {
          const isConf = s.textContent?.includes('CONFORME') && !s.textContent?.includes('NO');
          (s as HTMLElement).style.border = '4px solid ' + (isConf ? '#16a34a' : '#dc2626');
          (s as HTMLElement).style.color = isConf ? '#16a34a' : '#dc2626';
          (s as HTMLElement).style.padding = '10px';
          (s as HTMLElement).style.fontWeight = '900';
          (s as HTMLElement).style.display = 'inline-block';
          (s as HTMLElement).style.transform = 'rotate(-10deg)';
      });
      const sourceHTML = header + contentClone.innerHTML + footer;
      const blob = new Blob(['﻿', sourceHTML], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DICTAMEN_SPACE_${result.pedimentoNumber || 'AUDITORIA'}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); } finally { setIsDownloadingWord(false); }
  };

  const Switch = ({ enabled, setEnabled, label }: { enabled: boolean, setEnabled: (v: boolean) => void, label: string }) => (
    <div className="flex flex-col items-center space-y-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter text-center h-8 flex items-center">{label}</span>
      <button type="button" onClick={() => setEnabled(!enabled)} className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-300'}`}>
        <span className={`absolute left-1.5 text-[8px] font-black text-white ${enabled ? 'opacity-100' : 'opacity-0'} transition-opacity`}>ON</span>
        <span className={`absolute right-1.5 text-[8px] font-black text-slate-500 ${!enabled ? 'opacity-100' : 'opacity-0'} transition-opacity`}>OFF</span>
        <span className={`${enabled ? 'translate-x-9' : 'translate-x-1'} inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md`} />
      </button>
    </div>
  );

  const FileCard = ({ label, count, onUpload, onClear, type, color = 'slate' }: { label: string, count: number, onUpload: (e: any) => void, onClear: () => void, type: string, color?: 'slate' | 'blue' }) => (
    <div className={`p-4 border ${color === 'blue' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'} rounded-2xl relative group transition-all`}>
      <div className="flex justify-between items-center mb-2">
        <label className={`block text-[10px] font-black uppercase ${color === 'blue' ? 'text-blue-500' : 'text-slate-400'}`}>{label}</label>
        {count > 0 && (
          <button onClick={onClear} className="text-[8px] font-bold text-red-500 hover:underline">LIMPIAR</button>
        )}
      </div>
      
      <div className="relative">
        <input 
          type="file" 
          multiple 
          accept=".pdf" 
          onChange={onUpload} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        <div className={`w-full py-2 px-3 border-2 border-dashed rounded-xl flex items-center justify-between transition-colors ${count > 0 ? 'border-blue-400 bg-white shadow-sm' : 'border-slate-300 group-hover:border-slate-400'}`}>
           <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">
             {count > 0 ? `${count} archivos seleccionados` : 'Elegir archivos'}
           </span>
           <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${count > 0 ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" />
           </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      {activeSupport && (
        <div className="max-w-4xl mx-auto bg-indigo-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between no-print">
          <div className="flex items-center space-x-3 px-4">
             <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
             <p className="text-[11px] font-black uppercase tracking-widest italic">Sesión de Soporte en Vivo • Admin Ajustando Reporte</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between no-print">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Motor Space-Flash v3</p>
            <p className="text-sm font-bold text-slate-800 italic">Validación Masiva de Partidas</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
           <Switch enabled={includeCertInAudit} setEnabled={setIncludeCertInAudit} label="Auditoría Integral" />
           <div className="w-[1px] h-12 bg-slate-100"></div>
           <Switch enabled={showIndependentCertModule} setEnabled={setShowIndependentCertModule} label="Módulo Externo" />
        </div>
      </div>

      {!showIndependentCertModule && (
        <div className="max-w-7xl mx-auto no-print">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-6 text-slate-800 uppercase tracking-tight">Carga Multidocumental (Hasta 30 archivos por panel)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FileCard label="Pedimentos" count={pedimentoFiles.length} onUpload={(e) => handleFileUpload(e, 'pedimento')} onClear={() => clearFiles('pedimento')} type="pedimento" />
              <FileCard label="Facturas" count={invoiceFiles.length} onUpload={(e) => handleFileUpload(e, 'invoice')} onClear={() => clearFiles('invoice')} type="invoice" />
              <FileCard label="COVE" count={coveFiles.length} onUpload={(e) => handleFileUpload(e, 'cove')} onClear={() => clearFiles('cove')} type="cove" />
              {includeCertInAudit && (
                <FileCard label="Certificado" count={certInAuditFiles.length} onUpload={(e) => handleFileUpload(e, 'cert-audit')} onClear={() => clearFiles('cert-audit')} type="cert-audit" color="blue" />
              )}
            </div>
            {errorMsg && <p className="mt-4 text-xs font-bold text-red-600">{errorMsg}</p>}
            <button disabled title="Actualiza a un plan superior para usar esta función" className="w-full mt-6 py-5 text-white font-black text-[12px] tracking-[0.2em] rounded-2xl shadow-lg bg-slate-400 cursor-not-allowed">
              INICIAR AUDITORÍA (FUNCIÓN PREMIUM)
            </button>
          </div>
        </div>
      )}

      {showIndependentCertModule && (
        <div className="max-w-4xl mx-auto no-print">
           <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-dashed border-blue-200 text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Auditoría Independiente de Certificados</h2>
              <div className="max-w-md mx-auto mb-6">
                <FileCard label="Certificados de Origen" count={soloCertFiles.length} onUpload={(e) => handleFileUpload(e, 'cert-solo')} onClear={() => clearFiles('cert-solo')} type="cert-solo" color="blue" />
              </div>
              <button disabled title="Actualiza a un plan superior para usar esta función" className="px-12 py-4 text-white font-black text-[12px] tracking-[0.2em] rounded-2xl shadow-xl bg-slate-400 cursor-not-allowed">
                AUDITAR CERTIFICADOS (FUNCIÓN PREMIUM)
              </button>
           </div>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-slideUp">
          <div data-html2canvas-ignore className="max-w-[1200px] mx-auto flex justify-end gap-3 no-print px-4">
            <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center space-x-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl">
              <span>PDF</span>
            </button>
            <button onClick={handleDownloadWord} disabled={isDownloadingWord} className="flex items-center space-x-3 px-8 py-4 bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl">
              <span>WORD</span>
            </button>
          </div>

          <div id="printable-report" className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-[1200px] mx-auto p-10 print:p-5">
            <div className="border-b-2 border-slate-900 pb-6 mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-1">REPORTE TÉCNICO DE AUDITORÍA SPACE-AI</h1>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] text-slate-600 font-bold uppercase">
                  <p>REFERENCIA: <span className="font-mono text-slate-900 font-bold">{result.pedimentoNumber || 'EXT-AUDIT'}</span></p>
                  <p>FECHA: <span>{new Date().toLocaleString()}</span></p>
                  <p>AUDITOR: <span className="text-slate-900">{user.name}</span></p>
                  <p>ESTATUS: <span className={isActuallyConforme ? 'text-green-600' : 'text-red-600'}>{isActuallyConforme ? 'CONFORME' : 'NO CONFORME'}</span></p>
                </div>
              </div>
              <div className="text-right">
                <div className={`stamp text-[12px] px-6 py-2 ${isActuallyConforme ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                  {isActuallyConforme ? 'CONFORME' : 'NO CONFORME'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="text-slate-900 text-[9px] uppercase font-black tracking-widest border-b border-slate-900 bg-slate-50">
                    <th className="px-4 py-2 w-[22%]">CAMPO / PARTIDA</th>
                    <th className="px-4 py-2 text-center w-[12%]">ESTATUS</th>
                    <th className="px-4 py-2 w-[35%]">OBSERVACIÓN TÉCNICA</th>
                    <th className="px-4 py-2 text-center w-[20%]">VALOR CORRECTO</th>
                    <th className="px-4 py-2 text-right w-[10%]">RIESGO</th>
                    <th className="px-4 py-2 text-right text-green-700 w-[10%]">AHORRO</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] divide-y divide-slate-100">
                  {result.validations?.map((v: PedimentoError, idx: number) => {
                    const isError = v.status === 'error';
                    return (
                      <tr key={idx} className={isError ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {v.partida && <span className="mr-1">[{v.partida}]</span>}
                          {v.field}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black uppercase text-[8px] px-2 py-1 rounded border ${
                              v.status === 'correct' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-600 text-white border-red-700 shadow-sm'
                            }`}>
                            {v.status === 'correct' ? 'CUMPLE' : 'ERROR'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 italic font-medium leading-tight">{v.error}</td>
                        <td className="px-4 py-3 text-center font-mono text-blue-800 font-bold">
                          <div className="bg-blue-50/50 p-1.5 rounded-lg border border-blue-100 italic text-[9px]">{v.correctValue || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-red-600">{isError ? (v.potentialFine || '$0.00') : '$0.00'}</td>
                        <td className="px-4 py-3 text-right font-mono font-black text-green-600">{!isError ? (v.savings || '$0.00') : '$0.00'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-slate-900 p-6 rounded-2xl text-white relative">
              <h3 className="text-[9px] font-black uppercase mb-2 text-blue-400 tracking-widest">Dictamen Final SpaceAduanas</h3>
              <p className="text-[10px] leading-snug italic border-l-2 border-blue-500 pl-4 opacity-90">{result.recommendations}</p>
            </div>
            
            <div className="mt-4 text-[7px] text-slate-400 text-center font-bold uppercase tracking-widest">
              Dictamen generado por Motor Space-Flash v3 • Software de Cumplimiento Normativo ©
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviewer;
