import React, { useState } from 'react';
import { RevisionReport } from '../types';

interface GlobalHistoryProps {
  reports: RevisionReport[];
}

const GlobalHistory: React.FC<GlobalHistoryProps> = ({ reports }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter(report =>
    report.pedimentoNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Historial Global de Pedimentos</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por N° de Pedimento..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b">N° Pedimento</th>
              <th className="py-2 px-4 border-b">Revisor</th>
              <th className="py-2 px-4 border-b">Auditado En</th>
              <th className="py-2 px-4 border-b">Incidencias</th>
              <th className="py-2 px-4 border-b">Validación</th>
              <th className="py-2 px-4 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{report.pedimentoNumber}</td>
                <td className="py-2 px-4 border-b">{report.userName}</td>
                <td className="py-2 px-4 border-b">{new Date(report.timestamp).toLocaleString()}</td>
                <td className="py-2 px-4 border-b">{report.errors.length}</td>
                <td className="py-2 px-4 border-b">{report.isConforme ? 'Conforme' : 'No Conforme'}</td>
                <td className="py-2 px-4 border-b">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlobalHistory;