import React, { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Mic, MicOff, Volume2, VolumeX, Settings2, AlertCircle, CheckCircle2, Zap, BookOpen, Brain, Search } from 'lucide-react';
import { Message, MessageAction, ChatAction } from '../../types';
import { sendToAI, loadChat } from '../../lib/ai-service';
import { textToSpeech, startSpeechRecognition, fetchVoices, PRESET_VOICES, ElevenLabsVoice } from '../../lib/elevenlabs-service';

interface ChatPanelProps {
  messages: Message[];
  onSend: (message: string) => void;
  onAIResponse?: (response: string, actions?: ChatAction[], documentId?: string, jobId?: string) => void;
  isTyping?: boolean;
  phase?: 'upload' | 'workspace' | 'preview' | 'confirm' | 'result';
  actions?: MessageAction[];
  systemPrompt?: string;
  fileContext?: string;
  carrierHint?: string;
  jobId?: string;
  documentId?: string;
}

const getActionColor = (type: string) => {
  switch (type) {
    case 'kb_saved':
    case 'kb_rule_saved':
    case 'kb_rule_updated':
      return 'bg-blue-900 text-blue-200';
    case 'memory_promoted':
    case 'memory_saved':
      return 'bg-purple-900 text-purple-200';
    case 'memory_search':
      return 'bg-indigo-900 text-indigo-200';
    case 'document_updated':
      return 'bg-emerald-900 text-emerald-200';
    case 'attachment_saved':
      return 'bg-teal-900 text-teal-200';
    case 'conflict_detected':
      return 'bg-orange-900 text-orange-200';
    case 'warning':
    case 'error':
      return 'bg-red-900 text-red-200';
    default:
      return 'bg-slate-800 text-slate-200';
  }
};

const getActionIcon = (type: string) => {
  switch (type) {
    case 'kb_saved':
    case 'kb_rule_saved':
    case 'kb_rule_updated':
      return <BookOpen size={14} />;
    case 'memory_promoted':
    case 'memory_saved':
      return <Brain size={14} />;
    case 'memory_search':
      return <Search size={14} />;
    case 'document_updated':
    case 'attachment_saved':
      return <CheckCircle2 size={14} />;
    case 'conflict_detected':
      return <AlertCircle size={14} />;
    case 'warning':
    case 'error':
      return <AlertCircle size={14} />;
    default:
      return <Zap size={14} />;
  }
};

/** Converte ChatAction (dalla edge function) in MessageAction (per il rendering) */
function chatActionsToMessageActions(chatActions: ChatAction[]): MessageAction[] {
  return chatActions
    .filter(a => (a.type as string) !== 'error' || !a.success)
    .map(a => {
      let label = '';
      switch (a.type) {
        case 'kb_rule_saved':
          label = `KB: ${a.rule?.title || 'Regola salvata'}`;
          break;
        case 'kb_rule_updated':
          label = `KB aggiornata: ${a.rule?.title || ''}`;
          break;
        case 'memory_saved':
          label = `Memoria: ${a.memory?.title || 'Salvata'}`;
          break;
        case 'memory_promoted':
          label = `Promossa: ${a.memory?.title || ''}`;
          break;
        case 'memory_search':
          label = `Ricerca: ${(a.results as unknown[])?.length || 0} risultati`;
          break;
        case 'document_updated':
          label = `Doc aggiornato: ${a.change || ''}`;
          break;
        case 'attachment_saved':
          label = `Allegato: ${a.file_name || 'Salvato'}`;
          break;
        case 'conflict_detected':
          label = `Conflitto: ${a.conflict?.type || ''}`;
          break;
        case 'error':
          label = `Errore: ${a.error || ''}`;
          break;
        default:
          label = a.message || a.type;
      }

      // Map to MessageAction type
      let actionType: MessageAction['type'] = 'kb_saved';
      if (a.type.startsWith('memory')) actionType = 'memory_promoted';
      if (a.type === 'conflict_detected') actionType = 'conflict_detected';
      if (a.type === 'error' || (a.type as string) === 'warning') actionType = 'warning';

      return { type: actionType, label, metadata: a as unknown as Record<string, unknown> };
    });
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSend,
  onAIResponse,
  isTyping = false,
  phase,
  actions = [],
  systemPrompt,
  fileContext,
  carrierHint,
  jobId,
  documentId,
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('HuK8QKF35exsCh2e7fLT');
  const [voices, setVoices] = useState<ElevenLabsVoice[]>(PRESET_VOICES);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load previous chat messages when documentId/jobId is available
  useEffect(() => {
    if (!jobId) return;
    loadChat(jobId).then(res => {
      if (res.content && !res.error) {
        try {
          const loaded = JSON.parse(res.content);
          if (Array.isArray(loaded) && loaded.length > 0) {
            setChatHistory(loaded.map((m: any) => ({ role: m.role, content: m.content })));
          }
        } catch { /* not JSON, ignore */ }
      }
    }).catch(() => {});
  }, [jobId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, aiLoading]);

  useEffect(() => {
    fetchVoices().then(({ voices: v }) => setVoices(v));
  }, []);

  const handleSend = async () => {
    if (!input.trim() || aiLoading) return;

    const userText = input.trim();
    setInput('');
    onSend(userText);

    // Chiama AI via edge function
    setAiLoading(true);
    const history = [...chatHistory, { role: 'user' as const, content: userText }];
    setChatHistory(history);

    const response = await sendToAI(
      history,
      systemPrompt,
      fileContext,
      carrierHint,
      jobId,
      documentId,
    );
    setAiLoading(false);

    const aiText = response.error
      ? `⚠️ ${response.error}`
      : response.content;

    setChatHistory([...history, { role: 'assistant', content: aiText }]);

    if (onAIResponse) {
      onAIResponse(aiText, response.actions, response.document_id, response.job_id);
    }

    // TTS se abilitato
    if (ttsEnabled && !response.error) {
      playTTS(aiText);
    }
  };

  const playTTS = async (text: string) => {
    const truncated = text.length > 5000 ? text.substring(0, 5000) + '...' : text;
    setIsPlaying(true);

    const { audioUrl, error } = await textToSpeech(truncated, selectedVoice);

    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audio.play().catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
      if (error) console.warn('TTS error:', error);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const toggleRecording = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

    const rec = startSpeechRecognition(
      (text) => {
        setInput(prev => prev ? `${prev} ${text}` : text);
        setIsRecording(false);
        recognitionRef.current = null;
      },
      (error) => {
        console.warn('STT error:', error);
        setIsRecording(false);
        recognitionRef.current = null;
      },
      'it-IT'
    );

    if (rec) {
      recognitionRef.current = rec;
      setIsRecording(true);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || '';
        setInput(prev => prev ? `${prev}\n📎 ${file.name}` : `📎 ${file.name}\nAnalizza questo file.`);
      };
      reader.readAsDataURL(file);
    }
    e.currentTarget.value = '';
  };

  const italianVoices = voices.filter(v => v.language === 'it');
  const englishVoices = voices.filter(v => v.language === 'en');
  const otherVoices = voices.filter(v => v.language !== 'it' && v.language !== 'en');

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-cyan-400">ERNESTO AI</span>
          {jobId && (
            <span className="text-[10px] text-slate-600 font-mono">job:{jobId.slice(0, 8)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isPlaying) stopAudio();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`p-1.5 rounded text-xs transition-colors ${ttsEnabled ? 'bg-cyan-900/50 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
            title={ttsEnabled ? 'Disattiva voce' : 'Attiva voce'}
          >
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded text-xs transition-colors ${showSettings ? 'bg-cyan-900/50 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
            title="Impostazioni voce"
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Voce ElevenLabs</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500"
            >
              {italianVoices.length > 0 && (
                <optgroup label="🇮🇹 Italiano">
                  {italianVoices.map(v => (
                    <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
                  ))}
                </optgroup>
              )}
              {englishVoices.length > 0 && (
                <optgroup label="🇬🇧 English">
                  {englishVoices.map(v => (
                    <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
                  ))}
                </optgroup>
              )}
              {otherVoices.length > 0 && (
                <optgroup label="🌍 Altre lingue">
                  {otherVoices.map(v => (
                    <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const voice = voices.find(v => v.voiceId === selectedVoice);
                if (voice?.previewUrl) {
                  const a = new Audio(voice.previewUrl);
                  a.play();
                } else {
                  playTTS('Ciao, sono Ernesto. Come posso aiutarti oggi?');
                }
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors"
            >
              ▶ Anteprima voce
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p className="text-center text-sm">
              Ciao! Sono ERNESTO. Scrivi o parla per iniziare.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-cyan-900 text-cyan-100'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.actions.map((action, idx) => (
                    <div
                      key={idx}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium ${getActionColor(action.type)}`}
                    >
                      {getActionIcon(action.type)}
                      <span>{action.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {message.role === 'assistant' && ttsEnabled && (
                <button
                  onClick={() => playTTS(message.content)}
                  className="mt-1 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  🔊 Riascolta
                </button>
              )}

              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {(isTyping || aiLoading) && (
          <div className="flex justify-start items-end gap-3">
            <div className="bg-slate-800 text-slate-100 px-4 py-2 rounded-lg">
              <p className="text-xs text-cyan-400 font-medium mb-1">Ernesto sta pensando...</p>
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {isPlaying && (
          <div className="flex justify-start">
            <button
              onClick={stopAudio}
              className="px-3 py-1.5 bg-cyan-900/30 border border-cyan-800 rounded-lg text-xs text-cyan-300 hover:bg-cyan-900/50 transition-colors flex items-center gap-2"
            >
              <Volume2 size={12} className="animate-pulse" />
              Parlando... (clicca per fermare)
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 ${getActionColor(action.type)}`}
              >
                {getActionIcon(action.type)}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv"
          />
          <button
            onClick={handleFileClick}
            className="flex-shrink-0 p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            title="Allega file"
          >
            <Paperclip size={18} />
          </button>
          <button
            onClick={toggleRecording}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-900/50 text-red-400 animate-pulse'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isRecording ? 'Ferma registrazione' : 'Parla'}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isRecording ? 'Sto ascoltando...' : 'Scrivi a Ernesto...'}
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isRecording}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || aiLoading}
            className="flex-shrink-0 p-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
            title="Invia"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export { chatActionsToMessageActions };
