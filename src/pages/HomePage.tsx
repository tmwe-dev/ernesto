import React, { useState, useEffect } from 'react';
import { TrendingUp, BookOpen, Brain, Upload, ArrowRight } from 'lucide-react';
import { Layout } from '../components/common/Layout';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalImports: 0, totalRules: 0, totalMemory: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [rules, docs, mem] = await Promise.all([
        supabase.from('ernesto_knowledge_rules').select('*', { count: 'exact', head: true }),
        supabase.from('ernesto_documents').select('*', { count: 'exact', head: true }),
        supabase.from('ernesto_memory_items').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        totalRules: rules.count || 0,
        totalImports: docs.count || 0,
        totalMemory: mem.count || 0,
      });
    } catch (_) {
      // Tables might not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const cards = [
    { icon: <Upload size={24} />, title: 'Import Listini', value: stats.totalImports, desc: 'Documenti importati', link: '/import' },
    { icon: <BookOpen size={24} />, title: 'Knowledge Base', value: stats.totalRules, desc: 'Regole attive', link: '/kb' },
    { icon: <Brain size={24} />, title: 'Hydra Memory', value: stats.totalMemory, desc: 'Memorie apprese', link: '/kb' },
  ];

  return (
    <Layout currentPage="home">
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Benvenuto, {profile?.full_name || 'User'}
          </h1>
          <p className="text-slate-400 mt-1">Dashboard ERNESTO — AI Pricelist Engine</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              to={card.link}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-cyan-800 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-cyan-900/30 text-cyan-400">
                  {card.icon}
                </div>
                <ArrowRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {isLoading ? '...' : card.value}
              </p>
              <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
              <p className="text-sm font-medium text-slate-300 mt-2">{card.title}</p>
            </Link>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Azioni rapide</h2>
          <div className="flex gap-3">
            <Link to="/import" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium text-white transition-colors">
              📁 Importa listino
            </Link>
            <Link to="/kb" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-300 transition-colors">
              📚 Knowledge Base
            </Link>
            <Link to="/admin" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-300 transition-colors">
              ⚙️ Impostazioni
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};
