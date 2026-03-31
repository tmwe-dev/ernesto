import React, { useState } from 'react';
import { BookOpen, RefreshCw, ArrowRight, Eye } from 'lucide-react';
import { ChatPanel } from '../common/ChatPanel';
import { Message, ImportData } from '../../types';

interface WorkspaceStepProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  data: ImportData | null;
  aiReport: string;
  kbRulesCount?: number;
  onBuildMapping?: () => void;
  onReanalyze?: () => void;
  onPreview?: () => void;
}

export const WorkspaceStep: React.FC<WorkspaceStepProps> = ({
  messages,
  onSendMessage,
  isTyping = false,
  data,
  aiReport,
  kbRulesCount = 0,
  onBuildMapping,
  onReanalyze,
  onPreview,
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'data' | 'sheets'>(
    'report'
  );

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Chat (60%) */}
      <div className="w-3/5">
        <ChatPanel
          messages={messages}
          onSend={onSendMessage}
          isTyping={isTyping}
          phase="workspace"
        />
      </div>

      {/* Right Panel - Tabs (40%) */}
      <div className="w-2/5 flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-800 bg-opacity-50">
          {['report', 'data', 'sheets'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className="prose prose-invert max-w-none text-sm text-slate-300">
                {aiReport ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: aiReport.replace(/\n/g, '<br />'),
                    }}
                  />
                ) : (
                  <p className="text-slate-500 italic">
                    Analysis report will appear here...
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              {data && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-400 text-xs">Carrier</p>
                      <p className="text-slate-100 font-semibold">
                        {data.carrier}
                      </p>
                    </div>
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-400 text-xs">Service</p>
                      <p className="text-slate-100 font-semibold">
                        {data.serviceName}
                      </p>
                    </div>
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-400 text-xs">Zones</p>
                      <p className="text-emerald-400 font-semibold">
                        {data.zones.length}
                      </p>
                    </div>
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-400 text-xs">Prices</p>
                      <p className="text-emerald-400 font-semibold">
                        {data.prices.length}
                      </p>
                    </div>
                  </div>

                  {/* Zones Table */}
                  <div className="mt-4">
                    <h4 className="text-slate-100 font-semibold text-sm mb-2">
                      Zones
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-800">
                            <th className="px-2 py-1 text-left text-slate-300">
                              Country
                            </th>
                            <th className="px-2 py-1 text-left text-slate-300">
                              Zone
                            </th>
                            <th className="px-2 py-1 text-left text-slate-300">
                              Label
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.zones.slice(0, 5).map((zone, idx) => (
                            <tr
                              key={idx}
                              className="border-t border-slate-700 hover:bg-slate-800"
                            >
                              <td className="px-2 py-1 text-slate-300">
                                {zone.country_iso}
                              </td>
                              <td className="px-2 py-1 text-slate-300">
                                {zone.zone_number}
                              </td>
                              <td className="px-2 py-1 text-slate-300">
                                {zone.zone_label}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.zones.length > 5 && (
                        <p className="text-slate-500 text-xs mt-2 text-center">
                          +{data.zones.length - 5} more zones
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Supplements */}
                  {data.supplements.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-slate-100 font-semibold text-sm mb-2">
                        Supplements
                      </h4>
                      <div className="space-y-1">
                        {data.supplements.slice(0, 3).map((supp, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs bg-slate-800 p-2 rounded"
                          >
                            <span className="text-slate-300">
                              {supp.name} ({supp.code})
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              {supp.value}
                              {supp.calc_type === 'percentage' ? '%' : ''}
                            </span>
                          </div>
                        ))}
                        {data.supplements.length > 3 && (
                          <p className="text-slate-500 text-xs mt-2 text-center">
                            +{data.supplements.length - 3} more supplements
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'sheets' && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 italic text-sm">
                Sheet previews not available yet
              </p>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div className="border-t border-slate-800 p-3 space-y-2 bg-slate-800 bg-opacity-50">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <BookOpen size={14} />
            <span>{kbRulesCount} KB rules applied</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onReanalyze}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-slate-100 text-sm font-medium"
            >
              <RefreshCw size={14} />
              <span>Re-analyze</span>
            </button>
            <button
              onClick={onPreview}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors text-white text-sm font-medium"
            >
              <Eye size={14} />
              <span>Preview Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
