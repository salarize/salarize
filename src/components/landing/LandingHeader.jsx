import React, { useState } from 'react';

function LandingHeader({ user, onLogin, onLogout, currentPage, setCurrentPage }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const handleNav = (page) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-lg border-b border-white/10 z-50">
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => handleNav('home')} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-bold text-xl">Salarize</span>
        </button>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => handleNav('home')}
            className={`text-sm font-medium transition-colors ${currentPage === 'home' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Accueil
          </button>
          <button
            onClick={() => handleNav('features')}
            className={`text-sm font-medium transition-colors ${currentPage === 'features' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Fonctionnalites
          </button>
          <button
            onClick={() => handleNav('pricing')}
            className={`text-sm font-medium transition-colors ${currentPage === 'pricing' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Tarifs
          </button>
          <button
            onClick={() => handleNav('demo')}
            className={`text-sm font-medium transition-colors ${currentPage === 'demo' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Demo
          </button>
          {user && (
            <button
              onClick={() => handleNav('dashboard')}
              className={`text-sm font-medium transition-colors ${currentPage === 'dashboard' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Dashboard
            </button>
          )}
        </nav>

        {/* Auth */}
        <div className="relative">
          {user ? (
            <>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {user.picture && user.provider === 'google' ? (
                  <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <span className="text-white text-sm font-medium hidden sm:block">{user.name?.split(' ')[0]}</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 top-12 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 w-56 z-50">
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="font-medium text-white text-sm">{user.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { handleNav('profile'); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mon profil
                    </button>
                    <button
                      onClick={() => { handleNav('dashboard'); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Dashboard
                    </button>
                    <div className="border-t border-slate-700 mt-2 pt-2">
                      <button
                        onClick={() => { onLogout(); setShowDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Se deconnecter
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-violet-500/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Connexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default LandingHeader;
