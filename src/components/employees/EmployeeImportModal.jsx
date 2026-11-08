import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useEmployees } from '../../context/EmployeeContext.jsx';

export default function EmployeeImportModal({ isOpen, onClose, onImportSuccess }) {
  const { isEmployeeIdTaken, isEmailTaken } = useEmployees();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [validationStats, setValidationStats] = useState(null);
  const [isDryRunSuccess, setIsDryRunSuccess] = useState(false);
  const [parseError, setParseError] = useState('');

  if (!isOpen) return null;

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csvHeader = 'employeeId,firstName,lastName,email,phone,department,designation,joiningDate,employmentType,status,reportingManager\n';
    const sampleRows = [
      'EMP-201,Michael,Scott,michael.scott@company.internal,+1-555-0101,Operations,Regional Manager,2025-01-10,Full-Time,Active,Sarah Jenkins',
      'EMP-202,Pam,Beesly,pam.beesly@company.internal,+1-555-0102,Product,Product Designer,2025-03-15,Full-Time,Active,David Chen',
      'EMP-203,Jim,Halpert,jim.halpert@company.internal,+1-555-0103,Sales,Account Executive,2025-04-01,Full-Time,Active,Michael Scott',
    ].join('\n');

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'hcm_lite_employees_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV content
  const parseCSVText = (text) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParseError('The uploaded file must contain a header row and at least one employee data row.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    // Track within-CSV duplicates
    const seenIdsInBatch = new Set();
    const seenEmailsInBatch = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex handling quoted comma values
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const rowObj = {};
      headers.forEach((header, idx) => {
        let val = values[idx] || '';
        val = val.trim().replace(/^"|"$/g, '');
        rowObj[header] = val;
      });

      // Basic validation rules
      const rowErrors = [];
      const empId = (rowObj.employeeId || '').toUpperCase();
      const email = (rowObj.email || '').toLowerCase();
      const firstName = rowObj.firstName || '';
      const lastName = rowObj.lastName || '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!empId) {
        rowErrors.push('Missing Employee ID');
      } else if (seenIdsInBatch.has(empId)) {
        rowErrors.push(`Duplicate ID "${empId}" in CSV file`);
      } else if (isEmployeeIdTaken(empId)) {
        rowErrors.push(`ID "${empId}" already exists in company directory`);
      } else {
        seenIdsInBatch.add(empId);
      }

      if (!firstName) rowErrors.push('Missing First Name');
      if (!lastName) rowErrors.push('Missing Last Name');

      if (!email) {
        rowErrors.push('Missing Email');
      } else if (!emailRegex.test(email)) {
        rowErrors.push('Invalid email format');
      } else if (seenEmailsInBatch.has(email)) {
        rowErrors.push(`Duplicate email "${email}" in CSV file`);
      } else if (isEmailTaken(email)) {
        rowErrors.push(`Email "${email}" already registered in directory`);
      } else {
        seenEmailsInBatch.add(email);
      }

      rows.push({
        rowNumber: i + 1,
        data: {
          employeeId: empId,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          email,
          phone: rowObj.phone || '',
          department: rowObj.department || 'General',
          designation: rowObj.designation || 'Staff',
          joiningDate: rowObj.joiningDate || new Date().toISOString().split('T')[0],
          employmentType: rowObj.employmentType || 'Full-Time',
          status: rowObj.status || 'Active',
          reportingManager: rowObj.reportingManager || '',
        },
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    }

    const validCount = rows.filter((r) => r.isValid).length;
    const invalidCount = rows.length - validCount;

    setParsedRows(rows);
    setValidationStats({
      total: rows.length,
      valid: validCount,
      invalid: invalidCount,
    });
    setParseError('');
    setIsDryRunSuccess(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        parseCSVText(text);
      }
    };
    reader.readAsText(file);
  };

  // Dry run / validate only
  const handleDryRun = () => {
    if (!parsedRows.length) return;
    setIsDryRunSuccess(true);
  };

  // Confirm import of valid rows only
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid).map((r) => r.data);
    if (!validRows.length) {
      alert('No valid employee rows to import.');
      return;
    }

    onImportSuccess(validRows, validationStats);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div>
            <h2 id="import-modal-title" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Import Employee Directory via CSV</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bulk-enroll employees into the active session with format and duplicate checking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Informative notice */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Client-Side Batch Parsing:</strong> CSV processing executes strictly in your browser session without storing files to any remote server. Only verified, non-duplicate rows will be added to the directory state.
            </div>
          </div>

          {/* Upload and Template Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-indigo-950 block">Need the standard column schema?</span>
              <span className="text-[11px] text-slate-500">Download our pre-structured template with required header columns.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* File Picker Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-indigo-600 mx-auto mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 block">
              {fileName ? fileName : 'Choose CSV File or drag and drop'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Accepts RFC 4180 standard comma-separated `.csv` files
            </span>
          </div>

          {parseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Validation Stats Strip */}
          {validationStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Rows</span>
                  <span className="text-lg font-bold font-mono text-slate-900">{validationStats.total}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[11px] text-emerald-700 uppercase tracking-wider block">Valid Rows</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">{validationStats.valid}</span>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                  <span className="text-[11px] text-red-700 uppercase tracking-wider block">Invalid Rows</span>
                  <span className="text-lg font-bold font-mono text-red-800">{validationStats.invalid}</span>
                </div>
              </div>

              {isDryRunSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Dry Run Complete:</strong> {validationStats.valid} record(s) ready for import. {validationStats.invalid} record(s) skipped due to errors. No data was modified.
                  </span>
                </div>
              )}

              {/* Preview Table */}
              <div>
                <div className="text-xs font-semibold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Batch Preview ({parsedRows.length} records parsed)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Shows first 10 rows</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Emp ID</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50/50' : 'bg-red-50/40'}>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                Error
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-slate-800">{row.data.employeeId || '—'}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{row.data.fullName || '—'}</td>
                          <td className="py-2 px-3 text-slate-600">{row.data.email || '—'}</td>
                          <td className="py-2 px-3 text-slate-600">{row.data.department || '—'}</td>
                          <td className="py-2 px-3 text-red-600 max-w-xs truncate">
                            {row.errors.length > 0 ? row.errors.join('; ') : 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!parsedRows.length}
              onClick={handleDryRun}
              className="px-4 py-2 text-xs font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 border border-indigo-200 rounded-xl transition-colors"
            >
              Dry Run / Validate Only
            </button>
            <button
              type="button"
              disabled={!validationStats || validationStats.valid === 0}
              onClick={handleConfirmImport}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Confirm Import ({validationStats ? validationStats.valid : 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
