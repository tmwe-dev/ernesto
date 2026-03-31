import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, RotateCcw, MessageCircle } from 'lucide-react';
import { ChatPanel } from '../common/ChatPanel';
import { Message, ImportData } from '../../types';

interface ResultStepProps {
  data: ImportData | null;
  pricelistName: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  insertedZones?: number;
  insertedPrices?: number;
  insertedSupplements?: number;
  createdServiceId?: string;
  createdPricelistId?: string;
  onImportAnother?: () => void;
}

export const ResultStep: React.FC<ResultStepProps> = ({
  data,
  pricelistName,
  messages,
  onSendMessage,
  isTyping = false,
  insertedZones = 0,
  insertedPrices = 0,
  insertedSupplements = 0,
  createdServiceId,
  createdPricelistId,
  onImportAnother,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex gap-4 h-full">
      {/* Left - Success Message */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Success Card */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-lg border border-emerald-700 p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <CheckCircle2 size={32} className="text-emerald-300" />
            <h2 className="text-2xl font-bold text-emerald-100">
              Import Successful
            </h2>
          </div>

          <p className="text-emerald-100 text-lg font-semibold">
            {pricelistName}
          </p>

          <p className="text-emerald-200">
            Your pricelist has been successfully imported and committed to the
            database.
          </p>

          {/* Inserted Counts */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-emerald-800 rounded p-3 text-center">
              <p className="text-emerald-200 text-xs">Zones Inserted</p>
              <p className="text-emerald-100 font-bold text-xl">
                {insertedZones}
              </p>
            </div>
            <div className="bg-emerald-800 rounded p-3 text-center">
              <p className="text-emerald-200 text-xs">Prices Inserted</p>
              <p className="text-emerald-100 font-bold text-xl">
                {insertedPrices}
              </p>
            </div>
            <div className="bg-emerald-800 rounded p-3 text-center">
              <p className="text-emerald-200 text-xs">Supplements Inserted</p>
              <p className="text-emerald-100 font-bold text-xl">
                {insertedSupplements}
              </p>
            </div>
          </div>
        </div>

        {/* Links Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-2">
          <h3 className="text-slate-100 font-semibold">Quick Links</h3>

          {createdServiceId && (
            <a
              href={`/services/${createdServiceId}`}
              className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 rounded transition-colors text-slate-100"
            >
              <span className="font-medium">View Service</span>
              <ExternalLink size={16} className="text-cyan-400" />
            </a>
          )}

          {createdPricelistId && (
            <a
              href={`/pricelists/${createdPricelistId}`}
              className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 rounded transition-colors text-slate-100"
            >
              <span className="font-medium">View Pricelist</span>
              <ExternalLink size={16} className="text-cyan-400" />
            </a>
          )}

          {(createdServiceId || createdPricelistId) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 rounded transition-colors text-slate-100 text-sm"
            >
              <span>Show Details</span>
              <span className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          )}
        </div>

        {/* Details */}
        {showDetails && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3 text-sm">
            <div>
              <p className="text-slate-400">Service ID</p>
              <p className="text-slate-100 font-mono text-xs break-all">
                {createdServiceId}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Pricelist ID</p>
              <p className="text-slate-100 font-mono text-xs break-all">
                {createdPricelistId}
              </p>
            </div>
            {data && (
              <>
                <div>
                  <p className="text-slate-400">Carrier</p>
                  <p className="text-slate-100">{data.carrier}</p>
                </div>
                <div>
                  <p className="text-slate-400">Currency</p>
                  <p className="text-slate-100">{data.currency}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
          <h3 className="text-slate-100 font-semibold">Import Statistics</h3>

          <div className="space-y-2 text-sm">
            {data && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Source Carrier</span>
                  <span className="text-slate-100 font-medium">
                    {data.carrier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Service Type</span>
                  <span className="text-slate-100 font-medium">
                    {data.serviceName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Zoning</span>
                  <span className="text-slate-100 font-medium capitalize">
                    {data.zoningType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Records</span>
                  <span className="text-emerald-400 font-medium">
                    {insertedZones + insertedPrices + insertedSupplements}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right - Chat Panel */}
      <div className="w-96 flex flex-col">
        <div className="flex-1 mb-4">
          <ChatPanel
            messages={messages}
            onSend={onSendMessage}
            isTyping={isTyping}
            phase="result"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onImportAnother}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-100 font-semibold"
          >
            <RotateCcw size={18} />
            <span>Import Another</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors text-white font-semibold"
          >
            <MessageCircle size={18} />
            <span>Review & Learn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
