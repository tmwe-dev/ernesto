import React, { useState, useRef } from 'react';
import { Layout } from '../components/common/Layout';
import { ChatPanel } from '../components/common/ChatPanel';
import { Message } from '../types';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { ERNESTO_SYSTEM_PROMPT } from '../lib/ai-service';

const CARRIERS = [
  'DHL Express', 'UPS', 'FedEx', 'TNT', 'GLS', 'BRT', 'SDA',
  'Poste Italiane', 'DPD', 'GEODIS', 'DB Schenker', 'Altro',
];

interface UploadedFile {
  file: File;
  base64: string;
  carrierHint: string;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error';
}

export const ImportPage: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'analyze'>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [carrierHint, setCarrierHint] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileContext, setFileContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['xlsx', 'xls', 'xlsm', 'csv', 'pdf'];
    if (!validExts.includes(ext)) {
      alert('Formato non supportato. Usa: XLSX, XLS, CSV, PDF');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      setUploadedFile({ file, base64, carrierHint, status: 'uploaded' });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const startAnalysis = () => {
    if (!uploadedFile) return;

    const updated = { ...uploadedFile, carrierHint, status: 'analyzing' as const };
    setUploadedFile(updated);

    const ctx = [
      `FILE CARICATO: ${uploadedFile.file.name}`,
      `Dimensione: ${(uploadedFile.file.size / 1024).toFixed(0)} KB`,
      `Tipo: ${uploadedFile.file.type || uploadedFile.file.name.split('.').pop()}`,
      carrierHint ? `Corriere indicato: ${carrierHint}` : 'Corriere: da identificare',
      '',
      `Contenuto file (base64, primi 30000 chars):`,
      uploadedFile.base64.substring(0, 30000),
    ].join('\n');

    setFileContext(ctx);

    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `Ho ricevuto il file **${uploadedFile.file.name}** (${(uploadedFile.file.size / 1024).toFixed(0)} KB).${carrierHint ? ` Corriere indicato: **${carrierHint}**.` : ''}\n\nSto per analizzarlo. Chiedi pure qualsiasi cosa sul listino, oppure scrivi "analizza" per iniziare l'analisi completa.`,
      timestamp: new Date(),
    };

    setMessages([welcomeMsg]);
    setStep('analyze');
  };

  const resetImport = () => {
    setStep('upload');
    setUploadedFile(null);
    setCarrierHint('');
    setMessages([]);
    setFileContext('');
  };

  const handleSendMessage = (content: string) => {
    const msg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleAIResponse = (response: string) => {
    const msg: Message = {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls', 'xlsm', 'csv'].includes(ext || ''))
      return <FileSpreadsheet size={32} className="text-emerald-400" />;
    return <FileText size={32} className="text-red-400" />;
  };

  // ── STEP 1: Upload ──
  if (step === 'upload') {
    return (
      <Layout>
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Import Listino</h1>
            <p className="text-slate-400 mt-1">
              Carica un listino prezzi da un corriere. ERNESTO lo analizzerà e preparerà i dati per il TMS.
            </p>
          </div>

          {/* Carrier selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <label className="block text-sm font-medium text-slate-300">
              Corriere (opzionale — ERNESTO lo identificherà dal file)
            </label>
            <div className="flex flex-wrap gap-2">
              {CARRIERS.map(c => (
                <button
                  key={c}
                  onClick={() => setCarrierHint(carrierHint === c ? '' : c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    carrierHint === c
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-cyan-400 bg-cyan-900/20'
                : uploadedFile
                  ? 'border-emerald-600 bg-emerald-900/10'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.xlsm,.csv,.pdf"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />

            {uploadedFile ? (
              <div className="flex flex-col items-center gap-3">
                {getFileIcon(uploadedFile.file.name)}
                <p className="text-slate-100 font-medium">{uploadedFile.file.name}</p>
                <p className="text-xs text-slate-500">
                  {(uploadedFile.file.size / 1024).toFixed(0)} KB — Clicca per cambiare file
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={40} className="text-slate-600" />
                <p className="text-slate-300 font-medium">
                  Trascina qui il listino oppure clicca per selezionare
                </p>
                <p className="text-xs text-slate-500">
                  Formati: XLSX, XLS, CSV, PDF — Max 10 MB
                </p>
              </div>
            )}
          </div>

          {/* Start button */}
          {uploadedFile && (
            <button
              onClick={startAnalysis}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white font-semibold transition-colors"
            >
              Analizza con ERNESTO
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </Layout>
    );
  }

  // ── STEP 2: Analyze (AI Workspace) ──
  return (
    <Layout>
      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar info */}
        <div className="w-72 border-r border-slate-800 p-4 space-y-4 flex-shrink-0 bg-slate-950/50 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">File caricato</h2>
            <button onClick={resetImport} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300" title="Nuovo import">
              <X size={14} />
            </button>
          </div>

          {uploadedFile && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                {getFileIcon(uploadedFile.file.name)}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{uploadedFile.file.name}</p>
                  <p className="text-xs text-slate-500">{(uploadedFile.file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              {carrierHint && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Corriere:</span>
                  <span className="text-xs font-medium text-cyan-400">{carrierHint}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Suggerimenti</h3>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p>• Scrivi <strong className="text-cyan-400">"analizza"</strong> per l'analisi completa</p>
              <p>• Chiedi <strong className="text-cyan-400">"quante zone ci sono?"</strong></p>
              <p>• Chiedi <strong className="text-cyan-400">"estrai i supplementi"</strong></p>
              <p>• Chiedi <strong className="text-cyan-400">"proponi il mapping TMS"</strong></p>
              <p>• Usa il <strong className="text-cyan-400">microfono</strong> per parlare</p>
              <p>• Puoi <strong className="text-cyan-400">allegare altri file</strong> dalla chat</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Fasi analisi</h3>
            <div className="space-y-2">
              {[
                'Identificazione corriere',
                'Estrazione zone',
                'Tabella prezzi',
                'Supplementi',
                'Mapping TMS',
              ].map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700">
                    <span className="text-[8px] text-slate-500">{i + 1}</span>
                  </div>
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat AI */}
        <div className="flex-1">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            onAIResponse={handleAIResponse}
            systemPrompt={ERNESTO_SYSTEM_PROMPT}
            fileContext={fileContext}
          />
        </div>
      </div>
    </Layout>
  );
};
