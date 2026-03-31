import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader,
  X,
  Play,
  MoreVertical,
} from 'lucide-react';
import { ImportFile, FileSummary } from '../../types';

interface UploadStepProps {
  files: ImportFile[];
  onFilesAdded: (files: ImportFile[]) => void;
  onFileUpdated: (fileId: string, updates: Partial<ImportFile>) => void;
  onFileRemoved: (fileId: string) => void;
  onAnalyzeAll: () => void;
  isAnalyzing?: boolean;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  files,
  onFilesAdded,
  onFileUpdated,
  onFileRemoved,
  onAnalyzeAll,
  isAnalyzing = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type !== 'dragleave');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const processFiles = (fileList: File[]) => {
    const newFiles: ImportFile[] = fileList
      .filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ['xlsx', 'xls', 'pdf', 'csv'].includes(ext || '');
      })
      .map((file) => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.csv') ? 'csv' : 'excel',
        status: 'queued' as const,
        progress: 0,
      }));

    onFilesAdded(newFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.currentTarget.files || []);
    processFiles(fileList);
  };

  const getStatusIcon = (status: ImportFile['status']) => {
    switch (status) {
      case 'queued':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'analyzing':
        return <Loader size={16} className="text-cyan-500 animate-spin" />;
      case 'analyzed':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 transition-all ${
          dragActive
            ? 'border-cyan-400 bg-cyan-900 bg-opacity-20'
            : 'border-slate-700 bg-slate-900 bg-opacity-50 hover:border-slate-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.pdf,.csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-3">
          <img
            src="/ernesto-logo.png"
            alt="ERNESTO"
            className="h-20 w-20 object-contain rounded-full ring-2 ring-cyan-500/20 opacity-60"
          />
          <div className="text-center">
            <p className="text-slate-100 font-medium">
              Trascina qui i tuoi listini
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Excel, PDF o CSV —{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                oppure sfoglia
              </button>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Supported: Excel, PDF, CSV
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-slate-100 font-semibold">Files</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  selectedFile === file.id
                    ? 'border-cyan-500 bg-cyan-900 bg-opacity-20'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-750'
                } cursor-pointer transition-all`}
                onClick={() => setSelectedFile(file.id)}
              >
                {/* Icon */}
                <FileText size={20} className="text-slate-500 flex-shrink-0" />

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-slate-100 font-medium truncate">
                      {file.name}
                    </p>
                    {getStatusIcon(file.status)}
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {formatFileSize(file.size)} • {file.type.toUpperCase()}
                  </p>

                  {/* Progress Bar */}
                  {file.status === 'analyzing' && (
                    <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Summary Cards */}
                  {file.summary && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <div className="bg-slate-900 rounded px-2 py-1 text-center">
                        <p className="text-cyan-400 font-semibold text-sm">
                          {file.summary.carrier}
                        </p>
                        <p className="text-slate-500 text-xs">Carrier</p>
                      </div>
                      <div className="bg-slate-900 rounded px-2 py-1 text-center">
                        <p className="text-emerald-400 font-semibold text-sm">
                          {file.summary.zones}
                        </p>
                        <p className="text-slate-500 text-xs">Zones</p>
                      </div>
                      <div className="bg-slate-900 rounded px-2 py-1 text-center">
                        <p className="text-emerald-400 font-semibold text-sm">
                          {file.summary.prices}
                        </p>
                        <p className="text-slate-500 text-xs">Prices</p>
                      </div>
                      <div className="bg-slate-900 rounded px-2 py-1 text-center">
                        <p className="text-yellow-400 font-semibold text-sm">
                          {file.summary.confidence}%
                        </p>
                        <p className="text-slate-500 text-xs">Confidence</p>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {file.error && (
                    <p className="text-red-400 text-xs mt-2">{file.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemoved(file.id);
                    }}
                    className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Carrier Hints */}
          <div className="mt-4 space-y-3">
            <h4 className="text-slate-100 font-medium text-sm">Carrier Hints</h4>
            {files.map((file) => (
              <div key={file.id} className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm flex-shrink-0">
                  {file.name}:
                </span>
                <input
                  type="text"
                  placeholder="E.g., DHL, UPS, FedEx"
                  value={file.carrierHint || ''}
                  onChange={(e) =>
                    onFileUpdated(file.id, { carrierHint: e.target.value })
                  }
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze Button */}
      {files.length > 0 && (
        <button
          onClick={onAnalyzeAll}
          disabled={isAnalyzing || files.every((f) => f.status === 'analyzed')}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Play size={18} />
          <span>Analyze All Files</span>
        </button>
      )}
    </div>
  );
};
