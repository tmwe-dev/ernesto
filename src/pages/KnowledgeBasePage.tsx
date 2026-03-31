import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, ToggleRight, ToggleLeft } from 'lucide-react';
import { Layout } from '../components/common/Layout';
import { RuleEditor } from '../components/kb/RuleEditor';
import { MemoryPanel } from '../components/kb/MemoryPanel';
import { KnowledgeBaseRule, HydraMemoryItem } from '../types';

export const KnowledgeBasePage: React.FC = () => {
  const [rules, setRules] = useState<KnowledgeBaseRule[]>([
    {
      id: '1',
      title: 'Extract DHL Express Zones',
      content: 'Pattern to extract zone information from DHL Express documents',
      carrier: 'DHL',
      operation: 'extract',
      priority: 'high',
      tags: ['dhl', 'zones', 'express'],
      active: true,
      createdAt: new Date(Date.now() - 604800000),
      updatedAt: new Date(Date.now() - 86400000),
      usageCount: 45,
    },
    {
      id: '2',
      title: 'Validate Price Ranges',
      content: 'Check if prices are within acceptable ranges for each service level',
      carrier: 'UPS',
      operation: 'validate',
      priority: 'high',
      tags: ['validation', 'prices'],
      active: true,
      createdAt: new Date(Date.now() - 1209600000),
      updatedAt: new Date(Date.now() - 604800000),
      usageCount: 67,
    },
  ]);

  const [memoryItems] = useState<HydraMemoryItem[]>([
    {
      id: 'm1',
      content: 'DHL Standard rates typically include 7% discount for volumes over 1000kg',
      level: 'L1',
      confidence: 0.96,
      accessCount: 23,
      tags: ['dhl', 'discount', 'standard'],
      linkedRuleId: '1',
      createdAt: new Date(Date.now() - 1209600000),
      lastAccessedAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'm2',
      content: 'FedEx International Priority shows seasonal pricing increases in Q4',
      level: 'L2',
      confidence: 0.82,
      accessCount: 12,
      tags: ['fedex', 'seasonal', 'pricing'],
      createdAt: new Date(Date.now() - 604800000),
      lastAccessedAt: new Date(Date.now() - 172800000),
    },
  ]);

  const [filterCarrier, setFilterCarrier] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRule, setEditingRule] = useState<KnowledgeBaseRule | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'memory'>('rules');

  const filteredRules = rules.filter((rule) => {
    const matchCarrier = !filterCarrier || rule.carrier === filterCarrier;
    const matchStatus =
      filterType === 'all' ||
      (filterType === 'active' && rule.active) ||
      (filterType === 'inactive' && !rule.active);
    const matchSearch =
      searchQuery === '' ||
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCarrier && matchStatus && matchSearch;
  });

  const carriers = Array.from(new Set(rules.map((r) => r.carrier)));

  const handleSaveRule = (ruleData: Omit<KnowledgeBaseRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id
            ? {
                ...r,
                ...ruleData,
                updatedAt: new Date(),
              }
            : r
        )
      );
    } else {
      setRules((prev) => [
        ...prev,
        {
          ...ruleData,
          id: Math.random().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
        },
      ]);
    }
    setEditingRule(null);
    setEditorOpen(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
  };

  const getPriorityColor = (priority: KnowledgeBaseRule['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-900 text-red-100';
      case 'medium':
        return 'bg-yellow-900 text-yellow-100';
      case 'low':
        return 'bg-slate-700 text-slate-100';
    }
  };

  const getOperationColor = (operation: KnowledgeBaseRule['operation']) => {
    switch (operation) {
      case 'extract':
        return 'text-cyan-400';
      case 'validate':
        return 'text-emerald-400';
      case 'transform':
        return 'text-purple-400';
      case 'merge':
        return 'text-orange-400';
    }
  };

  return (
    <Layout currentPage="knowledge-base">
      <div className="p-6 space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Knowledge Base</h1>
            <p className="text-slate-400 mt-2">
              Manage extraction rules and memory items
            </p>
          </div>
          <button
            onClick={() => {
              setEditingRule(null);
              setEditorOpen(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors text-white font-semibold"
          >
            <Plus size={18} />
            <span>New Rule</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-slate-800 flex-shrink-0">
          {['rules', 'memory'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'rules' ? 'Rules' : 'Memory Items'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'rules' && (
            <>
              {/* Filters */}
              <div className="flex gap-4 mb-4 flex-shrink-0">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <Search
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={filterCarrier}
                    onChange={(e) => setFilterCarrier(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Carriers</option>
                    {carriers.map((carrier) => (
                      <option key={carrier} value={carrier}>
                        {carrier}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) =>
                      setFilterType(e.target.value as typeof filterType)
                    }
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Rules List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredRules.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <p>No rules found</p>
                  </div>
                ) : (
                  filteredRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="bg-slate-800 rounded border border-slate-700 p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-slate-100 font-semibold">
                              {rule.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityColor(rule.priority)}`}>
                              {rule.priority.charAt(0).toUpperCase() + rule.priority.slice(1)}
                            </span>
                            <span
                              className={`text-xs font-semibold ${getOperationColor(rule.operation)}`}
                            >
                              {rule.operation}
                            </span>
                          </div>

                          <p className="text-slate-400 text-sm mb-2 line-clamp-2">
                            {rule.content}
                          </p>

                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span>{rule.carrier}</span>
                            <span>{rule.usageCount} uses</span>
                            <div className="flex space-x-1">
                              {rule.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="bg-slate-700 px-2 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() =>
                              handleToggleRule(rule.id)
                            }
                            className="p-2 hover:bg-slate-700 rounded transition-colors"
                          >
                            {rule.active ? (
                              <ToggleRight size={18} className="text-emerald-500" />
                            ) : (
                              <ToggleLeft size={18} className="text-slate-500" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setEditorOpen(true);
                            }}
                            className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                          >
                            <Edit2 size={18} />
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteRule(rule.id)
                            }
                            className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-red-400"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'memory' && (
            <div className="flex-1 overflow-y-auto">
              <MemoryPanel items={memoryItems} />
            </div>
          )}
        </div>
      </div>

      {/* Rule Editor Modal */}
      <RuleEditor
        rule={editingRule}
        onSave={handleSaveRule}
        onCancel={() => {
          setEditingRule(null);
          setEditorOpen(false);
        }}
        isOpen={editorOpen}
      />
    </Layout>
  );
};
