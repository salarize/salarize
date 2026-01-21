// Storage qui utilise UNIQUEMENT sessionStorage (deconnexion a la fermeture du navigateur)
// avec sync entre onglets via localStorage events temporaires
export const sessionOnlyStorage = {
  getItem: (key) => {
    return sessionStorage.getItem(key);
  },

  setItem: (key, value) => {
    sessionStorage.setItem(key, value);
    // Supprimer de localStorage si present (nettoyage)
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
    // Broadcaster aux autres onglets via localStorage (temporaire)
    const broadcastKey = `__salarize_broadcast_${Date.now()}`;
    localStorage.setItem(broadcastKey, JSON.stringify({ key, value }));
    setTimeout(() => localStorage.removeItem(broadcastKey), 100);
  },

  removeItem: (key) => {
    sessionStorage.removeItem(key);
    // Aussi supprimer de localStorage si present
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
    // Broadcaster la suppression
    const broadcastKey = `__salarize_broadcast_${Date.now()}`;
    localStorage.setItem(broadcastKey, JSON.stringify({ key, value: null }));
    setTimeout(() => localStorage.removeItem(broadcastKey), 100);
  }
};

// Nettoyer les anciennes cles Supabase de localStorage au demarrage
export const cleanupOldStorage = () => {
  if (typeof window !== 'undefined') {
    // Supprimer toutes les cles Supabase de localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Ecouter les broadcasts pour sync entre onglets
export const setupStorageSync = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('__salarize_broadcast_') && e.newValue) {
        try {
          const { key, value } = JSON.parse(e.newValue);
          if (value === null) {
            sessionStorage.removeItem(key);
          } else {
            sessionStorage.setItem(key, value);
          }
          window.dispatchEvent(new Event('salarize-auth-sync'));
        } catch (err) {}
      }
    });
  }
};
