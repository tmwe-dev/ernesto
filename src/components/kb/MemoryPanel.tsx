import React, { useState } from 'react';
import {
  Brain,
  Archive,
  Pin,
  TrendingUp,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { HydraMemoryItem } from '../../types';

interface MemoryPanelProps {
  items: HydraMemoryItem[];
  onPromote?: (itemId: string) => void;
  onArchive?: (itemId: string) => void;
  onPin?: (itemId: string) => void;
}

const getLevelColor = (level: HydraMemoryItem['level']) => {
  switch (level) {
    case 'L1':
      return 'bg-emerald-900 text-emerald-100';
    case 'L2':
      return 'bg-cyan-900 text-cyan-100';
    case 'L3':
      return 'bg-purple-900 text-purple-100';
  }
};

const getLevelLabel = (level: HydraMemoryItem['level']) => {
  switch (level) {
    case 'L1':
      return 'Stable';
    case 'L2':
      return 'Active';
    case 'L3':
      return 'Learning';
  }
};

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  items,
  onPromote,
  onArchive,
  onPin,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'L1' | 'L2' | 'L3' | 'all'>(
    'all'
  );
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredItems = selectedLevel === 'all'
    ? items
    : items.filter((item) => item.level === selectedLevel);

  const getLevelPercentage = (level: HydraMemoryItem['level']) => {
    const count = items.filter((i) => i.level === level).length;
    return Math.round((count / items.length) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Level Tabs */}
      <div className="flex space-x-2">
        {['L1', 'L2', 'L3', 'all'].map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level as any)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedLevel === level
                ? 'bg-cyan-600 text-white'
                : `${
                    level === 'L1'
                      ? 'bg-emerald-900 text-emerald-100'
                      : level === 'L2'
                        ? 'bg-cyan-900 text-cyan-100'
                        : level === 'L3'
                          ? 'bg-purple-900 text-purple-100'
                          : 'bg-slate-800 text-slate-300'
                  } hover:opacity-80`
            }`}
          >
            {level === 'all' ? 'All' : level} {level !== 'all' && `(${getLevelPercentage(level as any)}%)`}
          </button>
        ))}
      </div>

      {/* Memory Items */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Brain size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No memory items in this category</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800 rounded border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors"
            >
              {/* Item Header */}
              <button
                onClick={() =>
                  setExpandedItem(expandedItem === item.id ? null : item.id)
                }
                className="w-full p-3 text-left hover:bg-slate-750 transition-colors flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${getLevelColor(item.level)}`}
                    >
                      {getLevelLabel(item.level)}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {item.accessCount} accesses
                    </span>
                  </div>
                  <p className="text-slate-100 text-sm line-clamp-2">
                    {item.content}
                  </p>
                </div>

                {/* Confidence Bar */}
                <div className="ml-4 flex-shrink-0">
                  <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                      style={{ width: `${item.confidence * 100}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs mt-1 text-right">
                    {(item.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedItem === item.id && (
                <div className="border-t border-slate-700 p-3 bg-slate-900 space-y-2">
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">
                    {item.content}
                  </p>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>
                      <p className="font-medium">Created</p>
                      <p>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Last Accessed</p>
                      <p>
                        {new Date(item.lastAccessedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked Rule */}
                  {item.linkedRuleId && (
                    <div className="flex items-center space-x-1 text-slate-400 text-xs p-2 bg-slate-800 rounded">
                      <AlertCircle size={12} />
                      <span>Linked to rule {item.linkedRuleId}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => onPromote?.(item.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-emerald-900 hover:bg-emerald-800 rounded text-emerald-100 text-xs font-medium transition-colors"
                    >
                      <TrendingUp size={12} />
                      <span>Promote</span>
                    </button>
                    <button
                      onClick={() => onPin?.(item.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-cyan-900 hover:bg-cyan-800 rounded text-cyan-100 text-xs font-medium transition-colors"
                    >
                      <Pin size={12} />
                      <span>Pin</span>
                    </button>
                    <button
                      onClick={() => onArchive?.(item.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-100 text-xs font-medium transition-colors"
                    >
                      <Archive size={12} />
                      <span>Archive</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
