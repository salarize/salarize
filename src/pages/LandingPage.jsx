import React from 'react';
import Footer from '../components/layout/Footer';

function LandingPage({ onLogin, user, onGoToDashboard, onViewDemo, setCurrentPage }) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-slate-950 to-fuchsia-600/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-violet-500/30 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-20">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8">
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              <span className="text-slate-300 text-sm">Nouvelle version disponible</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Analysez vos couts
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                salariaux
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Importez vos fichiers de secretariat social, visualisez vos donnees par departement,
              et exportez des rapports professionnels en quelques clics.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={user ? onGoToDashboard : onLogin}
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
              >
                {user ? 'Aller au dashboard' : 'Commencer gratuitement'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              {!user && (
                <button
                  onClick={onViewDemo}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Voir la demo
                </button>
              )}
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 p-3 md:p-4 shadow-2xl">
              <div className="bg-slate-100 rounded-xl overflow-hidden">
                {/* Mini Dashboard Header */}
                <div className="bg-white p-3 md:p-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs md:text-sm">T</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm md:text-base">TechStart SPRL</p>
                    <p className="text-slate-400 text-xs">techstart.be</p>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2 py-1 bg-violet-100 text-violet-600 rounded text-xs font-medium">Avril 2024</span>
                  </div>
                </div>

                {/* Mini KPI Cards */}
                <div className="p-3 md:p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                      <p className="text-slate-400 text-[10px] md:text-xs">Cout Total</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">EUR51.500</p>
                      <p className="text-emerald-500 text-[10px]">-2.3%</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                      <p className="text-slate-400 text-[10px] md:text-xs">Employes</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">11</p>
                      <p className="text-slate-400 text-[10px]">Actifs</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                      <p className="text-slate-400 text-[10px] md:text-xs">Departements</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">5</p>
                      <p className="text-slate-400 text-[10px]">IT en tete</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                      <p className="text-slate-400 text-[10px] md:text-xs">Cout Moyen</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">EUR4.682</p>
                      <p className="text-slate-400 text-[10px]">Par emp.</p>
                    </div>
                  </div>

                  {/* Mini Chart Preview */}
                  <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm">
                    <div className="flex items-end justify-between h-24 md:h-32 gap-2 md:gap-3">
                      {[45, 45, 47, 51].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-violet-500 rounded-t"
                            style={{ height: `${h * 2}px` }}
                          />
                          <span className="text-[8px] md:text-[10px] text-slate-400">
                            {['Jan', 'Fev', 'Mar', 'Avr'][i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={onViewDemo}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-full border border-slate-600 shadow-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Explorer la demo interactive
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Une solution complete pour gerer et analyser vos couts salariaux
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50 hover:border-violet-500/50 transition-colors group">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Import intelligent</h3>
            <p className="text-slate-400">
              Importez vos fichiers de secretariat social et Excel. Detection automatique des colonnes et des periodes.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50 hover:border-violet-500/50 transition-colors group">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Visualisation claire</h3>
            <p className="text-slate-400">
              Graphiques interactifs, repartition par departement, evolution mensuelle de vos couts.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50 hover:border-violet-500/50 transition-colors group">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Export professionnel</h3>
            <p className="text-slate-400">
              Generez des rapports PDF et Excel prets a presenter a vos clients ou a la direction.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-3xl p-12 border border-violet-500/20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {user ? 'Accedez a votre dashboard' : 'Pret a simplifier votre gestion ?'}
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
            {user ? 'Analysez vos donnees salariales et generez des rapports.' : 'Rejoignez les consultants qui utilisent Salarize pour leurs analyses salariales.'}
          </p>
          <button
            onClick={user ? onGoToDashboard : onLogin}
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25"
          >
            {user ? 'Aller au dashboard' : 'Commencer maintenant'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

export default LandingPage;
