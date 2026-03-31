import React, { useState } from 'react';
import { Layout } from '../components/common/Layout';
import { ChatPanel } from '../components/common/ChatPanel';
import { useImportStore } from '../stores/importStore';
import { Message } from '../types';

export const ImportPage: React.FC = () => {
  const store = useImportStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ciao! Sono ERNESTO. Carica un listino prezzi (XLSX, CSV, PDF) e lo analizzerò per te. Puoi anche scrivermi o parlarmi direttamente.',
      timestamp: new Date(),
    },
  ]);
  const [fileContext, setFileContext] = useState<string>('');

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
  };

  const handleAIResponse = (response: string) => {
    const aiMessage: Message = {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aggiungi messaggio utente
    const userMsg: Message = {
      id: `upload_${Date.now()}`,
      role: 'user',
      content: `📎 Caricato: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Leggi file come base64 per contesto
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      setFileContext(`File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}. Contenuto (primi 10000 chars base64): ${base64.substring(0, 10000)}`);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  return (
    <Layout currentPage="import">
      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar upload */}
        <div className="w-80 border-r border-slate-800 p-4 space-y-4 flex-shrink-0 bg-slate-950/50">
          <h2 className="text-lg font-semibold text-slate-100">Import Listini</h2>
          <p className="text-xs text-slate-400">Carica un file listino prezzi per iniziare l'analisi AI.</p>

          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors bg-slate-900/50">
            <div className="text-center">
              <p className="text-2xl mb-2">📁</p>
              <p className="text-sm text-slate-400">Clicca per caricare</p>
              <p className="text-xs text-slate-500 mt-1">XLSX, CSV, PDF</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={handleFileUpload}
            />
          </label>

          <div className="text-xs text-slate-500 space-y-1">
            <p>💡 <strong>Suggerimenti:</strong></p>
            <p>• Puoi anche allegare file direttamente nella chat</p>
            <p>• Parla con il microfono per descrivere il listino</p>
            <p>• ERNESTO impara dalle tue correzioni</p>
          </div>
        </div>

        {/* Chat principale */}
        <div className="flex-1">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            onAIResponse={handleAIResponse}
            systemPrompt={`Sei ERNESTO, un assistente AI specializzato nell'analisi di listini prezzi per spedizioni e logistica.
Il tuo compito è aiutare l'utente a:
1. Analizzare listini prezzi caricati (XLSX, CSV, PDF)
2. Identificare corriere, zone, fasce di peso, tariffe, supplementi
3. Validare dati e segnalare anomalie
4. Importare i dati nel sistema

Rispondi SEMPRE in italiano. Sii preciso e professionale.
Se l'utente carica un file, analizzalo in dettaglio.`}
            fileContext={fileContext}
          />
        </div>
      </div>
    </Layout>
  );
};
