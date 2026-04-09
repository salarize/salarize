import { createClient } from '@supabase/supabase-js';
import { sessionOnlyStorage, cleanupOldStorage, setupStorageSync } from './storage';

// Supabase configuration
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://dbqlyxeorexihuitejvq.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicWx5eGVvcmV4aWh1aXRlanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzU3OTEsImV4cCI6MjA4NDAxMTc5MX0.QZKAv2vs5K_xwExc4P5GYtRaIr5DOIqIP_fh-BYR9Jo';

// Clean up old storage and setup sync
cleanupOldStorage();
setupStorageSync();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionOnlyStorage,
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'salarize-auth',
    detectSessionInUrl: false, // On gere manuellement le hash pour le recovery
  }
});

// Helper pour obtenir une session valide
export const getValidSession = async () => {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session) {
      session = refreshData.session;
    }
  }
  return session;
};
