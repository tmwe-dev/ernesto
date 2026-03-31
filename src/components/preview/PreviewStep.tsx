import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, Play, ArrowLeft } from 'lucide-react';
import { ChatPanel } from '../common/ChatPanel';
import { Message, ImportData, ImportWarning } from '../../types';

interface PreviewStepProps {
  data: ImportData | null;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  onDryRun?: () => void;
  onBack?: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  data,
  messages,
  onSendMessage,
  isTyping = false,
  onDryRun,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'zones' | 'prices' | 'supplements'>(
    'zones'
  );
  const [warningsExpanded, setWarningsExpanded] = useState(true);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>No data to preview</p>
      </div>
    );
  }

  const getWarningColor = (severity: ImportWarning['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-900 text-red-100 border-red-700';
      case 'warning':
        return 'bg-yellow-900 text-yellow-100 border-yellow-700';
      case 'info':
        return 'bg-blue-900 text-blue-100 border-blue-700';
    }
  };

  const errorCount = data.warnings.filter((w) => w.severity === 'error').length;
  const warningCount = data.warnings.filter(
    (w) => w.severity === 'warning'
  ).length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-slate-800 rounded p-3 text-center">
          <p className="text-slate-400 text-xs">Zones</p>
          <p className="text-emerald-400 font-semibold text-lg">
            {data.zones.length}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-3 text-center">
          <p className="text-slate-400 text-xs">Prices</p>
          <p className="text-emerald-400 font-semibold text-lg">
            {data.prices.length}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-3 text-center">
          <p className="text-slate-400 text-xs">Supplements</p>
          <p className="text-emerald-400 font-semibold text-lg">
            {data.supplements.length}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-3 text-center">
          <p className="text-slate-400 text-xs">Warnings</p>
          <p className="text-yellow-400 font-semibold text-lg">
            {warningCount}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-3 text-center">
          <p className="text-slate-400 text-xs">Errors</p>
          <p className="text-red-400 font-semibold text-lg">{errorCount}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left - Data Viewer */}
        <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 flex flex-col overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-800 bg-slate-800 bg-opacity-50">
            {['zones', 'prices', 'supplements'].map((tab) => (
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
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'zones' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-300 font-semibold">
                        Country
                      </th>
                      <th className="px-3 py-2 text-left text-slate-300 font-semibold">
                        Zone
                      </th>
                      <th className="px-3 py-2 text-left text-slate-300 font-semibold">
                        Label
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {data.zones.map((zone, idx) => (
                      <tr key={idx} className="hover:bg-slate-800">
                        <td className="px-3 py-2 text-slate-300">
                          {zone.country_iso}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {zone.zone_number}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {zone.zone_label}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'prices' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr>
                      <th className="px-2 py-2 text-left text-slate-300 font-semibold border border-slate-700">
                        Weight (kg)
                      </th>
                      {data.zones.slice(0, 6).map((zone, idx) => (
                        <th
                          key={idx}
                          className="px-2 py-2 text-center text-slate-300 font-semibold border border-slate-700"
                        >
                          Z{zone.zone_number}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {Array.from(
                      new Set(data.prices.map((p) => p.weight))
                    ).map((weight, idx) => (
                      <tr key={idx} className="hover:bg-slate-800">
                        <td className="px-2 py-2 text-slate-300 font-medium border border-slate-700">
                          {weight}
                        </td>
                        {data.zones.slice(0, 6).map((zone, zIdx) => {
                          const price = data.prices.find(
                            (p) =>
                              p.weight === weight && p.zone_id === zone.country_iso
                          );
                          return (
                            <td
                              key={zIdx}
                              className="px-2 py-2 text-center text-slate-300 border border-slate-700"
                            >
                              {price ? (
                                <span className="bg-emerald-900 text-emerald-100 px-2 py-1 rounded text-xs font-semibold">
                                  {price.price.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'supplements' && (
              <div className="space-y-2">
                {data.supplements.length > 0 ? (
                  data.supplements.map((supp, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 rounded p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-slate-100 font-medium">{supp.name}</p>
                        <p className="text-slate-500 text-xs">{supp.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-semibold">
                          {supp.value}
                          {supp.calc_type === 'percentage' ? '%' : ''}
                        </p>
                        <p className="text-slate-500 text-xs capitalize">
                          {supp.calc_type}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic">
                    No supplements defined
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right - Chat Panel */}
        <div className="w-96">
          <ChatPanel
            messages={messages}
            onSend={onSendMessage}
            isTyping={isTyping}
            phase="preview"
          />
        </div>
      </div>

      {/* Warnings Panel */}
      {data.warnings.length > 0 && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <button
            onClick={() => setWarningsExpanded(!warningsExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle size={18} className="text-yellow-500" />
              <span className="font-semibold text-slate-100">
                {data.warnings.length} Issues Found
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform ${
                warningsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {warningsExpanded && (
            <div className="p-3 border-t border-slate-800 space-y-2 max-h-40 overflow-y-auto">
              {data.warnings.map((warning) => (
                <div
                  key={warning.id}
                  className={`p-2 rounded text-xs border ${getWarningColor(warning.severity)}`}
                >
                  <p className="font-semibold">{warning.message}</p>
                  {warning.field && (
                    <p className="opacity-80 mt-1">Field: {warning.field}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-100 font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to Workspace</span>
        </button>
        <button
          onClick={onDryRun}
          className="flex-1 flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors text-white font-semibold py-2"
        >
          <Play size={16} />
          <span>Run Dry Run</span>
        </button>
      </div>
    </div>
  );
};
