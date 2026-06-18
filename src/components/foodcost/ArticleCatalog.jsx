import React, { useState } from 'react';
import { supabase } from '../../config/supabase';

const CATEGORY_LABELS = { meat: 'Viande', fish: 'Poisson', dairy: 'Laitier', produce: 'Fruits/Légumes', dry: 'Épicerie sèche', beverage: 'Boissons', other: 'Autre' };
const CATEGORY_COLORS = { meat: 'text-red-400 bg-red-500/10', fish: 'text-blue-400 bg-blue-500/10', dairy: 'text-yellow-400 bg-yellow-500/10', produce: 'text-green-400 bg-green-500/10', dry: 'text-amber-400 bg-amber-500/10', beverage: 'text-cyan-400 bg-cyan-500/10', other: 'text-slate-400 bg-slate-500/10' };

function ArticleCatalog({ articles, companyId, onRefetch }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = articles.filter(a =>
    a.canonical_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteAlias = async (aliasId) => {
    await supabase.from('food_article_aliases').delete().eq('id', aliasId);
    onRefetch();
  };

  const handleRenameArticle = async (articleId, newName) => {
    await supabase.from('food_articles').update({ canonical_name: newName }).eq('id', articleId);
    onRefetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
            placeholder="Rechercher un article..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-slate-500 text-sm">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">Aucun article trouvé.</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filtered.map(article => {
              const isOpen = expanded === article.id;
              const catStyle = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.other;

              return (
                <div key={article.id}>
                  <button
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : article.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 font-semibold text-sm truncate">{article.canonical_name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{article.food_article_aliases?.length ?? 0} alias · unité: {article.default_unit}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catStyle}`}>
                      {CATEGORY_LABELS[article.category] ?? 'Autre'}
                    </span>
                    <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 bg-slate-900/40">
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2 mt-3">Alias reconnus</p>
                      {(!article.food_article_aliases || article.food_article_aliases.length === 0) ? (
                        <p className="text-slate-600 text-xs italic">Aucun alias enregistré</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {article.food_article_aliases.map(alias => (
                            <div key={alias.id} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1">
                              <span className="text-slate-300 text-xs">{alias.alias_text}</span>
                              <span className="text-slate-600 text-[10px]">×{alias.times_seen}</span>
                              <button
                                onClick={() => handleDeleteAlias(alias.id)}
                                className="text-slate-600 hover:text-red-400 transition-colors ml-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ArticleCatalog;
