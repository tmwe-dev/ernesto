import React, { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { Message, MessageAction } from '../../types';

interface ChatPanelProps {
  messages: Message[];
  onSend: (message: string) => void;
  isTyping?: boolean;
  phase?: 'upload' | 'workspace' | 'preview' | 'confirm' | 'result';
  actions?: MessageAction[];
}

const getActionColor = (type: MessageAction['type']) => {
  switch (type) {
    case 'kb_saved':
      return 'bg-blue-900 text-blue-200';
    case 'memory_promoted':
      return 'bg-purple-900 text-purple-200';
    case 'conflict_detected':
      return 'bg-orange-900 text-orange-200';
    case 'warning':
      return 'bg-red-900 text-red-200';
    default:
      return 'bg-slate-800 text-slate-200';
  }
};

const getActionIcon = (type: MessageAction['type']) => {
  switch (type) {
    case 'kb_saved':
      return <CheckCircle2 size={14} />;
    case 'memory_promoted':
      return <Zap size={14} />;
    case 'conflict_detected':
      return <AlertCircle size={14} />;
    case 'warning':
      return <AlertCircle size={14} />;
  }
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSend,
  isTyping = false,
  phase,
  actions = [],
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleFileClick = () => {
    setFileInputKey(prev => prev + 1);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files?.[0]) {
      const fileName = files[0].name;
      setInput(prev => (prev ? `${prev}\n📎 ${fileName}` : `📎 ${fileName}`));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p className="text-center">
              <span className="text-sm">
                No messages yet. Start by asking a question about your pricelist.
              </span>
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-cyan-900 text-cyan-100'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Action Badges */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.actions.map((action, idx) => (
                    <div
                      key={idx}
                      className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getActionColor(action.type)}`}
                    >
                      {getActionIcon(action.type)}
                      <span>{action.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-end gap-3">
            <img
              src="/ernesto-working.gif"
              alt="Ernesto sta lavorando..."
              className="h-16 w-16 object-contain rounded-lg"
            />
            <div className="bg-slate-800 text-slate-100 px-4 py-2 rounded-lg">
              <p className="text-xs text-cyan-400 font-medium mb-1">Ernesto sta analizzando...</p>
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {/* Action Badges Row */}
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

        {/* Input Field */}
        <div className="flex space-x-2">
          <input
            type="file"
            key={fileInputKey}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.xlsx,.csv"
          />
          <button
            onClick={handleFileClick}
            className="flex-shrink-0 p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            title="Attach file"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about the pricelist..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 p-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
