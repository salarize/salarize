import React, { useState } from 'react';
import { supabase } from '../../config/supabase';

function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'login' }) {
  const [view, setView] = useState(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError('');
    setSuccess('');
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('invite');
      if (inviteToken) {
        sessionStorage.setItem('pending_invite_token', inviteToken);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Si login echoue, verifier si un compte Google existe avec cet email
        if (error.message === 'Invalid login credentials') {
          // Essayer de voir si l'utilisateur existe avec Google
          // On ne peut pas verifier directement, donc on suggere Google
          setError('Email ou mot de passe incorrect. Si vous avez un compte Google avec cet email, connectez-vous avec Google.');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Utiliser le provider réel du compte (peut être google même si login par email)
        const realProvider = data.user.app_metadata?.provider ||
                            (data.user.identities?.find(i => i.provider === 'google') ? 'google' : 'email');

        onSuccess({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
          picture: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          provider: realProvider,
          created_at: data.user.created_at
        });
        onClose();
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!email || !password || !name) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Verifier si l'email existe deja (compte Google ou autre)
        if (data.user.identities?.length === 0) {
          setError('Cet email est deja utilise. Si vous avez un compte Google, connectez-vous avec Google puis ajoutez un mot de passe dans votre profil.');
        } else if (data.user.identities?.some(i => i.provider === 'google')) {
          // L'utilisateur a deja un compte Google avec cet email
          setError('Un compte Google existe deja avec cet email. Connectez-vous avec Google puis ajoutez un mot de passe dans votre profil.');
        } else {
          setSuccess('Compte cree ! Verifiez votre email pour confirmer votre inscription.');
          resetForm();
        }
      }
    } catch (err) {
      // Gerer l'erreur "User already registered"
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setError('Cet email est deja utilise. Si vous avez un compte Google, connectez-vous avec Google.');
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setView('forgot-sent');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  // Vue: Email envoye avec succes
  if (view === 'forgot-sent') {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 p-4 overflow-y-auto">
        <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Email envoye !</h2>
            <p className="text-slate-400 mb-6">
              Un lien de reinitialisation a ete envoye a <strong className="text-white">{email}</strong>.
              Verifiez votre boite de reception et vos spams.
            </p>
            <button
              onClick={() => { setView('login'); resetForm(); }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
            >
              Retour a la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vue: Mot de passe oublie
  if (view === 'forgot') {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 p-4 overflow-y-auto">
        <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 p-4 text-center relative">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-white">Mot de passe oublie</h2>
                <p className="text-slate-400 text-xs">Recuperez votre compte</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <p className="text-slate-400 text-sm mb-4">
              Entrez votre adresse email et nous vous enverrons un lien pour reinitialiser votre mot de passe.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                  placeholder="vous@exemple.com"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Envoyer le lien
              </button>
            </form>

            <button
              onClick={() => { setView('login'); setError(''); }}
              className="w-full mt-4 py-2 text-slate-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour a la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vue principale: Login / Signup
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 p-4 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-white">
                {view === 'login' ? 'Connexion' : 'Creer un compte'}
              </h2>
              <p className="text-slate-400 text-xs">
                {view === 'login' ? 'Accedez a votre espace' : 'Rejoignez Salarize'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => { setView('login'); resetForm(); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              view === 'login'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => { setView('signup'); resetForm(); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              view === 'signup'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-3 mb-4 disabled:opacity-70 disabled:cursor-wait"
          >
            {googleLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Connexion en cours...' : 'Continuer avec Google'}
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-slate-500 text-xs">ou par email</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Form */}
          <form onSubmit={view === 'login' ? handleEmailLogin : handleSignup} className="space-y-4">
            {view === 'signup' && (
              <div>
                <label className="text-sm text-slate-400 block mb-2">Nom complet</label>
                <input
                  type="text"
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                  placeholder="Jean Dupont"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 block mb-2">Email</label>
              <input
                type="email"
                id="auth-email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Mot de passe</label>
              <input
                type="password"
                id="auth-password"
                name="password"
                autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                placeholder="********"
              />
            </div>

            {view === 'signup' && (
              <div>
                <label className="text-sm text-slate-400 block mb-2">Confirmer le mot de passe</label>
                <input
                  type="password"
                  id="auth-confirm-password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                  placeholder="********"
                />
              </div>
            )}

            {view === 'login' && (
              <button
                type="button"
                onClick={() => { setView('forgot'); setError(''); }}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Mot de passe oublie ?
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {view === 'login' ? 'Se connecter' : 'Creer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
