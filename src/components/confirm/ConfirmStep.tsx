import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Check } from 'lucide-react';
import { ChatPanel } from '../common/ChatPanel';
import { Message, ImportData } from '../../types';

interface ConfirmStepProps {
  data: ImportData | null;
  pricelistName: string;
  onPricelistNameChange: (name: string) => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  onCommit?: () => void;
  onBack?: () => void;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  data,
  pricelistName,
  onPricelistNameChange,
  messages,
  onSendMessage,
  isTyping = false,
  onCommit,
  onBack,
}) => {
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [serviceType, setServiceType] = useState<'existing' | 'new'>('existing');
  const [serviceName, setServiceName] = useState('');

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>No data to confirm</p>
      </div>
    );
  }

  const errorCount = data.warnings.filter((w) => w.severity === 'error').length;
  const canCommit = errorCount === 0 && pricelistName.trim().length > 0;

  return (
    <div className="flex gap-4 h-full">
      {/* Left - Summary */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Summary Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
          <h3 className="text-slate-100 font-semibold">Import Summary</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 rounded p-2">
              <p className="text-slate-400 text-xs">Carrier</p>
              <p className="text-slate-100 font-semibold">{data.carrier}</p>
            </div>
            <div className="bg-slate-900 rounded p-2">
              <p className="text-slate-400 text-xs">Service Name</p>
              <p className="text-slate-100 font-semibold">{data.serviceName}</p>
            </div>
            <div className="bg-slate-900 rounded p-2">
              <p className="text-slate-400 text-xs">Zoning Type</p>
              <p className="text-slate-100 font-semibold capitalize">
                {data.zoningType}
              </p>
            </div>
            <div className="bg-slate-900 rounded p-2">
              <p className="text-slate-400 text-xs">Currency</p>
              <p className="text-slate-100 font-semibold">{data.currency}</p>
            </div>
            <div className="bg-slate-900 rounded p-2">
              <p className="text-slate-400 text-xs">Total Zones</p>
              <p className="text-emerald-400 font-semibold">{data.zones.length}</p>
            </div>
            <div className="bg-slate-900 rounded p-2">
              <p className="text-slate-400 text-xs">Total Prices</p>
              <p className="text-emerald-400 font-semibold">{data.prices.length}</p>
            </div>
          </div>

          {/* CE/Extra-CE Split */}
          {data.ceExtraCeSplit && (
            <div className="bg-cyan-900 text-cyan-100 p-2 rounded flex items-center space-x-2 text-sm">
              <Check size={16} />
              <span>CE/Extra-CE split detected</span>
            </div>
          )}
        </div>

        {/* Pricelist Name Input */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-2">
          <label className="text-slate-100 font-semibold text-sm">
            Pricelist Name
          </label>
          <input
            type="text"
            value={pricelistName}
            onChange={(e) => onPricelistNameChange(e.target.value)}
            placeholder="E.g., DHL Standard EU 2024"
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {!pricelistName.trim() && (
            <p className="text-red-400 text-xs">
              Pricelist name is required
            </p>
          )}
        </div>

        {/* Service Selector */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
          <label className="text-slate-100 font-semibold text-sm">
            Service
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="service"
                value="existing"
                checked={serviceType === 'existing'}
                onChange={() => setServiceType('existing')}
                className="w-4 h-4"
              />
              <span className="text-slate-300 text-sm">
                Use existing service
              </span>
            </label>
            {serviceType === 'existing' && (
              <select className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>Select a service...</option>
                <option>{data.serviceName} Standard</option>
                <option>{data.serviceName} Express</option>
              </select>
            )}

            <label className="flex items-center space-x-2 cursor-pointer mt-3">
              <input
                type="radio"
                name="service"
                value="new"
                checked={serviceType === 'new'}
                onChange={() => setServiceType('new')}
                className="w-4 h-4"
              />
              <span className="text-slate-300 text-sm">Create new service</span>
            </label>
            {serviceType === 'new' && (
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Service name..."
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            )}
          </div>
        </div>

        {/* Warnings Summary */}
        {data.warnings.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={18} className="text-yellow-500" />
              <h3 className="text-slate-100 font-semibold">Issues Summary</h3>
            </div>
            <div className="space-y-1 text-sm">
              {data.warnings.map((warning) => (
                <div
                  key={warning.id}
                  className={`flex items-start space-x-2 ${
                    warning.severity === 'error'
                      ? 'text-red-300'
                      : 'text-yellow-300'
                  }`}
                >
                  <AlertCircle
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right - Chat Panel */}
      <div className="w-96 flex flex-col">
        <ChatPanel
          messages={messages}
          onSend={onSendMessage}
          isTyping={isTyping}
          phase="confirm"
        />

        {/* Buttons */}
        <div className="mt-4 space-y-2 flex-shrink-0">
          <button
            onClick={onBack}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-100 font-medium"
          >
            Back
          </button>
          <button
            onClick={() => setConfirmDialog(true)}
            disabled={!canCommit}
            className={`w-full px-4 py-2 rounded-lg transition-colors font-semibold flex items-center justify-center space-x-2 ${
              canCommit
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>Commit Import</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 max-w-md space-y-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle size={24} />
              <h2 className="text-lg font-semibold">Confirm Import</h2>
            </div>

            <p className="text-slate-300">
              You are about to commit {data.prices.length} prices and{' '}
              {data.zones.length} zones to the database. This action cannot be
              easily undone.
            </p>

            <p className="text-slate-400 text-sm">
              Pricelist: <span className="font-semibold">{pricelistName}</span>
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-100 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCommit?.();
                  setConfirmDialog(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-white font-semibold"
              >
                Commit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
