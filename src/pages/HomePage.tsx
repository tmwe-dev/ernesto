import React, { useState } from 'react';
import { ArrowRight, TrendingUp, BookOpen, Brain, Zap } from 'lucide-react';
import { Layout } from '../components/common/Layout';
import { RecentImport, MemoryHealth as MemoryHealthType } from '../types';

export const HomePage: React.FC = () => {
  const [recentImports] = useState<RecentImport[]>([
    {
      id: '1',
      carrier: 'DHL',
      serviceName: 'Express Worldwide',
      status: 'success',
      confidence: 0.98,
      timestamp: new Date(Date.now() - 86400000),
      pricesCount: 2400,
      zonesCount: 215,
    },
    {
      id: '2',
      carrier: 'FedEx',
      serviceName: 'International Priority',
      status: 'success',
      confidence: 0.95,
      timestamp: new Date(Date.now() - 172800000),
      pricesCount: 1800,
      zonesCount: 180,
    },
    {
      id: '3',
      carrier: 'UPS',
      serviceName: 'Worldwide Saver',
      status: 'partial',
      confidence: 0.87,
      timestamp: new Date(Date.now() - 259200000),
      pricesCount: 3200,
      zonesCount: 250,
    },
  ]);

  const [memoryHealth] = useState<MemoryHealthType>({
    l1Count: 156,
    l2Count: 84,
    l3Count: 32,
    avgConfidence: 0.92,
    healthScore: 78,
  });

  const getStatusColor = (status: RecentImport['status']) => {
    switch (status) {
      case 'success':
        return 'text-emerald-400 bg-emerald-900 bg-opacity-30';
      case 'partial':
        return 'text-yellow-400 bg-yellow-900 bg-opacity-30';
      case 'failed':
        return 'text-red-400 bg-red-900 bg-opacity-30';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Layout currentPage="dashboard">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-2">
            Overview of your pricelist imports and system health
          </p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Total Imports</p>
              <TrendingUp size={18} className="text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-slate-100">42</p>
            <p className="text-xs text-slate-500">Last 30 days</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">KB Rules</p>
              <BookOpen size={18} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-slate-100">284</p>
            <p className="text-xs text-slate-500">Active rules</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Memory Items</p>
              <Brain size={18} className="text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-slate-100">272</p>
            <p className="text-xs text-slate-500">Across L1-L3</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Learning Score</p>
              <Zap size={18} className="text-yellow-400" />
            </div>
            <p className={`text-3xl font-bold ${getHealthColor(memoryHealth.healthScore)}`}>
              {memoryHealth.healthScore}%
            </p>
            <p className="text-xs text-slate-500">System health</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent Imports Table */}
          <div className="col-span-2 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-slate-100">
                Recent Imports
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                      Carrier
                    </th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                      Records
                    </th>
                    <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentImports.map((imp) => (
                    <tr
                      key={imp.id}
                      className="hover:bg-slate-800 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-100 font-medium">
                        {imp.carrier}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {imp.serviceName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold capitalize ${getStatusColor(imp.status)}`}
                        >
                          {imp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                              style={{
                                width: `${imp.confidence * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {(imp.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {imp.zonesCount + imp.pricesCount}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">
                        {imp.timestamp.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800">
              <a
                href="/import"
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center space-x-1"
              >
                <span>View all imports</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Memory Health Card */}
          <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-lg border border-purple-800 p-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Memory Health
            </h2>

            {/* Distribution */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-emerald-400 text-sm font-medium">
                    L1 (Stable)
                  </span>
                  <span className="text-slate-400 text-xs">
                    {memoryHealth.l1Count} items
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${(memoryHealth.l1Count / (memoryHealth.l1Count + memoryHealth.l2Count + memoryHealth.l3Count)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-cyan-400 text-sm font-medium">
                    L2 (Active)
                  </span>
                  <span className="text-slate-400 text-xs">
                    {memoryHealth.l2Count} items
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500"
                    style={{
                      width: `${(memoryHealth.l2Count / (memoryHealth.l1Count + memoryHealth.l2Count + memoryHealth.l3Count)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-purple-400 text-sm font-medium">
                    L3 (Learning)
                  </span>
                  <span className="text-slate-400 text-xs">
                    {memoryHealth.l3Count} items
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{
                      width: `${(memoryHealth.l3Count / (memoryHealth.l1Count + memoryHealth.l2Count + memoryHealth.l3Count)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Avg Confidence */}
            <div className="pt-4 border-t border-purple-800">
              <p className="text-slate-400 text-xs mb-2">Avg Confidence</p>
              <p className="text-2xl font-bold text-emerald-400">
                {(memoryHealth.avgConfidence * 100).toFixed(0)}%
              </p>
            </div>

            {/* Recent Promotions */}
            <div className="pt-4 border-t border-purple-800 space-y-2">
              <p className="text-slate-100 font-semibold text-sm">
                Recent Promotions
              </p>
              <div className="space-y-1 text-xs text-slate-400">
                <p>Today: 3 items promoted to L2</p>
                <p>This week: 12 items promoted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <a
            href="/import"
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors text-white font-semibold"
          >
            <ArrowRight size={18} />
            <span>New Import</span>
          </a>
          <a
            href="/knowledge-base"
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-100 font-semibold"
          >
            <BookOpen size={18} />
            <span>View KB</span>
          </a>
          <a
            href="/memory"
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-100 font-semibold"
          >
            <Brain size={18} />
            <span>Export Memory</span>
          </a>
        </div>
      </div>
    </Layout>
  );
};
