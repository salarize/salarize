import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../config/supabase';

function ProfilePage({ user, onLogout, companies, setCurrentPage, onUpdateUser }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showSetPasswordSection, setShowSetPasswordSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const avatarInputRef = useRef(null);

  const isGoogleUser = user?.provider === 'google' || user?.picture?.includes('googleusercontent');

  // Verifier si l'utilisateur a deja un mot de passe defini
  useEffect(() => {
    const checkHasPassword = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          // Verifier si l'utilisateur a une identite email (mot de passe defini)
          const hasEmailIdentity = currentUser.identities?.some(i => i.provider === 'email');
          // Ou verifier dans app_metadata si un mot de passe a ete defini
          const hasPasswordSet = currentUser.app_metadata?.providers?.includes('email') || hasEmailIdentity;
          setHasPassword(hasPasswordSet);
        }
      } catch (err) {
        console.error('Error checking password status:', err);
      }
    };
    checkHasPassword();
  }, []);

  const memberSince = useMemo(() => {
    const months = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    if (user?.created_at) {
      const date = new Date(user.created_at);
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }, [user?.created_at]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Veuillez selectionner une image' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'L\'image ne doit pas depasser 2MB' });
      return;
    }

    setUploadingAvatar(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;

        const { error } = await supabase.auth.updateUser({
          data: { avatar_url: base64, picture: base64 }
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
          setUploadingAvatar(false);
          return;
        }

        const updatedUser = { ...user, picture: base64 };
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        sessionStorage.setItem('salarize_user', JSON.stringify(updatedUser));

        setMessage({ type: 'success', text: 'Photo de profil mise a jour' });
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors de l\'upload' });
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setMessage({ type: 'error', text: 'Le nom ne peut pas etre vide' });
      return;
    }

    if (editEmail !== user?.email && !editEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Email invalide' });
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        data: { full_name: editName, name: editName }
      };

      if (editEmail !== user?.email) {
        updateData.email = editEmail;
      }

      const { error } = await supabase.auth.updateUser(updateData);

      if (error) throw error;

      if (onUpdateUser) {
        onUpdateUser({ ...user, name: editName, email: editEmail });
      }

      const updatedUser = { ...user, name: editName, email: editEmail };
      sessionStorage.setItem('salarize_user', JSON.stringify(updatedUser));

      setMessage({ type: 'success', text: editEmail !== user?.email
        ? 'Profil mis a jour. Un email de confirmation a ete envoye.'
        : 'Profil mis a jour avec succes'
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Update error:', err);
      if (err.message?.includes('session') || err.message?.includes('JWT')) {
        setMessage({ type: 'error', text: 'Session expiree. Veuillez vous reconnecter.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Erreur lors de la mise a jour' });
      }
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Mot de passe modifie avec succes' });
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.message?.includes('session') || err.message?.includes('JWT')) {
        setMessage({ type: 'error', text: 'Session expiree. Veuillez vous reconnecter.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Erreur lors du changement de mot de passe' });
      }
    }
    setSaving(false);
  };

  // Definir un mot de passe pour les users Google
  const handleSetPassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Rafraichir la session pour mettre a jour les providers
      await supabase.auth.refreshSession();

      setHasPassword(true);
      setMessage({ type: 'success', text: 'Mot de passe defini avec succes ! Vous pouvez maintenant vous connecter avec votre email et ce mot de passe.' });
      setShowSetPasswordSection(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.message?.includes('session') || err.message?.includes('JWT')) {
        setMessage({ type: 'error', text: 'Session expiree. Veuillez vous reconnecter.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Erreur lors de la definition du mot de passe' });
      }
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Mon profil</h1>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour au dashboard
          </button>
        </div>

        {/* Message de feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {message.type === 'success' ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto text-slate-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Infos profil */}
          <div className="lg:col-span-1 space-y-6">
            {/* Carte profil */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 p-6 text-center">
                <div className="relative inline-block group">
                  {user?.picture && user?.provider === 'google' ? (
                    <img
                      src={user.picture}
                      alt=""
                      className="w-24 h-24 rounded-2xl mx-auto border-4 border-white/20 object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl mx-auto border-4 border-white/20 bg-violet-500 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    id="avatar-upload"
                    name="avatar"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  {isGoogleUser && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-2">Cliquez pour changer</p>
                <h2 className="text-xl font-bold text-white mt-2">{user?.name}</h2>
                <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs text-slate-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Compte actif
                </div>
              </div>

              <div className="p-4 border-t border-slate-800">
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 text-sm">Membre depuis</span>
                  <span className="text-white text-sm">{memberSince}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 text-sm">Type de compte</span>
                  <span className="text-white text-sm">{isGoogleUser ? 'Google' : 'Email'}</span>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-2">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Dashboard</p>
                  <p className="text-slate-500 text-xs">Voir mes donnees</p>
                </div>
              </button>

              <button
                onClick={() => setCurrentPage('features')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-fuchsia-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Fonctionnalites</p>
                  <p className="text-slate-500 text-xs">Decouvrir Salarize</p>
                </div>
              </button>
            </div>
          </div>

          {/* Colonne droite - Parametres */}
          <div className="lg:col-span-2 space-y-6">
            {/* Modifier le profil */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Informations personnelles</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">Nom complet</label>
                    <input
                      type="text"
                      id="profile-name"
                      name="fullName"
                      autoComplete="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">
                      Email
                      {isGoogleUser && <span className="text-amber-400 ml-2">(lie a Google)</span>}
                    </label>
                    <input
                      type="email"
                      id="profile-email"
                      name="email"
                      autoComplete="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={isGoogleUser}
                      className={`w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors ${isGoogleUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder="votre@email.com"
                    />
                    {isGoogleUser && (
                      <p className="text-xs text-slate-500 mt-2">L'email est gere par votre compte Google</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user?.name || '');
                        setEditEmail(user?.email || '');
                      }}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving && (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-800">
                    <span className="text-slate-400">Nom</span>
                    <span className="text-white">{user?.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400">Email</span>
                    <span className="text-white">{user?.email}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Securite - Section mot de passe */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Securite</h3>
                  <p className="text-slate-500 text-xs">Gerez vos methodes de connexion</p>
                </div>
              </div>

              {/* Methode de connexion actuelle */}
              <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isGoogleUser ? (
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">
                        {isGoogleUser ? 'Connexion Google' : 'Connexion par email'}
                      </p>
                      <p className="text-slate-500 text-xs">{user?.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">Actif</span>
                </div>
              </div>

              {/* Pour les users Google : option de definir un mot de passe */}
              {isGoogleUser && !hasPassword && (
                <>
                  {!showSetPasswordSection ? (
                    <div className="p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-xl border border-violet-500/20">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">Ajouter un mot de passe</p>
                          <p className="text-slate-400 text-xs mt-1">
                            Definissez un mot de passe pour pouvoir vous connecter avec votre email en plus de Google.
                          </p>
                          <button
                            onClick={() => setShowSetPasswordSection(true)}
                            className="mt-3 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Definir un mot de passe
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-blue-300 text-xs flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Ce mot de passe vous permettra de vous connecter avec votre email ({user?.email}) en plus de Google.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Nouveau mot de passe</label>
                        <input
                          type="password"
                          id="profile-set-password"
                          name="setPassword"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                          placeholder="Minimum 6 caracteres"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Confirmer le mot de passe</label>
                        <input
                          type="password"
                          id="profile-set-confirm-password"
                          name="setConfirmPassword"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                          placeholder="Confirmez votre mot de passe"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setShowSetPasswordSection(false);
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleSetPassword}
                          disabled={saving || newPassword.length < 6}
                          className="flex-1 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {saving && (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          Definir le mot de passe
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Message de succes apres avoir defini un mot de passe */}
              {isGoogleUser && hasPassword && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-emerald-300 text-sm font-medium">Mot de passe configure</p>
                      <p className="text-slate-400 text-xs">Vous pouvez vous connecter avec Google ou avec votre email et mot de passe.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pour les users email : modifier le mot de passe */}
              {!isGoogleUser && (
                <>
                  <div className="flex items-center justify-between mb-4 mt-4 pt-4 border-t border-slate-800">
                    <h4 className="text-white font-medium">Mot de passe</h4>
                    {!showPasswordSection && (
                      <button
                        onClick={() => setShowPasswordSection(true)}
                        className="px-4 py-2 text-sm text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                      >
                        Modifier
                      </button>
                    )}
                  </div>

                  {showPasswordSection ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Nouveau mot de passe</label>
                        <input
                          type="password"
                          id="profile-new-password"
                          name="newPassword"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                          placeholder="********"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Confirmer le mot de passe</label>
                        <input
                          type="password"
                          id="profile-confirm-password"
                          name="confirmPassword"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                          placeholder="********"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setShowPasswordSection(false);
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleChangePassword}
                          disabled={saving || newPassword.length < 6}
                          className="flex-1 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          Changer le mot de passe
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">************</p>
                  )}
                </>
              )}
            </div>

            {/* Mes societes */}
            {Object.keys(companies || {}).length > 0 && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Mes societes</h3>
                <div className="space-y-2">
                  {Object.entries(companies || {}).map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {data.logo ? (
                          <img src={data.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                            {name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{name}</p>
                          <p className="text-slate-500 text-xs">
                            {new Set((data.employees || []).map(e => e.name)).size} employes - {(data.periods || []).length} periodes
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentPage('dashboard')}
                        className="px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                      >
                        Voir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zone danger */}
            <div className="bg-slate-900 rounded-2xl border border-red-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Zone dangereuse</h3>
              <p className="text-slate-400 text-sm mb-4">Ces actions sont irreversibles.</p>

              <div className="space-y-3">
                <button
                  onClick={onLogout}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Se deconnecter
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer mon compte
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal confirmation suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
            <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-white text-center mb-2">Supprimer votre compte ?</h3>
              <p className="text-slate-400 text-center text-sm mb-6">
                Cette action supprimera definitivement votre compte et toutes vos donnees. Cette action est irreversible.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      if (currentUser) {
                        await supabase.from('companies').delete().eq('user_id', currentUser.id);
                      }
                      await supabase.auth.signOut();
                      onLogout();
                    } catch (err) {
                      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
                    }
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
