import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { KnowledgeBaseRule } from '../../types';

interface RuleEditorProps {
  rule?: KnowledgeBaseRule | null;
  onSave: (rule: Omit<KnowledgeBaseRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({
  rule,
  onSave,
  onCancel,
  isOpen,
}) => {
  const [title, setTitle] = useState(rule?.title || '');
  const [content, setContent] = useState(rule?.content || '');
  const [carrier, setCarrier] = useState(rule?.carrier || '');
  const [operation, setOperation] = useState<KnowledgeBaseRule['operation']>(
    rule?.operation || 'extract'
  );
  const [priority, setPriority] = useState<KnowledgeBaseRule['priority']>(
    rule?.priority || 'medium'
  );
  const [tags, setTags] = useState(rule?.tags.join(', ') || '');
  const [active, setActive] = useState(rule?.active ?? true);

  const handleSave = () => {
    onSave({
      title,
      content,
      carrier,
      operation,
      priority,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      active,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">
            {rule ? 'Edit Rule' : 'New Rule'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Rule title"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              placeholder="Rule content or pattern"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Carrier */}
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-1">
                Carrier
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="E.g., DHL"
              />
            </div>

            {/* Operation */}
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-1">
                Operation
              </label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="extract">Extract</option>
                <option value="validate">Validate</option>
                <option value="transform">Transform</option>
                <option value="merge">Merge</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-100">Active</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="E.g., international, express, validation"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-slate-700 bg-slate-800 bg-opacity-50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-slate-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-white font-semibold"
          >
            <Save size={18} />
            <span>Save Rule</span>
          </button>
        </div>
      </div>
    </div>
  );
};
