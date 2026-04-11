import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DEMO_COMPANY, DEMO_EMPLOYEES } from '../constants';
import Footer from '../components/layout/Footer';

function DemoPage({ onLogin, user, onGoToDashboard, setCurrentPage }) {
  const demoTotalCost = DEMO_EMPLOYEES.filter(e => e.period === '2024-04').reduce((sum, e) => sum + e.totalCost, 0);
  const demoEmployeeCount = new Set(DEMO_EMPLOYEES.filter(e => e.period === '2024-04').map(e => e.name)).size;
  const demoDepts = [...new Set(DEMO_EMPLOYEES.map(e => e.department))];

  const demoChartData = ['2024-01', '2024-02', '2024-03', '2024-04'].map(period => {
    const periodEmps = DEMO_EMPLOYEES.filter(e => e.period === period);
    return {
      period,
      total: periodEmps.reduce((sum, e) => sum + e.totalCost, 0)
    };
  });

  const demoDeptData = demoDepts.map(dept => ({
    name: dept,
    total: DEMO_EMPLOYEES.filter(e => e.period === '2024-04' && e.department === dept).reduce((sum, e) => sum + e.totalCost, 0),
    count: new Set(DEMO_EMPLOYEES.filter(e => e.period === '2024-04' && e.department === dept).map(e => e.name)).size
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-slate-950 to-fuchsia-600/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-violet-500/20 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-amber-400 text-sm font-medium">Mode demonstration - Donnees fictives</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Decouvrez Salarize <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">en action</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-6">
              Explorez notre dashboard avec des donnees de demonstration
            </p>
          </div>
        </div>
      </div>

      {/* Demo Dashboard */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-slate-100 rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-200">
          {/* Demo Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{DEMO_COMPANY.name}</h2>
                <p className="text-slate-500 text-sm">{DEMO_COMPANY.website}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 bg-violet-100 text-violet-600 rounded-lg text-sm font-medium">Avril 2024</span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm">Cout Total</p>
              <p className="text-2xl font-bold text-slate-800">EUR{demoTotalCost.toLocaleString('fr-BE')}</p>
              <p className="text-emerald-500 text-xs mt-1">-2.3% vs mois prec.</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm">Employes</p>
              <p className="text-2xl font-bold text-slate-800">{demoEmployeeCount}</p>
              <p className="text-slate-400 text-xs mt-1">Actifs ce mois</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm">Departements</p>
              <p className="text-2xl font-bold text-slate-800">{demoDepts.length}</p>
              <p className="text-slate-400 text-xs mt-1">IT en tete</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm">Cout Moyen</p>
              <p className="text-2xl font-bold text-slate-800">EUR{Math.round(demoTotalCost / demoEmployeeCount).toLocaleString('fr-BE')}</p>
              <p className="text-slate-400 text-xs mt-1">Par employe</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="font-bold text-slate-800 mb-4">Evolution des Couts</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demoChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => {
                      const months = ['Jan', 'Fev', 'Mar', 'Avr'];
                      return months[parseInt(value.split('-')[1]) - 1] + " '24";
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `EUR${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [`EUR${value.toLocaleString('fr-BE')}`, 'Cout total']}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="total" isAnimationActive={false} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Repartition par Departement</h3>
            <div className="space-y-3">
              {demoDeptData.map((dept, idx) => (
                <div key={dept.name} className="flex items-center gap-3">
                  <span className="text-slate-700 font-medium text-sm w-24 truncate">{dept.name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${(dept.total / demoDeptData[0].total) * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-500 text-xs w-12">{dept.count} emp.</span>
                  <span className="text-slate-800 font-semibold text-sm w-20 text-right">EUR{dept.total.toLocaleString('fr-BE')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-400 mb-6">Pret a analyser vos propres donnees ?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={user ? onGoToDashboard : onLogin}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
            >
              {user ? 'Aller au dashboard' : 'Creer un compte gratuit'}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPage('pricing')}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition-all"
            >
              Voir les tarifs
            </button>
          </div>
        </div>
      </div>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

export default DemoPage;
