import React, { useState, useEffect } from 'react';

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function formatDate() {
  const d = new Date();
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function getGreeting(user) {
  const name = user?.name || user?.email?.split('@')[0] || null;
  const hour = new Date().getHours();
  const salut = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  return name ? `${salut}, ${name.split(' ')[0]}` : salut;
}

function getLastPeriod(employees) {
  if (!employees || employees.length === 0) return null;
  const periods = [...new Set(employees.map(e => e.period).filter(Boolean))].sort();
  return periods[periods.length - 1] || null;
}

function getLastMaterialMonth(materialCosts) {
  if (!materialCosts || materialCosts.length === 0) return null;
  const months = [...new Set(materialCosts.map(m => m.period || m.month || m.date?.slice(0, 7)).filter(Boolean))].sort();
  return months[months.length - 1] || null;
}

// ─── Module Card ─────────────────────────────────────────────────────────────

function ModuleCard({ title, description, icon, accentClass, borderActiveClass, bgActiveClass, badgeText, hasData, onOpen, onStart, shortcut, delay }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {hasData ? (
        <button
          onClick={onOpen}
          className={`group relative w-full bg-white border-2 border-slate-100 hover:${borderActiveClass} rounded-2xl p-6 sm:p-8 text-left shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden`}
        >
          <div className={`absolute inset-0 ${bgActiveClass} opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl`} />
          <div className="relative">
            <div className={`w-12 h-12 rounded-xl ${accentClass} flex items-center justify-center mb-4 transition-colors`}>
              {icon}
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-1">{title}</h2>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{description}</p>
            {badgeText && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 border ${accentClass} bg-opacity-20`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block opacity-60" />
                {badgeText}
              </span>
            )}
          </div>
          {shortcut && (
            <span className="absolute bottom-4 left-4 text-[10px] text-slate-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              Appuyer sur {shortcut}
            </span>
          )}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ) : (
        <div className="relative w-full bg-slate-50 border-2 border-slate-100 border-dashed rounded-2xl p-6 sm:p-8 text-left overflow-hidden">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mb-4">
              <div className="opacity-40">{icon}</div>
            </div>
            <h2 className="text-base font-bold text-slate-400 mb-1">{title}</h2>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">{description}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
              Aucune donnée
            </span>
          </div>
          <button
            onClick={onStart}
            className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Commencer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function OverviewPage({
  user,
  activeCompany,
  companies,
  companyOrder,
  onSelectCompany,
  onOpenPayroll,
  onOpenSuppliers,
  onOpenCDR,
  onOpenPayrollWithImport,
  onOpenSuppliersWithImport,
  onOpenCDRWithImport,
}) {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeaderVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const company = companies?.[activeCompany];
  const employees = company?.employees || [];
  const materialCosts = company?.materialCosts || [];

  const hasPayrollData = employees.length > 0;
  const hasSuppliersData = materialCosts.length > 0;
  const hasCDRData = true;

  const lastPayrollPeriod = getLastPeriod(employees);
  const lastSupplierPeriod = getLastMaterialMonth(materialCosts);

  const payrollBadge = hasPayrollData
    ? `${employees.length} employé${employees.length > 1 ? 's' : ''}${lastPayrollPeriod ? ` — ${lastPayrollPeriod}` : ''}`
    : null;

  const supplierBadge = hasSuppliersData
    ? `${materialCosts.length} achat${materialCosts.length > 1 ? 's' : ''}${lastSupplierPeriod ? ` — ${lastSupplierPeriod}` : ''}`
    : null;

  // Company list for switcher
  const companyNames = companyOrder?.length
    ? companyOrder.filter(n => companies?.[n])
    : Object.keys(companies || {});
  const otherCompanies = companyNames.filter(n => n !== activeCompany);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 rounded-2xl border border-slate-200 bg-white">

      {/* Header greeting */}
      <div
        className="text-center mb-10 transition-all duration-500"
        style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? 'translateY(0)' : 'translateY(-8px)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-slate-400">{formatDate()}</p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-800">
          {getGreeting(user)} 👋
        </h1>

        {/* Company switcher */}
        {activeCompany && (
          <div className="relative inline-block">
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm transition-all text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow"
            >
              {company?.logo ? (
                <img src={company.logo} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold bg-slate-500">
                  {activeCompany.charAt(0).toUpperCase()}
                </div>
              )}
              {activeCompany}
              {otherCompanies.length > 0 && (
                <svg className={`w-3.5 h-3.5 transition-transform text-slate-400 ${switcherOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {switcherOpen && otherCompanies.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-xl shadow-lg py-1 min-w-[180px] z-20 bg-white border border-slate-200">
                  {otherCompanies.map(name => {
                    const c = companies[name];
                    return (
                      <button
                        key={name}
                        onClick={() => { onSelectCompany(name); setSwitcherOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left text-slate-700 hover:bg-slate-50"
                      >
                        {c?.logo ? (
                          <img src={c.logo} alt="" className="w-5 h-5 rounded object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold bg-slate-500">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl">

        {/* Module RH */}
        <ModuleCard
          title="Module RH"
          description="Analyse des coûts salariaux par département, période et employé."
          icon={
            <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          accentClass="bg-violet-100 text-violet-600"
          borderActiveClass="border-violet-300"
          bgActiveClass="bg-gradient-to-br from-violet-50 to-fuchsia-50"
          badgeText={payrollBadge}
          hasData={hasPayrollData}
          onOpen={onOpenPayroll}
          onStart={onOpenPayrollWithImport}
          shortcut="H"
          delay={50}
        />

        {/* Module Fournisseur */}
        <ModuleCard
          title="Module Fournisseur"
          description="Pilotage des coûts achats et analyse des dépenses fournisseurs."
          icon={
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          accentClass="bg-emerald-100 text-emerald-600"
          borderActiveClass="border-emerald-300"
          bgActiveClass="bg-gradient-to-br from-emerald-50 to-teal-50"
          badgeText={supplierBadge}
          hasData={hasSuppliersData}
          onOpen={onOpenSuppliers}
          onStart={onOpenSuppliersWithImport}
          shortcut="F"
          delay={130}
        />

        {/* Module CDR */}
        <ModuleCard
          title="CDR & Closers"
          description="Compte de résultat, injection de factures et performance des closers."
          icon={
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          accentClass="bg-amber-100 text-amber-600"
          borderActiveClass="border-amber-300"
          bgActiveClass="bg-gradient-to-br from-amber-50 to-orange-50"
          badgeText={null}
          hasData={hasCDRData}
          onOpen={onOpenCDR}
          onStart={onOpenCDRWithImport}
          shortcut="C"
          delay={210}
        />
      </div>

      {/* Keyboard hint */}
      <p className="hidden sm:block mt-8 text-[11px] text-center text-slate-300">
        Raccourcis : <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500">H</kbd> RH &nbsp;
        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500">F</kbd> Fournisseur &nbsp;
        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500">C</kbd> CDR
      </p>
    </div>
  );
}

export default OverviewPage;
