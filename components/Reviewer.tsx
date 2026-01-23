
import React, { useState, useMemo, useEffect } from 'react';
import { analyzePedimento } from '../services/geminiService';
import { PedimentoError, RevisionReport, User, FileContent, AppNotification } from '../types';

interface ReviewerProps {
  user: User;
  onSaveReport: (report: RevisionReport) => void;
  onAuditChange?: (result: any) => void;
  notifications?: AppNotification[];
}

const Reviewer: React.FC<ReviewerProps> = ({ user, onSaveReport, onAuditChange, notifications = [] }) => {
  const [includeCertInAudit, setIncludeCertInAudit] = useState(false);
  const [showIndependentCertModule, setShowIndependentCertModule] = useState(false);
  const [clientOverride, setClientOverride] = useState(false);

  const [pedimentoFile, setPedimentoFile] = useState<FileContent | null>(null);
  const [invoiceFiles, setInvoiceFiles] = useState<FileContent[]>([]);
  const [certInAuditFile, setCertInAuditFile] = useState<FileContent | null>(null);
  const [coveFile, setCoveFile] = useState<FileContent | null>(null);
  const [soloCertFile, setSoloCertFile] = useState<FileContent | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronización con cambios del Administrador
  useEffect(() => {
    const activeSupport = notifications.find(n => n.userEmail === user.email && n.status === 'in_progress' && n.auditData);
    if (activeSupport && activeSupport.auditData) {
      setResult(activeSupport.auditData);
      setClientOverride(activeSupport.auditData.clientOverride || false);
    }
  }, [notifications, user.email]);

  // Notificar al padre cada vez que cambie el resultado o el override
  useEffect(() => {
    if (onAuditChange && result) {
      onAuditChange({ ...result, clientOverride });
    }
  }, [result, clientOverride, onAuditChange]);

  const parseCurrency = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const totals = useMemo(() => {
    if (!result || !result.validations) return { risk: 0, savings: 0 };
    let risk = 0;
    let savings = 0;
    result.validations.forEach((v: PedimentoError) => {
      if (v.status === 'error') {
        risk += parseCurrency(v.potentialFine);
      } else {
        savings += parseCurrency(v.savings);
      }
    });
    return { risk, savings };
  }, [result]);

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
        if (type === 'pedimento') setPedimentoFile({ data: b64, mimeType });
        else if (type === 'cert-audit') setCertInAuditFile({ data: b64, mimeType });
        else if (type === 'cert-solo') setSoloCertFile({ data: b64, mimeType });
        else if (type === 'cove') setCoveFile({ data: b64, mimeType });
        else setInvoiceFiles(prev => [...prev, { data: b64, mimeType }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const executeAnalysis = async (mode: 'audit' | 'independent-cert') => {
    if (mode === 'audit' && !pedimentoFile) { setErrorMsg("El Pedimento es obligatorio."); return; }
    if (mode === 'independent-cert' && !soloCertFile) { setErrorMsg("Por favor, carga el certificado de origen."); return; }

    setAnalyzing(true);
    setResult(null);
    setErrorMsg(null);
    setClientOverride(false);

    try {
      const analysis = await analyzePedimento(
        mode === 'audit' ? pedimentoFile : null,
        mode === 'audit' ? invoiceFiles : [],
        mode === 'audit' ? (includeCertInAudit ? certInAuditFile : null) : soloCertFile,
        mode === 'audit' ? coveFile : null
      );
      if (analysis) {
        setResult(analysis);
        
        // Registrar el reporte en el historial global automáticamente
        const report: RevisionReport = {
          id: Math.random().toString(36).substr(2, 9),
          pedimentoNumber: analysis.pedimentoNumber || 'AUDITORIA_EXTERNAL',
          userName: user.name,
          date: new Date().toISOString(),
          errors: analysis.validations || [],
          isConforme: analysis.isConforme,
          recommendations: analysis.recommendations,
          totalSavings: analysis.totalSavings,
          totalRisk: analysis.totalRisk
        };
        onSaveReport(report);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualCorrection = (index: number) => {
    if (!user.isSuperUser) return;
    setResult((prev: any) => {
      const newValidations = [...prev.validations];
      const target = newValidations[index];
      if (target.status === 'error') {
        target.status = 'correct';
        target.isManuallyCorrected = true;
      } else {
        target.status = 'error';
        target.isManuallyCorrected = false;
      }
      return { ...prev, validations: newValidations };
    });
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-report');
    if (!element) return;
    setIsDownloading(true);
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `DICTAMEN_SPACE_${result.pedimentoNumber || 'AUDITORIA'}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        backgroundColor: '#ffffff',
        windowWidth: 1200
      },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => setIsDownloading(false)).catch(() => setIsDownloading(false));
  };

  const Switch = ({ enabled, setEnabled, label }: { enabled: boolean, setEnabled: (v: boolean) => void, label: string }) => (
    <div className="flex flex-col items-center space-y-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter text-center h-8 flex items-center">{label}</span>
      <button 
        type="button"
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-300'}`}
      >
        <span className={`absolute left-1.5 text-[8px] font-black text-white ${enabled ? 'opacity-100' : 'opacity-0'} transition-opacity`}>ON</span>
        <span className={`absolute right-1.5 text-[8px] font-black text-slate-500 ${!enabled ? 'opacity-100' : 'opacity-0'} transition-opacity`}>OFF</span>
        <span className={`${enabled ? 'translate-x-9' : 'translate-x-1'} inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md`} />
      </button>
    </div>
  );

  const activeSupport = notifications.find(n => n.userEmail === user.email && n.status === 'in_progress');

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      {activeSupport && (
        <div className="max-w-4xl mx-auto bg-indigo-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-slideUp no-print">
          <div className="flex items-center space-x-3 px-4">
             <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
             <p className="text-[11px] font-black uppercase tracking-widest italic">Sesión de Soporte Técnico en Vivo • El Administrador puede ajustar tu reporte</p>
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
            <p className="text-sm font-bold text-slate-800 italic">Validación de Partidas</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
           <Switch enabled={includeCertInAudit} setEnabled={setIncludeCertInAudit} label="Auditoría Integral" />
           <div className="w-[1px] h-12 bg-slate-100"></div>
           <Switch enabled={showIndependentCertModule} setEnabled={setShowIndependentCertModule} label="Módulo Externo" />
        </div>
      </div>

      {/* Carga de Archivos - Auditoría Estándar */}
      {!showIndependentCertModule && (
        <div className="max-w-7xl mx-auto no-print">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-6 text-slate-800 uppercase tracking-tight">Carga Multidocumental</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Pedimento</label>
                <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'pedimento')} className="w-full text-[10px]" />
              </div>
              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Facturas</label>
                <input type="file" multiple accept=".pdf" onChange={(e) => handleFileUpload(e, 'invoice')} className="w-full text-[10px]" />
              </div>
              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">COVE</label>
                <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'cove')} className="w-full text-[10px]" />
              </div>
              {includeCertInAudit && (
                <div className="p-4 border border-blue-200 rounded-2xl bg-blue-50/30">
                  <label className="block text-[10px] font-black text-blue-500 uppercase mb-2">Certificado</label>
                  <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'cert-audit')} className="w-full text-[10px]" />
                </div>
              )}
            </div>
            {errorMsg && <p className="mt-4 text-xs font-bold text-red-600 animate-shake">{errorMsg}</p>}
            <button onClick={() => executeAnalysis('audit')} disabled={analyzing} className={`w-full mt-6 py-5 text-white font-black text-[12px] tracking-[0.2em] rounded-2xl shadow-lg transition-all ${analyzing ? 'bg-blue-900 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {analyzing ? 'TRIANGULANDO...' : 'INICIAR AUDITORÍA'}
            </button>
          </div>
        </div>
      )}

      {/* Carga de Archivos - Módulo Externo (Solo Certificado) */}
      {showIndependentCertModule && (
        <div className="max-w-4xl mx-auto no-print">
           <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-dashed border-blue-200 text-center">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Auditoría Independiente de Certificado</h2>
              <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">Sube el Certificado de Origen para verificar el cumplimiento del Anexo 5-A de las Reglas del T-MEC.</p>
              
              <div className="max-w-md mx-auto p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 text-left">Archivo del Certificado (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'cert-solo')} className="w-full text-xs" />
                {soloCertFile && (
                  <div className="mt-3 flex items-center text-[10px] text-green-600 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Archivo cargado correctamente
                  </div>
                )}
              </div>

              {errorMsg && <p className="mb-4 text-xs font-bold text-red-600 animate-shake">{errorMsg}</p>}

              <button 
                onClick={() => executeAnalysis('independent-cert')} 
                disabled={analyzing} 
                className={`px-12 py-4 text-white font-black text-[12px] tracking-[0.2em] rounded-2xl shadow-xl transition-all ${analyzing ? 'bg-indigo-900 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
              >
                {analyzing ? 'ANALIZANDO CERTIFICADO...' : 'AUDITAR CERTIFICADO'}
              </button>
           </div>
        </div>
      )}

      {/* Reporte Final */}
      {result && (
        <div className="space-y-6 animate-slideUp">
          <div data-html2canvas-ignore className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 no-print px-4">
            
            {user.isSuperUser ? (
              <div className="flex items-center space-x-6 bg-orange-100 p-4 rounded-3xl border border-orange-200 shadow-sm flex-1">
                <div className="p-2 bg-orange-500 text-white rounded-xl shadow-md">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Autorización Excepcional</p>
                  <p className="text-xs font-bold text-slate-700 italic">¿Activar Check por Instrucción de Cliente? (Fuerza CONFORME)</p>
                </div>
                <button onClick={() => setClientOverride(!clientOverride)} className={`w-14 h-8 rounded-full transition-all relative ${clientOverride ? 'bg-orange-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${clientOverride ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            ) : (
              <div className="flex-1"></div>
            )}

            <button onClick={handleDownloadPDF} disabled={isDownloading} className={`flex items-center space-x-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl ${isDownloading ? 'bg-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
              {isDownloading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
              <span>{isDownloading ? 'GENERANDO...' : 'Descargar Dictamen (PDF)'}</span>
            </button>
          </div>

          <div id="printable-report" className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-[1200px] mx-auto p-10 print:p-5">
            <div className="border-b-2 border-slate-900 pb-6 mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-1">REPORTE TÉCNICO DE AUDITORÍA SPACE-AI</h1>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] text-slate-600 font-bold uppercase">
                  <p>REFERENCIA: <span className="font-mono text-blue-700 bg-blue-50 px-2 rounded">{result.pedimentoNumber || 'EXT-AUDIT'}</span></p>
                  <p>FECHA: <span>{new Date().toLocaleString()}</span></p>
                  <p>AUDITOR: <span className="text-slate-900">{user.name}</span></p>
                  <p>ESTATUS: <span className={isActuallyConforme ? 'text-green-600' : 'text-red-600'}>{isActuallyConforme ? 'CONFORME' : 'NO CONFORME'}</span></p>
                </div>
              </div>
              <div className="text-right">
                <div className={`stamp text-[12px] px-6 py-2 ${isActuallyConforme ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                  {isActuallyConforme ? 'CONFORME' : 'NO CONFORME'}
                </div>
                {clientOverride && <p className="text-[7px] font-black text-orange-600 mt-1 uppercase italic">* POR INSTRUCCIÓN DE CLIENTE</p>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="text-slate-900 text-[9px] uppercase font-black tracking-widest border-b border-slate-900 bg-slate-50">
                    <th className="px-4 py-2 w-[18%]">CAMPO / PARTIDA</th>
                    <th className="px-4 py-2 text-center w-[12%]">ESTATUS</th>
                    <th className="px-4 py-2 w-[35%]">OBSERVACIÓN TÉCNICA</th>
                    <th className="px-4 py-2 text-center w-[25%]">VALOR CORRECTO</th>
                    <th className="px-4 py-2 text-right w-[10%]">RIESGO</th>
                    <th className="px-4 py-2 text-right text-green-700 w-[10%]">AHORRO</th>
                    {user.isSuperUser && <th data-html2canvas-ignore className="px-2 py-2 text-center w-[10%] no-print">CORREGIR</th>}
                  </tr>
                </thead>
                <tbody className="text-[10px] divide-y divide-slate-100">
                  {result.validations?.map((v: PedimentoError, idx: number) => {
                    const hasForbiddenChars = v.partida && /[*/\-!"#$%&/()?¡¨*ñÑ\[\[_]/.test(v.partida);
                    const isError = v.status === 'error';
                    return (
                      <tr key={idx} className={isError ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {v.partida && <span className={`mr-1 ${hasForbiddenChars ? 'text-red-600 underline decoration-wavy' : ''}`}>[{v.partida}]</span>}
                          {v.field}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black uppercase text-[8px] px-2 py-1 rounded border transition-all ${
                              v.status === 'correct' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-600 text-white border-red-700 shadow-sm'
                            }`}>
                            {v.status === 'correct' ? (v.isManuallyCorrected ? 'MANUAL' : 'CUMPLE') : 'ERROR'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 italic font-medium leading-tight">
                          {v.error}
                          {hasForbiddenChars && <p className="text-[7px] text-red-600 font-black mt-1 uppercase">Caracteres Prohibidos</p>}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-blue-800 font-bold">
                          <div className="bg-blue-50/50 p-1.5 rounded-lg border border-blue-100 italic text-[9px]">{v.correctValue || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black">
                           <span className={isError ? 'text-red-600' : 'text-slate-400'}>
                              {isError ? (v.potentialFine || '$0.00') : '$0.00'}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-green-600">
                           {!isError ? (v.savings || '$0.00') : '$0.00'}
                        </td>
                        {user.isSuperUser && (
                          <td data-html2canvas-ignore className="px-2 py-3 text-center no-print">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={v.status === 'correct'} onChange={() => handleManualCorrection(idx)} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600 transition-colors"></div>
                            </label>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-2xl text-center shadow-sm">
                <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-1">Ahorro Preventivo</p>
                <p className="text-2xl font-black text-green-800 font-mono italic">
                  ${totals.savings.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </p>
              </div>
              <div className={`p-4 rounded-2xl text-center border transition-all shadow-sm ${totals.risk > 0 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                <p className="text-[9px] font-black text-red-700 uppercase tracking-widest mb-1">Riesgo Económico</p>
                <p className="text-2xl font-black text-red-800 font-mono italic">
                  ${totals.risk.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </p>
              </div>
            </div>

            <div className="mt-6 bg-slate-900 p-6 rounded-2xl text-white relative">
              <h3 className="text-[9px] font-black uppercase mb-2 text-blue-400 tracking-widest">Dictamen Final SpaceAduanas</h3>
              <p className="text-[10px] leading-snug italic border-l-2 border-blue-500 pl-4 opacity-90">{result.recommendations}</p>
              {clientOverride && <p className="text-[8px] font-black text-orange-400 mt-2 uppercase tracking-tighter">* DOCUMENTO AUTORIZADO MEDIANTE OVERRIDE DE CLIENTE. SE IGNORAN INCIDENCIAS TÉCNICAS.</p>}
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
