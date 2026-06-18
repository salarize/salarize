import React, { useState } from 'react';
import FoodCostDashboard from './FoodCostDashboard';
import FoodCostImportModal from './FoodCostImportModal';
import FoodCostReviewQueue from './FoodCostReviewQueue';
import ArticleCatalog from './ArticleCatalog';
import SupplierComparison from './SupplierComparison';
import FoodAnomalyFeed from './FoodAnomalyFeed';
import FoodDuplicateResolver from './FoodDuplicateResolver';
import FoodImportHistory from './FoodImportHistory';
import { useFoodCostData } from './hooks/useFoodCostData';
import { useImportQueue } from './hooks/useImportQueue';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'comparison', label: 'Comparaison' },
  { id: 'review', label: 'À vérifier', badge: 'review' },
  { id: 'articles', label: 'Articles' },
  { id: 'anomalies', label: 'Anomalies', badge: 'anomalies' },
  { id: 'duplicates', label: 'Doublons' },
  { id: 'history', label: 'Historique' },
];

function FoodCostPage({ activeCompany, companyId, user, isViewerOnly, onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showImport, setShowImport] = useState(false);
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const dbCompanyId = companyId;

  const {
    suppliers, articles, invoices, priceHistory, reviewLines,
    anomalies, loading, error, refetch,
    getVwap, topArticlesBySpend,
    validateLine, bulkApprove, createArticleAndLink, resolveAnomaly,
  } = useFoodCostData(dbCompanyId, { confirmedOnly });

  const { jobs, uploadFiles, retryJob, forceReimport, clearCompleted, summary } = useImportQueue(dbCompanyId);

  const openAnomaly = anomalies?.length ?? 0;

  if (!activeCompany || !companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Sélectionnez une société pour accéder au Food Cost.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Food Cost</h1>
            <p className="text-slate-400 text-xs">{activeCompany}</p>
          </div>
        </div>

        {!isViewerOnly && (
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/30 text-orange-300 font-semibold rounded-xl text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importer factures
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-slate-800/50 overflow-x-auto">
        {TABS.map(tab => {
          const badgeCount = tab.badge === 'review'
            ? reviewLines.length
            : tab.badge === 'anomalies'
            ? openAnomaly
            : 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-orange-300 border-orange-400 bg-orange-500/5'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {tab.label}
              {badgeCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Erreur Supabase : {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <FoodCostDashboard
                articles={articles}
                priceHistory={priceHistory}
                suppliers={suppliers}
                getVwap={getVwap}
                topArticlesBySpend={topArticlesBySpend}
                confirmedOnly={confirmedOnly}
                onToggleConfirmed={() => setConfirmedOnly(v => !v)}
              />
            )}
            {activeTab === 'comparison' && (
              <SupplierComparison
                articles={articles}
                priceHistory={priceHistory}
                suppliers={suppliers}
                getVwap={getVwap}
              />
            )}
            {activeTab === 'review' && (
              <FoodCostReviewQueue
                reviewLines={reviewLines}
                articles={articles}
                onValidate={validateLine}
                onBulkApprove={bulkApprove}
                onCreateAndLink={createArticleAndLink}
                onRefetch={refetch}
                companyId={dbCompanyId}
                userEmail={user?.email}
              />
            )}
            {activeTab === 'articles' && (
              <ArticleCatalog
                articles={articles}
                companyId={dbCompanyId}
                onRefetch={refetch}
              />
            )}
            {activeTab === 'anomalies' && (
              <FoodAnomalyFeed
                anomalies={anomalies}
                onResolve={resolveAnomaly}
              />
            )}
            {activeTab === 'duplicates' && (
              <FoodDuplicateResolver companyId={dbCompanyId} />
            )}
            {activeTab === 'history' && (
              <FoodImportHistory
                companyId={dbCompanyId}
                onRetry={retryJob}
              />
            )}
          </>
        )}
      </div>

      {/* Import modal */}
      {showImport && (
        <FoodCostImportModal
          jobs={jobs}
          summary={summary}
          onUpload={uploadFiles}
          onForceReimport={forceReimport}
          onClearCompleted={clearCompleted}
          onClose={() => {
            setShowImport(false);
            if (summary.linesNeedingReview > 0) setActiveTab('review');
            refetch();
          }}
        />
      )}
    </div>
  );
}

export default FoodCostPage;
