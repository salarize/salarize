import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://dbqlyxeorexihuitejvq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicWx5eGVvcmV4aWh1aXRlanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzU3OTEsImV4cCI6MjA4NDAxMTc5MX0.QZKAv2vs5K_xwExc4P9GYtRaIr5DOIqIP_fh-BYR9Jo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_DEPARTMENTS = ['Cuisine', 'Admin', 'Livreur', 'Plonge', 'SAV', 'OPÉR/LIVRAI', 'PREPA COMM', 'MISE EN BAR', 'DIRECTION'];

// Couleurs pour les graphiques
const CHART_COLORS = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#DDD6FE', '#EDE9FE', '#F5F3FF'];

// Landing Page Header
function LandingHeader({ user, onLogin, onLogout, currentPage, setCurrentPage }) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-lg border-b border-white/10 z-50">
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-bold text-xl">Salarize</span>
        </button>
        
        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => setCurrentPage('home')}
            className={`text-sm font-medium transition-colors ${currentPage === 'home' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Accueil
          </button>
          <button 
            onClick={() => setCurrentPage('features')}
            className={`text-sm font-medium transition-colors ${currentPage === 'features' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Fonctionnalités
          </button>
          {user && (
            <button 
              onClick={() => setCurrentPage('dashboard')}
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
                <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
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
                      onClick={() => { setCurrentPage('profile'); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mon profil
                    </button>
                    <button 
                      onClick={() => { setCurrentPage('dashboard'); setShowDropdown(false); }}
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
                        Se déconnecter
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
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Landing Page Component
function LandingPage({ onLogin, user, onGoToDashboard }) {
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
              Analysez vos coûts
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                salariaux
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Importez vos fichiers Acerta, visualisez vos données par département, 
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
                <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all">
                  Voir la démo
                </button>
              )}
            </div>
          </div>
          
          {/* Preview Image Placeholder */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
              <div className="bg-slate-900 rounded-xl p-8 min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                    <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm">Aperçu du dashboard</p>
                </div>
              </div>
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
            Une solution complète pour gérer et analyser vos coûts salariaux
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
              Importez vos fichiers Acerta et Excel. Détection automatique des colonnes et des périodes.
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
              Graphiques interactifs, répartition par département, évolution mensuelle de vos coûts.
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
              Générez des rapports PDF et Excel prêts à présenter à vos clients ou à la direction.
            </p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-3xl p-12 border border-violet-500/20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {user ? 'Accédez à votre dashboard' : 'Prêt à simplifier votre gestion ?'}
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
            {user ? 'Analysez vos données salariales et générez des rapports.' : 'Rejoignez les consultants qui utilisent Salarize pour leurs analyses salariales.'}
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
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-white font-bold">Salarize</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2025 Salarize. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Features Page
function FeaturesPage({ onLogin, user, onGoToDashboard }) {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      title: "Import multi-formats",
      description: "Importez vos fichiers Acerta, Excel (.xlsx, .xls) et CSV. Détection automatique des colonnes et mapping intelligent des données.",
      details: ["Export Acerta", "Fichiers Excel", "Détection automatique", "Mapping intelligent"]
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Visualisation avancée",
      description: "Graphiques interactifs pour comprendre la répartition de vos coûts. Vue par département, évolution temporelle, comparaisons.",
      details: ["Graphiques interactifs", "Répartition par département", "Évolution mensuelle", "Comparaisons"]
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Export professionnel",
      description: "Générez des rapports PDF prêts à présenter à vos clients. Export Excel pour analyses détaillées.",
      details: ["Rapports PDF", "Export Excel", "Logo personnalisé", "Prêt à présenter"]
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: "Multi-sociétés",
      description: "Gérez plusieurs entreprises depuis un seul compte. Chaque société a ses propres données et paramètres.",
      details: ["Plusieurs sociétés", "Données isolées", "Logo par société", "Switching rapide"]
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Gestion des départements",
      description: "Assignez vos employés aux départements, fusionnez ou renommez les départements existants.",
      details: ["Assignation rapide", "Fusion départements", "Renommage", "Filtres avancés"]
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
      title: "Synchronisation cloud",
      description: "Vos données sont automatiquement sauvegardées et synchronisées. Accédez-y depuis n'importe quel appareil.",
      details: ["Sauvegarde auto", "Sync temps réel", "Multi-appareils", "Données sécurisées"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-slate-950 to-fuchsia-600/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-violet-500/20 to-transparent rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Fonctionnalités
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Découvrez tous les outils pour simplifier votre analyse salariale
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50 hover:border-violet-500/50 transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-6 text-violet-400">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 mb-4">{feature.description}</p>
              <ul className="space-y-2">
                {feature.details.map((detail, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-3xl p-12 border border-violet-500/20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à commencer ?
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
            Créez votre compte gratuitement et importez vos premières données.
          </p>
          <button 
            onClick={user ? onGoToDashboard : onLogin}
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25"
          >
            {user ? 'Aller au dashboard' : 'Commencer gratuitement'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-white font-bold">Salarize</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2025 Salarize. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Profile Page
function ProfilePage({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-white mb-8">Mon profil</h1>
        
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 p-8">
            <div className="flex items-center gap-6">
              <img src={user.picture} alt="" className="w-20 h-20 rounded-2xl" />
              <div>
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <p className="text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>
          
          {/* Profile Details */}
          <div className="p-8 space-y-6">
            <div>
              <label className="text-sm text-slate-500 block mb-2">Nom complet</label>
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-white">{user.name}</div>
            </div>
            <div>
              <label className="text-sm text-slate-500 block mb-2">Email</label>
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-white">{user.email}</div>
            </div>
            <div>
              <label className="text-sm text-slate-500 block mb-2">Connexion</label>
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-white flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-8 border-t border-slate-800">
            <button 
              onClick={onLogout}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Header (for when in dashboard view)
function DashboardHeader({ user, onLogout, setCurrentPage }) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className="fixed top-0 right-0 left-64 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
      {/* Left side - Home link */}
      <button 
        onClick={() => setCurrentPage('home')}
        className="flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-sm font-medium">Accueil</span>
      </button>
      
      {/* Right side - Profile */}
      <div className="relative">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <img src={user?.picture} alt="" className="w-8 h-8 rounded-full" />
          <span className="text-slate-700 text-sm font-medium hidden sm:block">{user?.name?.split(' ')[0]}</span>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDropdown && (
          <>
            <div className="fixed inset-0" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg py-2 w-48 z-50">
              <button 
                onClick={() => { setCurrentPage('home'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Accueil
              </button>
              <button 
                onClick={() => { setCurrentPage('profile'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mon profil
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button 
                onClick={() => { onLogout(); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Old Header removed - we use LandingHeader and DashboardHeader now

// Modal component OUTSIDE of App to prevent re-renders
function SelectCompanyModal({ companies, newName, setNewName, onSelect, onCancel }) {
  const companyNames = Object.keys(companies);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">📊 Importer vers quelle société ?</h2>
        
        {companyNames.length > 0 && (
          <>
            <p className="text-slate-500 text-sm mb-3">Société existante :</p>
            <div className="space-y-2 mb-4">
              {companyNames.map(name => (
                <button
                  key={name}
                  onClick={() => onSelect(name)}
                  className="w-full text-left px-4 py-3 border-2 border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 transition-all"
                >
                  <span className="font-semibold">{name}</span>
                  <span className="text-slate-400 text-sm ml-2">({companies[name]?.employees?.length || 0} entrées)</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-sm">ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </>
        )}
        
        <p className="text-slate-500 text-sm mb-2">Nouvelle société :</p>
        <input
          type="text"
          placeholder="Nom (ex: Mamy Home, Fresheo...)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newName.trim()) {
              onSelect(newName.trim());
            }
          }}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl mb-4 focus:border-violet-500 outline-none"
          autoFocus
        />
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={() => newName.trim() && onSelect(newName.trim())}
            disabled={!newName.trim()}
            className="flex-1 py-2 bg-violet-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-violet-600"
          >
            Créer & Importer
          </button>
        </div>
      </div>
    </div>
  );
}

// Sidebar component OUTSIDE of App
function Sidebar({ companies, activeCompany, onSelectCompany, onImportClick, onAddCompany, onManageData, onManageDepts, debugMsg, setCurrentPage }) {
  const [showActions, setShowActions] = useState(false);
  
  // Calculer le nombre d'employés non assignés pour la société active
  const unassignedCount = activeCompany && companies[activeCompany] 
    ? new Set(
        (companies[activeCompany].employees || [])
          .filter(e => !e.department && !companies[activeCompany].mapping?.[e.name])
          .map(e => e.name)
      ).size
    : 0;
  
  return (
    <div className="w-64 bg-slate-900 text-white fixed h-screen flex flex-col">
      <button 
        onClick={() => setCurrentPage && setCurrentPage('home')}
        className="p-6 border-b border-slate-700 flex items-center gap-3 hover:bg-slate-800 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <span className="text-white font-black text-lg">S</span>
        </div>
        <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Salarize</span>
      </button>
      
      {/* Alerte employés non assignés */}
      {unassignedCount > 0 && (
        <button
          onClick={onManageDepts}
          className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 hover:bg-amber-500/20 transition-colors"
        >
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-amber-400 text-xs font-semibold">{unassignedCount} sans département</p>
            <p className="text-amber-400/60 text-[10px]">Cliquer pour assigner</p>
          </div>
        </button>
      )}
      
      <div className="flex-1 p-4 overflow-y-auto">
        <p className="text-slate-500 text-xs uppercase mb-2">Sociétés</p>
        {Object.keys(companies).length === 0 ? (
          <p className="text-slate-600 text-sm">Aucune société</p>
        ) : (
          Object.keys(companies).map(name => (
            <button
              key={name}
              onClick={() => onSelectCompany(name)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors flex items-center gap-2 ${
                activeCompany === name ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {companies[name]?.logo ? (
                <img src={companies[name].logo} alt="" className="w-6 h-6 rounded object-cover" />
              ) : (
                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold">
                  {name.charAt(0)}
                </div>
              )}
              <span className="truncate">{name}</span>
            </button>
          ))
        )}
      </div>
      
      {/* Actions Menu */}
      <div className="p-4 border-t border-slate-700 relative">
        {showActions && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowActions(false)}
            />
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-20">
              <button
                onClick={() => { onAddCompany(); setShowActions(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Nouvelle société</p>
                  <p className="text-slate-400 text-xs">Créer une société vide</p>
                </div>
              </button>
              
              <button
                onClick={() => { onImportClick(); setShowActions(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-fuchsia-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Importer des données</p>
                  <p className="text-slate-400 text-xs">Fichier Excel (.xlsx)</p>
                </div>
              </button>
              
              {activeCompany && (
                <button
                  onClick={() => { onManageData(); setShowActions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left border-t border-slate-700"
                >
                  <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Gérer {activeCompany}</p>
                    <p className="text-slate-400 text-xs">Données, périodes, supprimer</p>
                  </div>
                </button>
              )}
              
              {activeCompany && (
                <button
                  onClick={() => { onManageDepts(); setShowActions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Gérer les départements</p>
                    <p className="text-slate-400 text-xs">Réassigner, renommer, fusionner</p>
                  </div>
                </button>
              )}
            </div>
          </>
        )}
        
        <button
          onClick={() => setShowActions(!showActions)}
          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-center py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <svg className={`w-5 h-5 transition-transform ${showActions ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Actions
        </button>
        
        {debugMsg && (
          <p className="text-xs text-slate-400 mt-2 text-center">{debugMsg}</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // Helper pour formater les périodes (2024-03 → Mars 2024)
  const formatPeriod = (period) => {
    if (!period || period === 'Unknown') return period;
    const [year, month] = period.split('-');
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${year}`;
    }
    return period;
  };

  const [companies, setCompanies] = useState({});
  const [activeCompany, setActiveCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departmentMapping, setDepartmentMapping] = useState({});
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [view, setView] = useState('upload');
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [debugMsg, setDebugMsg] = useState('');
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [showDataManager, setShowDataManager] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'clear' | 'delete' | 'deletePeriod', period?: string }
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingPeriodSelection, setPendingPeriodSelection] = useState(null); // { data, detectedPeriods }
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showRenameDept, setShowRenameDept] = useState(false);
  const [renameDeptOld, setRenameDeptOld] = useState('');
  const [renameDeptNew, setRenameDeptNew] = useState('');
  const [showMergeDept, setShowMergeDept] = useState(false);
  const [mergeDeptFrom, setMergeDeptFrom] = useState('');
  const [mergeDeptTo, setMergeDeptTo] = useState('');
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'features', 'profile', 'dashboard'
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [comparePeriod, setComparePeriod] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // Employee detail section states
  const [empSearchTerm, setEmpSearchTerm] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('all');
  const [empSortBy, setEmpSortBy] = useState('cost-desc');
  const [empCurrentPage, setEmpCurrentPage] = useState(1);

  // Reset pagination when filters change
  useEffect(() => {
    setEmpCurrentPage(1);
  }, [empSearchTerm, empDeptFilter, empSortBy]);

  // Check auth state on load
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata?.avatar_url
        });
        loadFromSupabase(session.user.id);
      } else {
        // Not logged in, load from localStorage
        loadFromLocalStorage();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata?.avatar_url
        });
        loadFromSupabase(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCompanies({});
        setActiveCompany(null);
        setEmployees([]);
        setView('upload');
        setCurrentPage('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data from localStorage (for non-logged-in users)
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('salarize_data_v4');
      if (saved) {
        const data = JSON.parse(saved);
        setCompanies(data.companies || {});
        if (data.activeCompany && data.companies?.[data.activeCompany]) {
          loadCompany(data.activeCompany, data.companies);
        }
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  // Load data from Supabase
  const loadFromSupabase = async (userId) => {
    setIsLoading(true);
    try {
      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId);

      if (companiesError) throw companiesError;

      const loadedCompanies = {};
      
      for (const company of companiesData || []) {
        // Load employees for this company
        const { data: employeesData } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', company.id);

        // Load mappings for this company
        const { data: mappingsData } = await supabase
          .from('department_mappings')
          .select('*')
          .eq('company_id', company.id);

        const mapping = {};
        (mappingsData || []).forEach(m => {
          mapping[m.employee_name] = m.department;
        });

        const emps = (employeesData || []).map(e => ({
          name: e.name,
          department: e.department,
          function: e.function,
          totalCost: parseFloat(e.total_cost) || 0,
          period: e.period
        }));

        const periods = [...new Set(emps.map(e => e.period).filter(Boolean))].sort();

        loadedCompanies[company.name] = {
          id: company.id,
          employees: emps,
          mapping,
          periods,
          logo: company.logo,
          brandColor: company.brand_color,
          website: company.website
        };
      }

      setCompanies(loadedCompanies);
      
      // Load first company if exists
      const companyNames = Object.keys(loadedCompanies);
      if (companyNames.length > 0) {
        loadCompany(companyNames[0], loadedCompanies);
      }
    } catch (e) {
      console.error('Error loading from Supabase:', e);
    }
    setIsLoading(false);
  };

  // Save to Supabase
  const saveToSupabase = async (newCompanies, activeCompanyName) => {
    if (!user?.id) {
      // Not logged in, save to localStorage
      saveToLocalStorage(newCompanies, activeCompanyName);
      return;
    }

    setIsSyncing(true);
    try {
      for (const [companyName, companyData] of Object.entries(newCompanies)) {
        let companyId = companyData.id;

        // Create or update company
        if (!companyId) {
          const { data: newCompany, error } = await supabase
            .from('companies')
            .insert({
              user_id: user.id,
              name: companyName,
              logo: companyData.logo || null,
              brand_color: companyData.brandColor || null,
              website: companyData.website || null
            })
            .select()
            .single();

          if (error) throw error;
          companyId = newCompany.id;
          newCompanies[companyName].id = companyId;
        } else {
          await supabase
            .from('companies')
            .update({
              logo: companyData.logo || null,
              brand_color: companyData.brandColor || null,
              website: companyData.website || null
            })
            .eq('id', companyId);
        }

        // Delete existing employees and mappings for this company
        await supabase.from('employees').delete().eq('company_id', companyId);
        await supabase.from('department_mappings').delete().eq('company_id', companyId);

        // Insert employees
        if (companyData.employees?.length > 0) {
          const employeesToInsert = companyData.employees.map(e => ({
            company_id: companyId,
            name: e.name,
            department: e.department || null,
            function: e.function || null,
            total_cost: e.totalCost,
            period: e.period
          }));

          await supabase.from('employees').insert(employeesToInsert);
        }

        // Insert mappings
        const mappingEntries = Object.entries(companyData.mapping || {});
        if (mappingEntries.length > 0) {
          const mappingsToInsert = mappingEntries.map(([empName, dept]) => ({
            company_id: companyId,
            employee_name: empName,
            department: dept
          }));

          await supabase.from('department_mappings').insert(mappingsToInsert);
        }
      }

      setCompanies(newCompanies);
    } catch (e) {
      console.error('Error saving to Supabase:', e);
    }
    setIsSyncing(false);
  };

  // Save to localStorage (for non-logged-in users)
  const saveToLocalStorage = (newCompanies, active) => {
    try {
      localStorage.setItem('salarize_data_v4', JSON.stringify({
        companies: newCompanies,
        activeCompany: active
      }));
    } catch (e) { console.error(e); }
  };

  // Unified save function
  const saveAll = (newCompanies, active) => {
    if (user?.id) {
      saveToSupabase(newCompanies, active);
    } else {
      saveToLocalStorage(newCompanies, active);
    }
    setLastSaved(new Date());
  };

  // Export Excel amélioré
  const exportToExcel = () => {
    if (!activeCompany || employees.length === 0) return;
    
    const company = companies[activeCompany];
    const filtered = selectedPeriod === 'all' 
      ? employees 
      : employees.filter(e => e.period === selectedPeriod);
    
    // Feuille 1 : Résumé
    const deptData = {};
    filtered.forEach(e => {
      const dept = e.department || departmentMapping[e.name] || 'Non assigné';
      if (!deptData[dept]) deptData[dept] = { count: 0, cost: 0 };
      deptData[dept].count++;
      deptData[dept].cost += e.totalCost;
    });
    
    const summaryData = Object.entries(deptData).map(([dept, data]) => ({
      'Département': dept,
      'Nombre d\'employés': data.count,
      'Coût total (€)': Math.round(data.cost * 100) / 100,
      'Coût moyen (€)': Math.round((data.cost / data.count) * 100) / 100
    }));
    
    const totalCost = filtered.reduce((sum, e) => sum + e.totalCost, 0);
    summaryData.push({
      'Département': 'TOTAL',
      'Nombre d\'employés': filtered.length,
      'Coût total (€)': Math.round(totalCost * 100) / 100,
      'Coût moyen (€)': Math.round((totalCost / filtered.length) * 100) / 100
    });
    
    // Feuille 2 : Détail employés
    const detailData = filtered.map(e => ({
      'Nom': e.name,
      'Département': e.department || departmentMapping[e.name] || 'Non assigné',
      'Fonction': e.function || '-',
      'Période': formatPeriod(e.period),
      'Coût total (€)': Math.round(e.totalCost * 100) / 100
    }));
    
    // Créer le workbook
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(detailData);
    
    XLSX.utils.book_append_sheet(wb, ws1, 'Résumé par département');
    XLSX.utils.book_append_sheet(wb, ws2, 'Détail employés');
    
    // Télécharger
    const periodStr = selectedPeriod === 'all' ? 'Complet' : formatPeriod(selectedPeriod);
    XLSX.writeFile(wb, `Salarize_${activeCompany}_${periodStr}.xlsx`);
  };

  // Export PDF
  const exportToPDF = async () => {
    if (!activeCompany || employees.length === 0) return;
    
    const company = companies[activeCompany];
    const filtered = selectedPeriod === 'all' 
      ? employees 
      : employees.filter(e => e.period === selectedPeriod);
    
    // Calculs
    const totalCost = filtered.reduce((sum, e) => sum + e.totalCost, 0);
    const avgCost = totalCost / filtered.length;
    
    const deptData = {};
    filtered.forEach(e => {
      const dept = e.department || departmentMapping[e.name] || 'Non assigné';
      if (!deptData[dept]) deptData[dept] = { count: 0, cost: 0 };
      deptData[dept].count++;
      deptData[dept].cost += e.totalCost;
    });
    
    const deptArray = Object.entries(deptData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.cost - a.cost);
    
    // Top 10 employés
    const empAgg = {};
    filtered.forEach(e => {
      if (!empAgg[e.name]) empAgg[e.name] = { name: e.name, dept: e.department || departmentMapping[e.name] || 'Non assigné', cost: 0 };
      empAgg[e.name].cost += e.totalCost;
    });
    const topEmployees = Object.values(empAgg).sort((a, b) => b.cost - a.cost).slice(0, 10);
    
    // Charger jsPDF dynamiquement
    const jsPDFModule = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const { jsPDF } = jsPDFModule.default || window.jspdf;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    
    // Header avec couleur
    doc.setFillColor(139, 92, 246); // violet
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Titre
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport Salarial', 20, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(activeCompany, 20, 35);
    
    // Période
    const periodStr = selectedPeriod === 'all' ? 'Toutes périodes' : formatPeriod(selectedPeriod);
    doc.text(periodStr, pageWidth - 20, 25, { align: 'right' });
    doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth - 20, 35, { align: 'right' });
    
    y = 55;
    
    // Chiffres clés
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Chiffres clés', 20, y);
    y += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Box pour les KPIs
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, 'F');
    
    doc.text(`Coût total: ${totalCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, 30, y + 12);
    doc.text(`Nombre d'employés: ${filtered.length}`, 30, y + 24);
    doc.text(`Coût moyen: ${avgCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, pageWidth / 2, y + 12);
    doc.text(`Départements: ${Object.keys(deptData).length}`, pageWidth / 2, y + 24);
    
    y += 50;
    
    // Répartition par département
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Répartition par département', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Table header
    doc.setFillColor(139, 92, 246);
    doc.setTextColor(255, 255, 255);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.text('Département', 25, y + 6);
    doc.text('Employés', 100, y + 6);
    doc.text('Coût', 140, y + 6);
    doc.text('%', 175, y + 6);
    y += 8;
    
    doc.setTextColor(0, 0, 0);
    deptArray.forEach((dept, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const bgColor = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(...bgColor);
      doc.rect(20, y, pageWidth - 40, 8, 'F');
      doc.text(dept.name.substring(0, 25), 25, y + 6);
      doc.text(String(dept.count), 100, y + 6);
      doc.text(dept.cost.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €', 140, y + 6);
      doc.text(((dept.cost / totalCost) * 100).toFixed(1) + '%', 175, y + 6);
      y += 8;
    });
    
    y += 15;
    
    // Top 10 employés
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 10 employés par coût', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Table header
    doc.setFillColor(139, 92, 246);
    doc.setTextColor(255, 255, 255);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.text('#', 25, y + 6);
    doc.text('Nom', 35, y + 6);
    doc.text('Département', 100, y + 6);
    doc.text('Coût', 155, y + 6);
    y += 8;
    
    doc.setTextColor(0, 0, 0);
    topEmployees.forEach((emp, i) => {
      const bgColor = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(...bgColor);
      doc.rect(20, y, pageWidth - 40, 8, 'F');
      doc.text(String(i + 1), 25, y + 6);
      doc.text(emp.name.substring(0, 30), 35, y + 6);
      doc.text(emp.dept.substring(0, 20), 100, y + 6);
      doc.text(emp.cost.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €', 155, y + 6);
      y += 8;
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Généré par Salarize - Page ${i}/${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    }
    
    // Télécharger
    doc.save(`Rapport_${activeCompany}_${periodStr.replace(/ /g, '_')}.pdf`);
  };

  // Google Login
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://salarize.pages.dev'
      }
    });
    if (error) console.error('Login error:', error);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCompanies({});
    setActiveCompany(null);
    setEmployees([]);
    setView('upload');
  };

  const loadCompany = (name, comps = companies) => {
    const c = comps[name];
    if (!c) return;
    setActiveCompany(name);
    setEmployees(c.employees || []);
    setDepartmentMapping(c.mapping || {});
    setPeriods(c.periods || []);
    setSelectedPeriod('all');
    setView('dashboard');
  };

  const parseFile = (file) => {
    if (!file) return;
    
    setDebugMsg('Lecture...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        
        setDebugMsg('Analyse...');
        
        // Find best sheet
        let sheetName = wb.SheetNames[0];
        for (const name of wb.SheetNames) {
          const lower = name.toLowerCase();
          if (lower.includes('données') && lower.includes('salaire')) {
            sheetName = name;
            break;
          }
        }
        
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Try parse - Acerta FR first, then Acerta NL, then internal
        let result = parseAcerta(rows);
        if (!result) {
          result = parseAcertaNL(rows);
        }
        if (!result) {
          result = parseInternal(rows);
        }
        
        if (!result || result.employees.length === 0) {
          setDebugMsg('Aucune donnée');
          alert('Aucune donnée trouvée dans ce fichier');
          return;
        }
        
        console.log('Parsed successfully:', result.employees.length, 'employees');
        setDebugMsg(`✓ ${result.employees.length} entrées trouvées`);
        
        // Stocker les données et demander la période (sans importer encore)
        setPendingPeriodSelection({
          employees: result.employees
        });
        setShowImportModal(false);
        
      } catch (err) {
        console.error(err);
        setDebugMsg('Erreur: ' + err.message);
      }
    };
    
    reader.onerror = () => {
      setDebugMsg('Erreur lecture');
    };
    
    reader.readAsArrayBuffer(file);
  };

  const parseAcerta = (rows) => {
    if (!rows || rows.length === 0) return null;
    
    // Find header row with 'Clé Acerta'
    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      
      // Check if any cell contains 'Clé Acerta'
      for (let j = 0; j < row.length; j++) {
        if (row[j] === 'Clé Acerta') {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx !== -1) break;
    }
    
    if (headerIdx === -1) return null;
    
    console.log('Acerta header found at row', headerIdx);

    const h = rows[headerIdx];
    const cols = {
      nom: h.indexOf('Nom'),
      dept: h.indexOf('Centre de frais'),
      func: h.indexOf('Fonction'),
      cost: h.indexOf('Coûts salariaux totaux')
    };
    
    console.log('Acerta columns:', cols);
    
    if (cols.nom === -1 || cols.cost === -1) return null;

    // Get period from early rows
    let period = 'Unknown';
    for (let i = 0; i < Math.min(10, headerIdx); i++) {
      const cell = rows[i]?.[0];
      if (cell && typeof cell === 'string') {
        const match = cell.match(/Période salariale[:\s]+(\d{2})-(\d{2})-(\d{4})/);
        if (match) {
          period = `${match[3]}-${match[2]}`;
          break;
        }
      }
    }

    const emps = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[cols.nom]) continue;
      
      // Skip sub-header rows
      if (r[cols.nom] === 'Nom' || String(r[cols.nom]).startsWith('(=')) continue;
      
      const cost = parseFloat(r[cols.cost]) || 0;
      if (cost === 0) continue;
      
      emps.push({
        name: String(r[cols.nom]),
        department: r[cols.dept] ? String(r[cols.dept]) : null,
        function: r[cols.func] ? String(r[cols.func]) : '',
        totalCost: cost,
        period
      });
    }
    
    console.log('Acerta parsed', emps.length, 'employees');
    return emps.length > 0 ? { employees: emps, periods: [period] } : null;
  };

  // Parser pour format Acerta NL (néerlandais) avec colonnes Naam, Totale loonkost, Datum in dienst
  const parseAcertaNL = (rows) => {
    if (!rows || rows.length === 0) return null;
    
    // Chercher la ligne d'en-tête avec "Naam" ou "Acerta-sleutel"
    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      
      const hasNaam = row.some(c => c === 'Naam');
      const hasAcerta = row.some(c => c === 'Acerta-sleutel');
      if (hasNaam && hasAcerta) {
        headerIdx = i;
        break;
      }
    }
    
    if (headerIdx === -1) return null;
    
    console.log('Acerta NL header found at row', headerIdx);
    
    const h = rows[headerIdx];
    
    // Trouver les indices des colonnes
    const findCol = (names) => {
      for (const name of names) {
        const idx = h.findIndex(c => c && String(c).toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };
    
    const cols = {
      nom: h.indexOf('Naam'),
      cost: h.indexOf('Totale loonkost'),
      dept: findCol(['Kostenplaatscode', 'Kostenplaats']),
      dateIn: h.indexOf('Datum in dienst'),
      dateOut: h.indexOf('Datum uit dienst')
    };
    
    console.log('Acerta NL columns:', cols);
    
    if (cols.nom === -1 || cols.cost === -1) return null;
    
    const emps = [];
    const periodsSet = new Set();
    
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[cols.nom]) continue;
      
      const name = String(r[cols.nom]).trim();
      if (!name || name === 'Naam') continue;
      
      const cost = parseFloat(r[cols.cost]) || 0;
      if (cost === 0) continue;
      
      // Département
      let department = null;
      if (cols.dept !== -1 && r[cols.dept]) {
        department = String(r[cols.dept]).trim();
        if (department.toLowerCase() === 'nan' || department === '') department = null;
      }
      
      // Période depuis Datum in dienst
      let period = 'Unknown';
      if (cols.dateIn !== -1 && r[cols.dateIn]) {
        const dateVal = r[cols.dateIn];
        if (dateVal instanceof Date && !isNaN(dateVal)) {
          const y = dateVal.getFullYear();
          const m = String(dateVal.getMonth() + 1).padStart(2, '0');
          period = `${y}-${m}`;
        } else {
          const dateStr = String(dateVal);
          // Format YYYY-MM-DD ou DD-MM-YYYY ou DD/MM/YYYY
          const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
          const euMatch = dateStr.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/);
          if (isoMatch) {
            period = `${isoMatch[1]}-${isoMatch[2]}`;
          } else if (euMatch) {
            period = `${euMatch[3]}-${euMatch[2]}`;
          }
        }
      }
      
      periodsSet.add(period);
      emps.push({
        name,
        department,
        function: '',
        totalCost: cost,
        period
      });
    }
    
    console.log('Acerta NL parsed', emps.length, 'employees for periods:', [...periodsSet]);
    return emps.length > 0 ? { employees: emps, periods: [...periodsSet].sort() } : null;
  };

  const parseInternal = (rows) => {
    if (!rows || rows.length === 0) return null;
    
    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      const hasDept = row.some(c => c === 'Département');
      const hasPeriod = row.some(c => c === 'Année-mois');
      if (hasDept && hasPeriod) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return null;

    const h = rows[headerIdx];
    const cols = {
      dept: h.findIndex(c => c === 'Département'),
      period: h.findIndex(c => c === 'Année-mois'),
      nom: h.findIndex(c => c && String(c).includes('Nom')),
      prenom: h.findIndex(c => c && String(c).includes('Prénom')),
      cost: h.findIndex(c => c === 'Net' || (c && String(c).includes('Coût')))
    };

    if (cols.nom === -1 || cols.cost === -1) return null;

    const emps = [];
    const periodsSet = new Set();

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[cols.nom]) continue;
      const cost = parseFloat(r[cols.cost]) || 0;
      if (cost === 0) continue;
      
      const prenom = cols.prenom !== -1 && r[cols.prenom] ? String(r[cols.prenom]) : '';
      const nom = String(r[cols.nom]);
      const name = prenom ? `${nom} ${prenom}` : nom;
      const period = cols.period !== -1 && r[cols.period] ? String(r[cols.period]) : 'Unknown';
      
      periodsSet.add(period);
      emps.push({
        name,
        department: cols.dept !== -1 && r[cols.dept] ? String(r[cols.dept]) : null,
        function: '',
        totalCost: cost,
        period
      });
    }
    
    return emps.length > 0 ? { employees: emps, periods: [...periodsSet].sort() } : null;
  };

  const importToCompany = (companyName) => {
    if (!pendingData || !companyName) return;
    importToCompanyDirect(companyName, pendingData);
  };

  const importToCompanyDirect = (companyName, data) => {
    if (!data || !companyName) return;
    
    const existing = companies[companyName] || { employees: [], mapping: {}, periods: [] };
    const mapping = { ...existing.mapping };
    
    const existingKeys = new Set((existing.employees || []).map(e => `${e.period}-${e.name}`));
    const newEmps = data.employees
      .filter(e => !existingKeys.has(`${e.period}-${e.name}`))
      .map(e => ({ ...e, department: e.department || mapping[e.name] || null }));
    
    const allEmps = [...(existing.employees || []), ...newEmps];
    const allPeriods = [...new Set([...(existing.periods || []), ...data.periods])].sort();
    
    const unassigned = [...new Map(
      allEmps.filter(e => !e.department && !mapping[e.name]).map(e => [e.name, e])
    ).values()];

    // Préserver les métadonnées existantes (logo, couleur, site web)
    const newCompany = { 
      ...existing,
      employees: allEmps, 
      mapping, 
      periods: allPeriods 
    };
    const newCompanies = { ...companies, [companyName]: newCompany };
    
    setCompanies(newCompanies);
    setActiveCompany(companyName);
    setEmployees(allEmps);
    setDepartmentMapping(mapping);
    setPeriods(allPeriods);
    saveAll(newCompanies, companyName);
    
    setPendingData(null);
    setShowModal(false);
    setNewCompanyName('');
    setDebugMsg(`✓ ${newEmps.length} nouvelles entrées`);

    if (unassigned.length > 0) {
      setPendingAssignments(unassigned);
      setCurrentAssignment(unassigned[0]);
      setView('assign');
    } else {
      setView('dashboard');
    }
  };

  const assignDept = (dept) => {
    if (!currentAssignment || !activeCompany) return;

    const newMapping = { ...departmentMapping, [currentAssignment.name]: dept };
    const updatedEmps = employees.map(e => 
      e.name === currentAssignment.name ? { ...e, department: dept } : e
    );

    setDepartmentMapping(newMapping);
    setEmployees(updatedEmps);

    const newCompanies = {
      ...companies,
      [activeCompany]: { ...companies[activeCompany], employees: updatedEmps, mapping: newMapping }
    };
    setCompanies(newCompanies);
    saveAll(newCompanies, activeCompany);

    const remaining = pendingAssignments.filter(e => e.name !== currentAssignment.name);
    setPendingAssignments(remaining);
    
    if (remaining.length > 0) {
      setCurrentAssignment(remaining[0]);
    } else {
      setCurrentAssignment(null);
      setView('dashboard');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const handleModalSelect = (name) => {
    importToCompany(name);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setPendingData(null);
    setNewCompanyName('');
    setDebugMsg('');
  };

  const handleCreateEmptyCompany = () => {
    if (!newCompanyName.trim()) return;
    const name = newCompanyName.trim();
    const newCompanies = {
      ...companies,
      [name]: { employees: [], mapping: {}, periods: [], logo: null }
    };
    setCompanies(newCompanies);
    saveAll(newCompanies, name);
    setActiveCompany(name);
    setEmployees([]);
    setDepartmentMapping({});
    setPeriods([]);
    setShowNewCompanyModal(false);
    setNewCompanyName('');
    setView('dashboard');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeCompany) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      // Créer un canvas pour redimensionner l'image en carré
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200; // Taille standard 200x200
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Fond blanc
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        
        // Calculer le crop pour centrer l'image
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        
        // Dessiner l'image centrée et croppée
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        
        // Extraire la couleur dominante
        const imageData = ctx.getImageData(0, 0, size, size).data;
        const color = extractDominantColor(imageData);
        
        const logo = canvas.toDataURL('image/jpeg', 0.9);
        const newCompanies = {
          ...companies,
          [activeCompany]: { ...companies[activeCompany], logo, brandColor: color }
        };
        setCompanies(newCompanies);
        saveAll(newCompanies, activeCompany);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Extraire la couleur dominante d'une image
  const extractDominantColor = (imageData) => {
    const colorCounts = {};
    
    for (let i = 0; i < imageData.length; i += 16) { // Sample every 4th pixel for speed
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      
      // Ignorer les couleurs trop claires (blanc/gris clair) ou trop sombres
      const brightness = (r + g + b) / 3;
      if (brightness > 240 || brightness < 30) continue;
      
      // Ignorer les gris (r ≈ g ≈ b)
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (maxDiff < 20) continue;
      
      // Quantifier pour regrouper les couleurs similaires
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }
    
    // Trouver la couleur la plus fréquente
    let maxCount = 0;
    let dominantColor = '139, 92, 246'; // Default violet
    
    for (const [key, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = key;
      }
    }
    
    return dominantColor;
  };

  const handleWebsiteChange = (website) => {
    if (!activeCompany) return;
    const newCompanies = {
      ...companies,
      [activeCompany]: { ...companies[activeCompany], website }
    };
    setCompanies(newCompanies);
    saveAll(newCompanies, activeCompany);
  };

  // Export period data to Excel
  const exportPeriodToExcel = (period) => {
    const periodEmps = employees.filter(e => e.period === period);
    if (periodEmps.length === 0) return;
    
    // Create worksheet data
    const wsData = [
      ['Nom', 'Département', 'Fonction', 'Coût Total', 'Période']
    ];
    
    periodEmps.forEach(emp => {
      const dept = emp.department || departmentMapping[emp.name] || 'Non assigné';
      wsData.push([
        emp.name,
        dept,
        emp.function || '',
        emp.totalCost,
        period
      ]);
    });
    
    // Add total row
    const total = periodEmps.reduce((s, e) => s + e.totalCost, 0);
    wsData.push([]);
    wsData.push(['TOTAL', '', '', total, '']);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Nom
      { wch: 20 }, // Département
      { wch: 20 }, // Fonction
      { wch: 15 }, // Coût
      { wch: 12 }  // Période
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    
    // Generate filename
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const year = period.substring(0, 4);
    const month = monthNames[parseInt(period.substring(5), 10) - 1];
    const filename = `${activeCompany}_${month}_${year}.xlsx`;
    
    // Download
    XLSX.writeFile(wb, filename);
  };

  // Export all data for a year to Excel
  const exportYearToExcel = (year) => {
    const yearPeriods = periods.filter(p => p.startsWith(year)).sort();
    if (yearPeriods.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    
    // Create summary sheet
    const summaryData = [
      ['Période', 'Employés', 'Coût Total']
    ];
    
    let grandTotal = 0;
    yearPeriods.forEach(period => {
      const periodEmps = employees.filter(e => e.period === period);
      const total = periodEmps.reduce((s, e) => s + e.totalCost, 0);
      grandTotal += total;
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const month = monthNames[parseInt(period.substring(5), 10) - 1];
      summaryData.push([month, periodEmps.length, total]);
    });
    summaryData.push([]);
    summaryData.push(['TOTAL ANNÉE', '', grandTotal]);
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');
    
    // Create sheet for each month
    yearPeriods.forEach(period => {
      const periodEmps = employees.filter(e => e.period === period);
      const wsData = [['Nom', 'Département', 'Fonction', 'Coût Total']];
      
      periodEmps.forEach(emp => {
        const dept = emp.department || departmentMapping[emp.name] || 'Non assigné';
        wsData.push([emp.name, dept, emp.function || '', emp.totalCost]);
      });
      
      const total = periodEmps.reduce((s, e) => s + e.totalCost, 0);
      wsData.push([]);
      wsData.push(['TOTAL', '', '', total]);
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const monthName = monthNames[parseInt(period.substring(5), 10) - 1];
      XLSX.utils.book_append_sheet(wb, ws, monthName);
    });
    
    XLSX.writeFile(wb, `${activeCompany}_${year}.xlsx`);
  };

  const handleBrandColorChange = (color) => {
    if (!activeCompany) return;
    const newCompanies = {
      ...companies,
      [activeCompany]: { ...companies[activeCompany], brandColor: color }
    };
    setCompanies(newCompanies);
    saveAll(newCompanies, activeCompany);
  };

  // Obtenir la couleur de la société active
  const getBrandColor = () => {
    return companies[activeCompany]?.brandColor || '16, 185, 129';
  };

  const handleLogoDelete = () => {
    if (!activeCompany) return;
    const newCompanies = {
      ...companies,
      [activeCompany]: { ...companies[activeCompany], logo: null }
    };
    setCompanies(newCompanies);
    saveAll(newCompanies, activeCompany);
  };

  const handleExportPDF = () => {
    // Calculer les données par mois
    const monthlyData = periods.map(period => {
      const periodEmps = employees.filter(e => e.period === period);
      const total = periodEmps.reduce((s, e) => s + e.totalCost, 0);
      const uniqueEmps = new Set(periodEmps.map(e => e.name)).size;
      return { period, total, employees: uniqueEmps };
    }).sort((a, b) => a.period.localeCompare(b.period));

    // Calculer variation
    const getVariation = (idx) => {
      if (idx === 0) return '-';
      const prev = monthlyData[idx - 1].total;
      const curr = monthlyData[idx].total;
      const pct = ((curr - prev) / prev * 100).toFixed(1);
      return prev === 0 ? '-' : (curr >= prev ? `+${pct}%` : `${pct}%`);
    };

    // Top 10 employés par coût
    const empCosts = {};
    filtered.forEach(e => {
      const name = e.name;
      if (!empCosts[name]) empCosts[name] = { name, dept: e.department || departmentMapping[name] || 'Non assigné', cost: 0 };
      empCosts[name].cost += e.totalCost;
    });
    const top10Employees = Object.values(empCosts).sort((a, b) => b.cost - a.cost).slice(0, 10);

    // Couleurs de la société (ou violet par défaut)
    const brandColor = companies[activeCompany]?.brandColor || '139, 92, 246';
    const brandColorHex = `rgb(${brandColor})`;
    const brandColorLight = `rgba(${brandColor}, 0.1)`;
    const brandColorMedium = `rgba(${brandColor}, 0.2)`;
    const [r, g, b] = brandColor.split(',').map(c => parseInt(c.trim()));
    const brandColorLighter = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;

    const logoHtml = companies[activeCompany]?.logo 
      ? `<img src="${companies[activeCompany].logo}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;" />`
      : `<div style="width: 60px; height: 60px; border-radius: 12px; background: linear-gradient(135deg, ${brandColorHex}, ${brandColorLighter}); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 28px;">${activeCompany?.charAt(0) || 'S'}</div>`;

    // Générer les barres de répartition
    const maxDeptCost = Math.max(...sortedDepts.map(([_, d]) => d.total));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Salarize - ${activeCompany}</title>
        <meta charset="UTF-8">
        <style>
          :root {
            --brand: ${brandColorHex};
            --brand-light: ${brandColorLight};
            --brand-medium: ${brandColorMedium};
            --brand-lighter: ${brandColorLighter};
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 12mm; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1e293b;
            padding: 32px;
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 28px;
            padding-bottom: 20px;
            border-bottom: 3px solid #8B5CF6;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .header h1 {
            font-size: 26px;
            color: #1e293b;
            font-weight: 700;
          }
          .header-subtitle {
            color: #64748b;
            font-size: 13px;
            margin-top: 2px;
          }
          .brand {
            text-align: right;
          }
          .brand-name {
            font-size: 22px;
            font-weight: 800;
            background: linear-gradient(90deg, var(--brand), var(--brand-lighter));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .brand-date {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 4px;
          }
          
          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 28px;
          }
          .stat-card {
            background: var(--brand-light);
            border: 1px solid var(--brand-medium);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
          }
          .stat-card.highlight {
            background: linear-gradient(135deg, var(--brand), var(--brand-lighter));
            border: none;
          }
          .stat-card.highlight .stat-value,
          .stat-card.highlight .stat-label {
            color: white;
          }
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--brand);
          }
          .stat-label {
            font-size: 10px;
            color: var(--brand);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            font-weight: 600;
            opacity: 0.8;
          }
          
          /* Section Titles */
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-title::before {
            content: '';
            width: 4px;
            height: 20px;
            background: linear-gradient(180deg, var(--brand), var(--brand-lighter));
            border-radius: 2px;
          }
          
          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #F8FAFC;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #E2E8F0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          th:last-child, td:last-child {
            text-align: right;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #F1F5F9;
          }
          tr:hover {
            background: #FAFAFA;
          }
          .total-row {
            background: var(--brand-light) !important;
            font-weight: 600;
          }
          .total-row td {
            border-bottom: none;
            color: var(--brand);
          }
          .positive { color: #DC2626; }
          .negative { color: #16A34A; }
          
          /* Department Bars */
          .dept-row {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #F1F5F9;
          }
          .dept-name {
            width: 140px;
            font-weight: 500;
            font-size: 12px;
          }
          .dept-bar-container {
            flex: 1;
            height: 24px;
            background: #F1F5F9;
            border-radius: 4px;
            margin: 0 12px;
            overflow: hidden;
          }
          .dept-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--brand), var(--brand-lighter));
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 8px;
            color: white;
            font-size: 10px;
            font-weight: 600;
          }
          .dept-cost {
            width: 100px;
            text-align: right;
            font-weight: 600;
            font-size: 12px;
          }
          
          /* Two Columns Layout */
          .two-cols {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          
          /* Footer */
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #94A3B8;
            font-size: 10px;
          }
          .footer-brand {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .footer-logo {
            width: 16px;
            height: 16px;
            background: linear-gradient(135deg, var(--brand), var(--brand-lighter));
            border-radius: 4px;
          }
          
          /* Print Button */
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(90deg, var(--brand), var(--brand-lighter));
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-btn:hover { 
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
          }
          @media print {
            .print-btn { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Imprimer / PDF
        </button>
        
        <div class="header">
          <div class="header-left">
            ${logoHtml}
            <div>
              <h1>${activeCompany}</h1>
              <div class="header-subtitle">Rapport des coûts salariaux • ${selectedPeriod === 'all' ? 'Toutes périodes' : formatPeriod(selectedPeriod)}</div>
            </div>
          </div>
          <div class="brand">
            <div class="brand-name">Salarize</div>
            <div class="brand-date">Généré le ${new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card highlight">
            <div class="stat-value">€${totalCost.toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div class="stat-label">Coût Total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${uniqueNames}</div>
            <div class="stat-label">Employés</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Object.keys(deptStats).length}</div>
            <div class="stat-label">Départements</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">€${uniqueNames > 0 ? Math.round(totalCost / uniqueNames).toLocaleString('fr-BE') : 0}</div>
            <div class="stat-label">Coût Moyen</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Répartition par département</div>
          <div style="background: #FAFAFA; border-radius: 12px; padding: 16px;">
            ${sortedDepts.map(([dept, data]) => `
              <div class="dept-row">
                <div class="dept-name">${dept}</div>
                <div class="dept-bar-container">
                  <div class="dept-bar" style="width: ${(data.total / maxDeptCost * 100)}%">
                    ${(data.total / totalCost * 100).toFixed(1)}%
                  </div>
                </div>
                <div class="dept-cost">€${data.total.toLocaleString('fr-BE', { minimumFractionDigits: 0 })}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="two-cols">
          <div class="section">
            <div class="section-title">Évolution mensuelle</div>
            <table>
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Var.</th>
                  <th>Coût</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyData.slice(-12).map((m, idx) => `
                  <tr>
                    <td><strong>${formatPeriod(m.period)}</strong></td>
                    <td class="${getVariation(idx).startsWith('+') ? 'positive' : getVariation(idx).startsWith('-') && getVariation(idx) !== '-' ? 'negative' : ''}">${getVariation(idx)}</td>
                    <td><strong>€${m.total.toLocaleString('fr-BE', { minimumFractionDigits: 0 })}</strong></td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td><strong>Total</strong></td>
                  <td></td>
                  <td><strong>€${monthlyData.reduce((s, m) => s + m.total, 0).toLocaleString('fr-BE', { minimumFractionDigits: 0 })}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Top 10 employés</div>
            <table>
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Coût</th>
                </tr>
              </thead>
              <tbody>
                ${top10Employees.map((emp, idx) => `
                  <tr>
                    <td>
                      <strong>${emp.name}</strong>
                      <div style="font-size: 10px; color: #94A3B8;">${emp.dept}</div>
                    </td>
                    <td><strong>€${emp.cost.toLocaleString('fr-BE', { minimumFractionDigits: 0 })}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="footer">
          <div class="footer-brand">
            <div class="footer-logo"></div>
            <span>Rapport généré par <strong>Salarize</strong></span>
          </div>
          <div>${new Date().toLocaleDateString('fr-BE')} à ${new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </body>
      </html>
    `;

    // Ouvrir dans une nouvelle fenêtre pour imprimer
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Load user from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('salarize_user');
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch (e) {}
  }, []);

  const clearCompanyData = () => {
    if (!activeCompany) return;
    const newCompanies = {
      ...companies,
      [activeCompany]: { 
        ...companies[activeCompany], 
        employees: [], 
        periods: [], 
        mapping: {} 
      }
    };
    setCompanies(newCompanies);
    setEmployees([]);
    setPeriods([]);
    setDepartmentMapping({});
    saveAll(newCompanies, activeCompany);
  };

  const deleteCompany = () => {
    if (!activeCompany) return;
    const newCompanies = { ...companies };
    delete newCompanies[activeCompany];
    setCompanies(newCompanies);
    
    const remainingCompanies = Object.keys(newCompanies);
    if (remainingCompanies.length > 0) {
      loadCompany(remainingCompanies[0], newCompanies);
    } else {
      setActiveCompany(null);
      setEmployees([]);
      setPeriods([]);
      setDepartmentMapping({});
      setView('upload');
    }
    saveAll(newCompanies, remainingCompanies[0] || null);
    setShowDataManager(false);
  };

  const deletePeriod = (periodToDelete) => {
    if (!activeCompany) return;
    const newEmployees = employees.filter(e => e.period !== periodToDelete);
    const newPeriods = periods.filter(p => p !== periodToDelete);
    
    const newCompanies = {
      ...companies,
      [activeCompany]: {
        ...companies[activeCompany],
        employees: newEmployees,
        periods: newPeriods
      }
    };
    
    setCompanies(newCompanies);
    setEmployees(newEmployees);
    setPeriods(newPeriods);
    saveAll(newCompanies, activeCompany);
  };

  // Computed
  const filtered = selectedPeriod === 'all' ? employees : employees.filter(e => e.period === selectedPeriod);
  const totalCost = filtered.reduce((s, e) => s + e.totalCost, 0);
  const uniqueNames = new Set(filtered.map(e => e.name)).size;
  
  // Get unique years from periods
  const years = [...new Set(periods.map(p => p.substring(0, 4)))].sort();
  
  // Filter chart data by year
  const chartData = periods
    .filter(period => selectedYear === 'all' || period.startsWith(selectedYear))
    .map(period => {
      const periodEmps = employees.filter(e => e.period === period);
      const total = periodEmps.reduce((s, e) => s + e.totalCost, 0);
      const year = period.substring(0, 4);
      return {
        period: period,
        total: Math.round(total * 100) / 100,
        year: year
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
  
  // Années uniques pour les couleurs
  const uniqueYears = [...new Set(chartData.map(d => d.year))].sort();
  
  const deptStats = {};
  filtered.forEach(e => {
    const d = e.department || departmentMapping[e.name] || 'Non assigné';
    if (!deptStats[d]) deptStats[d] = { total: 0, count: 0 };
    deptStats[d].total += e.totalCost;
    deptStats[d].count++;
  });
  const sortedDepts = Object.entries(deptStats).sort((a, b) => b[1].total - a[1].total);
  const maxCost = Math.max(...sortedDepts.map(([, d]) => d.total), 1);

  const empAgg = {};
  filtered.forEach(e => {
    if (!empAgg[e.name]) empAgg[e.name] = { name: e.name, dept: e.department || departmentMapping[e.name] || 'Non assigné', cost: 0 };
    empAgg[e.name].cost += e.totalCost;
  });
  const empList = Object.values(empAgg).sort((a, b) => b.cost - a.cost);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  // Landing page (home)
  if (currentPage === 'home') {
    return (
      <>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <LandingPage 
          onLogin={handleLogin} 
          user={user} 
          onGoToDashboard={() => setCurrentPage('dashboard')} 
        />
      </>
    );
  }

  // Features page
  if (currentPage === 'features') {
    return (
      <>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <FeaturesPage 
          onLogin={handleLogin} 
          user={user} 
          onGoToDashboard={() => setCurrentPage('dashboard')} 
        />
      </>
    );
  }

  // Si pas connecté et essaie d'aller ailleurs que home -> rediriger vers home
  if (!user && currentPage !== 'home') {
    setCurrentPage('home');
    return null;
  }

  // Profile page (connecté uniquement)
  if (currentPage === 'profile') {
    return (
      <>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <ProfilePage user={user} onLogout={handleLogout} />
      </>
    );
  }

  // Upload screen (connected but no companies yet)
  if (Object.keys(companies).length === 0 && view === 'upload') {
    return (
      <div className="min-h-screen bg-slate-950">
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <div className="pt-24 pb-12 px-6">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Bienvenue, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="text-slate-400">Commencez par importer votre premier fichier</p>
            </div>
            
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-xl p-12 text-center transition-colors group">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-white font-semibold mb-2">Importer un fichier Excel</p>
                  <p className="text-slate-500 text-sm">Glissez-déposez ou cliquez pour sélectionner</p>
                </div>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </label>
              
              {debugMsg && (
                <p className="mt-4 text-sm text-slate-400 text-center">{debugMsg}</p>
              )}
            </div>
            
            <p className="text-center text-slate-600 text-sm mt-6">
              Compatible : Export Acerta, fichiers d'analyse internes
            </p>
          </div>
        </div>
        
        {showModal && (
          <SelectCompanyModal 
            companies={companies}
            newName={newCompanyName}
            setNewName={setNewCompanyName}
            onSelect={handleModalSelect}
            onCancel={handleModalCancel}
          />
        )}
        {pendingPeriodSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">📅 Quelle période importez-vous ?</h2>
                <button 
                  onClick={() => setPendingPeriodSelection(null)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-5 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                <div className="flex gap-3">
                  <div className="text-violet-500 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-violet-800 mb-1">Fichier prêt à importer</p>
                    <p className="text-violet-700">
                      <strong>{pendingPeriodSelection.employees.length} employés</strong> trouvés dans ce fichier.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sélectionnez la période de ce fichier
                </label>
                <div className="flex gap-2">
                  <select 
                    id="period-year-upload"
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg focus:border-violet-500 outline-none text-lg"
                    defaultValue={new Date().getFullYear()}
                  >
                    {[2023, 2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select 
                    id="period-month-upload"
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
                    defaultValue={String(new Date().getMonth() + 1).padStart(2, '0')}
                  >
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                      <option key={m} value={m}>
                        {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][parseInt(m) - 1]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPendingPeriodSelection(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const year = document.getElementById('period-year-upload').value;
                    const month = document.getElementById('period-month-upload').value;
                    const period = `${year}-${month}`;
                    
                    const updatedEmployees = pendingPeriodSelection.employees.map(e => ({
                      ...e,
                      period
                    }));
                    
                    const result = {
                      employees: updatedEmployees,
                      periods: [period]
                    };
                    
                    setDebugMsg(`${result.employees.length} entrées`);
                    setPendingPeriodSelection(null);
                    setPendingData(result);
                    setShowModal(true);
                  }}
                  className="flex-1 py-2.5 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium"
                >
                  Importer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Assignment screen
  if (view === 'assign' && currentAssignment) {
    return (
      <div className="min-h-screen flex">
        <Sidebar 
          companies={companies}
          activeCompany={activeCompany}
          onSelectCompany={loadCompany}
          onImportClick={() => setShowImportModal(true)}
          onAddCompany={() => setShowNewCompanyModal(true)}
          onManageData={() => setShowDataManager(true)}
          onManageDepts={() => setShowDeptManager(true)}
          debugMsg={debugMsg}
          setCurrentPage={setCurrentPage}
        />
        {showModal && (
          <SelectCompanyModal 
            companies={companies}
            newName={newCompanyName}
            setNewName={setNewCompanyName}
            onSelect={handleModalSelect}
            onCancel={handleModalCancel}
          />
        )}
        <div className="ml-64 flex-1 flex items-center justify-center bg-slate-100 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center shadow-xl">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="font-semibold text-amber-800">🏷️ {pendingAssignments.length} employé(s) sans département</p>
            </div>
            <h3 className="text-2xl font-bold mb-2">{currentAssignment.name}</h3>
            <p className="text-slate-500 mb-6">€{currentAssignment.totalCost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DEFAULT_DEPARTMENTS.map(d => (
                <button 
                  key={d} 
                  onClick={() => assignDept(d)} 
                  className="p-3 border-2 border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 font-medium transition-all"
                >
                  {d}
                </button>
              ))}
            </div>
            <button onClick={() => assignDept('Non assigné')} className="text-slate-400 hover:text-slate-600">
              Passer →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar 
        companies={companies}
        activeCompany={activeCompany}
        onSelectCompany={loadCompany}
        onImportClick={() => setShowImportModal(true)}
        onAddCompany={() => setShowNewCompanyModal(true)}
        onManageData={() => setShowDataManager(true)}
        onManageDepts={() => setShowDeptManager(true)}
        debugMsg={debugMsg}
        setCurrentPage={setCurrentPage}
      />
      <DashboardHeader user={user} onLogout={handleLogout} setCurrentPage={setCurrentPage} />
      {showModal && pendingData && (
        <SelectCompanyModal 
          companies={companies}
          newName={newCompanyName}
          setNewName={setNewCompanyName}
          onSelect={handleModalSelect}
          onCancel={handleModalCancel}
        />
      )}
      {showNewCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">🏢 Nouvelle société</h2>
            <p className="text-slate-500 text-sm mb-4">Créez une société vide pour commencer à importer des données</p>
            <input
              type="text"
              placeholder="Nom de la société"
              value={newCompanyName}
              onChange={e => setNewCompanyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateEmptyCompany()}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl mb-4 focus:border-violet-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowNewCompanyModal(false); setNewCompanyName(''); }}
                className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateEmptyCompany}
                disabled={!newCompanyName.trim()}
                className="flex-1 py-2 bg-violet-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-violet-600"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Company Settings Modal */}
      {showCompanySettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">🎨 Paramètres de {activeCompany}</h2>
              <button 
                onClick={() => setShowCompanySettings(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom de la société</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="company-name-input"
                    defaultValue={activeCompany}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      const newName = document.getElementById('company-name-input').value.trim();
                      if (!newName || newName === activeCompany) return;
                      if (companies[newName]) {
                        alert('Une société avec ce nom existe déjà');
                        return;
                      }
                      
                      // Renommer la société
                      const newCompanies = { ...companies };
                      newCompanies[newName] = newCompanies[activeCompany];
                      delete newCompanies[activeCompany];
                      
                      setCompanies(newCompanies);
                      setActiveCompany(newName);
                      
                      // Mettre à jour localStorage
                      localStorage.setItem('salarize_companies', JSON.stringify(newCompanies));
                      localStorage.setItem('salarize_active', newName);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Renommer
                  </button>
                </div>
              </div>
              
              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Site web</label>
                <input
                  type="text"
                  placeholder="www.example.com"
                  value={companies[activeCompany]?.website || ''}
                  onChange={e => handleWebsiteChange(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
                />
              </div>
              
              {/* Brand Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Couleur de marque</label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-slate-200"
                    style={{ backgroundColor: `rgb(${getBrandColor()})` }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-2">Choisir une couleur prédéfinie :</p>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { name: 'Vert', value: '16, 185, 129' },
                        { name: 'Bleu', value: '59, 130, 246' },
                        { name: 'Rouge', value: '239, 68, 68' },
                        { name: 'Orange', value: '249, 115, 22' },
                        { name: 'Violet', value: '139, 92, 246' },
                        { name: 'Rose', value: '236, 72, 153' },
                        { name: 'Cyan', value: '6, 182, 212' },
                        { name: 'Jaune', value: '234, 179, 8' },
                      ].map(c => (
                        <button
                          key={c.value}
                          onClick={() => handleBrandColorChange(c.value)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            getBrandColor() === c.value ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: `rgb(${c.value})` }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  💡 La couleur est automatiquement extraite du logo quand vous en ajoutez un
                </p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowCompanySettings(false)}
                className="w-full py-2 text-white rounded-lg font-medium"
                style={{ backgroundColor: `rgb(${getBrandColor()})` }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Modal with Drag & Drop */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📁 Importer des données</h2>
              <button 
                onClick={() => { setShowImportModal(false); setIsDragging(false); }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Info box */}
            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex gap-3">
                <div className="text-blue-500 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-blue-800 mb-1">Comment ça fonctionne ?</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• <strong>Un fichier = une période</strong> (ex: janvier 2024)</li>
                    <li>• Importez plusieurs fichiers pour avoir l'historique complet</li>
                    <li>• Les données sont cumulées automatiquement</li>
                    <li>• Vous pouvez supprimer des périodes dans "Gérer la société"</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {activeCompany && (
              <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-violet-800">
                  Vous importez votre fichier dans <strong>{activeCompany}</strong>
                </span>
              </div>
            )}
            
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                  parseFile(file);
                  setShowImportModal(false);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging 
                  ? 'border-violet-500 bg-violet-50' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center transition-colors ${
                isDragging ? 'bg-violet-100' : 'bg-slate-100'
              }`}>
                <svg className={`w-7 h-7 transition-colors ${isDragging ? 'text-violet-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <p className={`font-medium mb-1 ${isDragging ? 'text-violet-700' : 'text-slate-700'}`}>
                {isDragging ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier Excel'}
              </p>
              <p className="text-slate-400 text-sm mb-3">ou</p>
              
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Parcourir les fichiers
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => {
                    handleFileChange(e);
                    setShowImportModal(false);
                  }}
                  className="hidden" 
                />
              </label>
            </div>
            
            <p className="text-xs text-slate-400 mt-4 text-center">
              Formats supportés : .xlsx, .xls (Acerta, format interne)
            </p>
            
            {/* Périodes existantes */}
            {activeCompany && periods.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  📅 Périodes déjà importées pour {activeCompany} :
                </p>
                <div className="flex flex-wrap gap-2">
                  {periods.slice(0, 12).map(p => (
                    <span key={p} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {formatPeriod(p)}
                    </span>
                  ))}
                  {periods.length > 12 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      +{periods.length - 12} autres
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  💡 Pour supprimer des périodes, allez dans Actions → Gérer {activeCompany}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Period Selection Modal */}
      {pendingPeriodSelection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📅 Quelle période importez-vous ?</h2>
              <button 
                onClick={() => setPendingPeriodSelection(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-5 p-4 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="flex gap-3">
                <div className="text-violet-500 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-violet-800 mb-1">Fichier prêt à importer</p>
                  <p className="text-violet-700">
                    <strong>{pendingPeriodSelection.employees.length} employés</strong> trouvés dans ce fichier.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sélectionnez la période de ce fichier
              </label>
              <div className="flex gap-2">
                <select 
                  id="period-year"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg focus:border-violet-500 outline-none text-lg"
                  defaultValue={new Date().getFullYear()}
                >
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select 
                  id="period-month"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
                  defaultValue={String(new Date().getMonth() + 1).padStart(2, '0')}
                >
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                    <option key={m} value={m}>
                      {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][parseInt(m) - 1]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setPendingPeriodSelection(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const year = document.getElementById('period-year').value;
                  const month = document.getElementById('period-month').value;
                  const period = `${year}-${month}`;
                  
                  // Mettre à jour tous les employés avec cette période
                  const updatedEmployees = pendingPeriodSelection.employees.map(e => ({
                    ...e,
                    period
                  }));
                  
                  const result = {
                    employees: updatedEmployees,
                    periods: [period]
                  };
                  
                  setDebugMsg(`${result.employees.length} entrées`);
                  setPendingPeriodSelection(null);
                  
                  // Import direct si on est sur une société
                  if (activeCompany && view === 'dashboard') {
                    importToCompanyDirect(activeCompany, result);
                  } else {
                    setPendingData(result);
                    setShowModal(true);
                  }
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg font-medium hover:opacity-90"
              >
                Importer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Department Manager Modal */}
      {showDeptManager && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDeptManager(false); setDeptSearchTerm(''); setDeptFilter('all'); }}}
        >
          <div className="min-h-full flex items-start justify-center p-4 pt-8 pb-8">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
              {/* Header gradient */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Départements</h2>
                    <p className="text-slate-400 text-sm mt-1">{activeCompany}</p>
                  </div>
                  <button 
                    onClick={() => { setShowDeptManager(false); setDeptSearchTerm(''); setDeptFilter('all'); }}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Stats row */}
                <div className="flex gap-3 mt-5">
                  {(() => {
                    const uniqueEmps = [...new Map(employees.map(e => [e.name, e])).values()];
                    const unassigned = uniqueEmps.filter(e => !e.department && !departmentMapping[e.name]).length;
                    const assigned = uniqueEmps.length - unassigned;
                    const deptCount = new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean)).size;
                    
                    return (
                      <>
                        <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                          <p className="text-2xl font-bold">{uniqueEmps.length}</p>
                          <p className="text-xs text-slate-400">Employés</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                          <p className="text-2xl font-bold">{deptCount}</p>
                          <p className="text-xs text-slate-400">Départements</p>
                        </div>
                        {unassigned > 0 && (
                          <div className="bg-amber-500/20 border border-amber-500/30 backdrop-blur rounded-xl px-4 py-2">
                            <p className="text-2xl font-bold text-amber-400">{unassigned}</p>
                            <p className="text-xs text-amber-400/80">Non assignés</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Actions & Search */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                {/* Rename department UI */}
                {showRenameDept && (
                  <div className="mb-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-2">✏️ Renommer un département</p>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={renameDeptOld}
                        onChange={e => setRenameDeptOld(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">Choisir...</option>
                        {[...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))].sort().map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <span className="flex items-center text-slate-400">→</span>
                      <input
                        type="text"
                        placeholder="Nouveau nom..."
                        value={renameDeptNew}
                        onChange={e => setRenameDeptNew(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowRenameDept(false); setRenameDeptOld(''); setRenameDeptNew(''); }}
                        className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => {
                          if (!renameDeptOld || !renameDeptNew || renameDeptOld === renameDeptNew) return;
                          
                          const newMapping = { ...departmentMapping };
                          Object.keys(newMapping).forEach(name => {
                            if (newMapping[name] === renameDeptOld) {
                              newMapping[name] = renameDeptNew;
                            }
                          });
                          
                          const newEmps = employees.map(e => ({
                            ...e,
                            department: e.department === renameDeptOld ? renameDeptNew : e.department
                          }));
                          
                          setDepartmentMapping(newMapping);
                          setEmployees(newEmps);
                          
                          const newCompanies = {
                            ...companies,
                            [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping }
                          };
                          setCompanies(newCompanies);
                          saveAll(newCompanies, activeCompany);
                          
                          setShowRenameDept(false);
                          setRenameDeptOld('');
                          setRenameDeptNew('');
                        }}
                        disabled={!renameDeptOld || !renameDeptNew}
                        className="flex-1 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Renommer
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Merge department UI */}
                {showMergeDept && (
                  <div className="mb-3 p-3 bg-white border border-purple-200 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-2">🔀 Fusionner des départements</p>
                    <p className="text-xs text-slate-500 mb-3">Tous les employés du premier département seront déplacés vers le second.</p>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={mergeDeptFrom}
                        onChange={e => setMergeDeptFrom(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">Fusionner...</option>
                        {[...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))].sort().map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <span className="flex items-center text-slate-400">→</span>
                      <select
                        value={mergeDeptTo}
                        onChange={e => setMergeDeptTo(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">...vers</option>
                        {[...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))].sort().filter(d => d !== mergeDeptFrom).map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowMergeDept(false); setMergeDeptFrom(''); setMergeDeptTo(''); }}
                        className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => {
                          if (!mergeDeptFrom || !mergeDeptTo || mergeDeptFrom === mergeDeptTo) return;
                          
                          const newMapping = { ...departmentMapping };
                          Object.keys(newMapping).forEach(name => {
                            if (newMapping[name] === mergeDeptFrom) {
                              newMapping[name] = mergeDeptTo;
                            }
                          });
                          
                          const newEmps = employees.map(e => ({
                            ...e,
                            department: e.department === mergeDeptFrom ? mergeDeptTo : e.department
                          }));
                          
                          const count = employees.filter(e => (e.department || departmentMapping[e.name]) === mergeDeptFrom).length;
                          
                          setDepartmentMapping(newMapping);
                          setEmployees(newEmps);
                          
                          const newCompanies = {
                            ...companies,
                            [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping }
                          };
                          setCompanies(newCompanies);
                          saveAll(newCompanies, activeCompany);
                          
                          setShowMergeDept(false);
                          setMergeDeptFrom('');
                          setMergeDeptTo('');
                        }}
                        disabled={!mergeDeptFrom || !mergeDeptTo}
                        className="flex-1 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Fusionner
                      </button>
                    </div>
                  </div>
                )}
                
                {!showRenameDept && !showMergeDept && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setShowRenameDept(true)}
                      className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                      ✏️ Renommer
                    </button>
                    
                    <button
                      onClick={() => setShowMergeDept(true)}
                      className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                      🔀 Fusionner
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Rechercher un employé..."
                      value={deptSearchTerm}
                      onChange={e => setDeptSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                    />
                  </div>
                  
                  <select
                    value={deptFilter === 'unassigned' ? 'unassigned' : deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className={`w-44 px-3 py-3 border rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      deptFilter !== 'all' 
                        ? 'border-slate-400 bg-slate-100' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <option value="all">Tous les dép.</option>
                    <option value="unassigned">⚠️ Non assignés</option>
                    {[...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))].sort().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Employee list */}
              <div className="divide-y divide-slate-100">
                {(() => {
                  const allDepts = [...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))].sort();
                  
                  const uniqueEmps = [...new Map(employees.map(e => [e.name, e])).values()]
                    .map(e => ({
                      ...e,
                      currentDept: e.department || departmentMapping[e.name] || null
                    }))
                    .filter(e => {
                      if (deptSearchTerm && !e.name.toLowerCase().includes(deptSearchTerm.toLowerCase())) return false;
                      if (deptFilter === 'unassigned') return !e.currentDept;
                      if (deptFilter !== 'all') return e.currentDept === deptFilter;
                      return true;
                    })
                    .sort((a, b) => {
                      if (!a.currentDept && b.currentDept) return -1;
                      if (a.currentDept && !b.currentDept) return 1;
                      return a.name.localeCompare(b.name);
                    });
                  
                  if (uniqueEmps.length === 0) {
                    return (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-slate-500 font-medium">Aucun employé trouvé</p>
                        <p className="text-slate-400 text-sm mt-1">Essayez de modifier vos filtres</p>
                      </div>
                    );
                  }
                  
                  return uniqueEmps.map((emp, idx) => (
                    <div key={emp.name} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                        emp.currentDept 
                          ? 'bg-slate-100 text-slate-600' 
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{emp.name}</p>
                      </div>
                      
                      <select
                        value={emp.currentDept || ''}
                        onChange={e => {
                          const newDept = e.target.value || null;
                          
                          const newMapping = { ...departmentMapping };
                          if (newDept) {
                            newMapping[emp.name] = newDept;
                          } else {
                            delete newMapping[emp.name];
                          }
                          
                          const newEmps = employees.map(em => 
                            em.name === emp.name ? { ...em, department: newDept } : em
                          );
                          
                          setDepartmentMapping(newMapping);
                          setEmployees(newEmps);
                          
                          const newCompanies = {
                            ...companies,
                            [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping }
                          };
                          setCompanies(newCompanies);
                          saveAll(newCompanies, activeCompany);
                        }}
                        className={`w-44 px-3 py-2 border rounded-xl text-sm font-medium transition-all cursor-pointer ${
                          emp.currentDept 
                            ? 'border-slate-200 bg-white hover:border-slate-300' 
                            : 'border-amber-300 bg-amber-50 text-amber-700'
                        }`}
                      >
                        <option value="">— Non assigné —</option>
                        {allDepts.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  ));
                })()}
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={() => { setShowDeptManager(false); setDeptSearchTerm(''); setDeptFilter('all'); }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                >
                  Terminé
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <main className="ml-64 mt-14 flex-1 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative group">
              {companies[activeCompany]?.logo ? (
                <img src={companies[activeCompany].logo} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => setShowLogoMenu(!showLogoMenu)}
                className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              
              {showLogoMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLogoMenu(false)} />
                  <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg py-2 w-48 z-20">
                    <label className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {companies[activeCompany]?.logo ? 'Modifier le logo' : 'Ajouter un logo'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => { handleLogoChange(e); setShowLogoMenu(false); }}
                        className="hidden" 
                      />
                    </label>
                    {companies[activeCompany]?.logo && (
                      <button
                        onClick={() => { handleLogoDelete(); setShowLogoMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Supprimer le logo
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">{activeCompany}</h1>
                <button
                  onClick={() => setShowCompanySettings(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title="Paramètres société"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              {companies[activeCompany]?.website ? (
                <a 
                  href={companies[activeCompany].website.startsWith('http') ? companies[activeCompany].website : `https://${companies[activeCompany].website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: `rgb(${getBrandColor()})` }}
                >
                  {companies[activeCompany].website.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <p className="text-slate-400 text-sm">Analyse des coûts salariaux</p>
              )}
            </div>
          </div>
          <div className="flex-1" />
          
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium text-slate-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter PDF
          </button>
          
          {periods.length > 1 && (
            <select 
              value={selectedPeriod} 
              onChange={e => setSelectedPeriod(e.target.value)} 
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">Toutes périodes</option>
              {(() => {
                const grouped = periods.reduce((acc, p) => {
                  const year = p.substring(0, 4);
                  if (!acc[year]) acc[year] = [];
                  acc[year].push(p);
                  return acc;
                }, {});
                
                return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yearPeriods]) => (
                  <optgroup key={year} label={`── ${year} ──`}>
                    {yearPeriods.sort().reverse().map(p => (
                      <option key={p} value={p}>{formatPeriod(p)}</option>
                    ))}
                  </optgroup>
                ));
              })()}
            </select>
          )}
        </div>

        {/* Data Manager Modal */}
        {showDataManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              
              {/* Confirmation overlay */}
              {confirmAction && (
                <div className="absolute inset-0 bg-white rounded-2xl p-6 flex flex-col items-center justify-center z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    confirmAction.type === 'delete' ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    <svg className={`w-8 h-8 ${confirmAction.type === 'delete' ? 'text-red-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {confirmAction.type === 'delete' && 'Supprimer la société ?'}
                    {confirmAction.type === 'clear' && 'Réinitialiser les données ?'}
                    {confirmAction.type === 'deletePeriod' && `Supprimer ${formatPeriod(confirmAction.period)} ?`}
                  </h3>
                  
                  <p className="text-slate-500 text-center mb-6">
                    {confirmAction.type === 'delete' && `"${activeCompany}" et toutes ses données seront supprimés définitivement.`}
                    {confirmAction.type === 'clear' && `Toutes les données de "${activeCompany}" seront supprimées. La société sera conservée.`}
                    {confirmAction.type === 'deletePeriod' && `Les données de la période ${formatPeriod(confirmAction.period)} seront supprimées.`}
                  </p>
                  
                  <div className="flex gap-3 w-full max-w-xs">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        if (confirmAction.type === 'delete') {
                          deleteCompany();
                        } else if (confirmAction.type === 'clear') {
                          clearCompanyData();
                          setShowDataManager(false);
                        } else if (confirmAction.type === 'deletePeriod') {
                          deletePeriod(confirmAction.period);
                        }
                        setConfirmAction(null);
                      }}
                      className={`flex-1 py-2 rounded-lg font-medium text-white ${
                        confirmAction.type === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">⚙️ Gestion des données</h2>
                <button 
                  onClick={() => { setShowDataManager(false); setConfirmAction(null); }}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <h3 className="font-semibold text-slate-700 mb-3">📅 Périodes importées</h3>
                {periods.length === 0 ? (
                  <p className="text-slate-400 text-sm">Aucune donnée importée</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {/* Grouper par année */}
                    {Object.entries(
                      periods.reduce((acc, period) => {
                        const year = period.substring(0, 4);
                        if (!acc[year]) acc[year] = [];
                        acc[year].push(period);
                        return acc;
                      }, {})
                    ).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yearPeriods]) => {
                      const yearTotal = yearPeriods.reduce((sum, p) => {
                        return sum + employees.filter(e => e.period === p).reduce((s, e) => s + e.totalCost, 0);
                      }, 0);
                      const yearEmps = yearPeriods.reduce((sum, p) => {
                        return sum + employees.filter(e => e.period === p).length;
                      }, 0);
                      
                      return (
                        <details key={year} className="bg-slate-50 rounded-lg" open>
                          <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{year}</span>
                              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                {yearPeriods.length} mois
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-600">
                                €{yearTotal.toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              <button
                                onClick={(e) => { e.preventDefault(); exportYearToExcel(year); }}
                                className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded transition-colors"
                                title={`Télécharger ${year}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            </div>
                          </summary>
                          <div className="px-3 pb-2 space-y-1">
                            {yearPeriods.sort().map(period => {
                              const periodEmps = employees.filter(e => e.period === period);
                              const periodTotal = periodEmps.reduce((s, e) => s + e.totalCost, 0);
                              return (
                                <div key={period} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-100 rounded text-sm group">
                                  <span className="text-slate-600">{['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][parseInt(period.substring(5), 10) - 1]}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">
                                      €{periodTotal.toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                    <button
                                      onClick={() => exportPeriodToExcel(period)}
                                      className="p-1 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                      title="Télécharger ce mois"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => setConfirmAction({ type: 'deletePeriod', period })}
                                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                      title="Supprimer"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="border-t border-slate-200 pt-6 space-y-3">
                <h3 className="font-semibold text-slate-700 mb-3">🔧 Actions</h3>
                
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-violet-500 hover:bg-violet-50 transition-colors">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Importer de nouvelles données</p>
                    <p className="text-slate-400 text-sm">Ajouter un fichier Excel</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={(e) => { handleFileChange(e); setShowDataManager(false); }}
                    className="hidden" 
                  />
                </label>
                
                <button
                  onClick={() => setConfirmAction({ type: 'clear' })}
                  className="flex items-center gap-3 w-full p-3 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-amber-700">Réinitialiser les données</p>
                    <p className="text-slate-400 text-sm">Supprimer toutes les données importées</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setConfirmAction({ type: 'delete' })}
                  className="flex items-center gap-3 w-full p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-red-600">Supprimer la société</p>
                    <p className="text-slate-400 text-sm">Supprimer {activeCompany} et toutes ses données</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm">Coût Total</p>
            <p className="text-2xl font-bold text-slate-800">€{totalCost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm">Employés</p>
            <p className="text-2xl font-bold text-slate-800">{uniqueNames}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm">Départements</p>
            <p className="text-2xl font-bold text-slate-800">{Object.keys(deptStats).length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-sm">Coût Moyen</p>
            <p className="text-2xl font-bold text-slate-800">€{(totalCost / (uniqueNames || 1)).toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Evolution Chart */}
        {chartData.length >= 1 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">📊 Évolution des coûts salariaux</h2>
              {years.length > 1 && (
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="px-3 py-1 border border-slate-200 rounded-lg bg-white text-sm"
                >
                  <option value="all">Toutes les années</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(value) => {
                      const month = parseInt(value.substring(5), 10);
                      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                      const year = value.substring(2, 4);
                      return `${monthNames[month - 1]} '${year}`;
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => [`€${value.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}`, 'Coût total']}
                    labelFormatter={(label) => formatPeriod(label)}
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill={`rgb(${getBrandColor()})`}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {chartData.length >= 2 && (
              <div className="mt-4 flex gap-4 justify-center text-sm flex-wrap">
                <div className="bg-slate-50 px-4 py-2 rounded-lg">
                  <span className="text-slate-500">Mois précédent: </span>
                  <span className="font-bold text-slate-800">
                    €{chartData[chartData.length - 2].total.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-lg">
                  <span className="text-slate-500">Mois actuel: </span>
                  <span className="font-bold text-slate-800">
                    €{chartData[chartData.length - 1].total.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-lg">
                  <span className="text-slate-500">Variation: </span>
                  <span className={`font-bold ${
                    chartData[chartData.length - 1].total >= chartData[chartData.length - 2].total 
                      ? 'text-red-500' 
                      : 'text-violet-500'
                  }`}>
                    {chartData[chartData.length - 1].total >= chartData[chartData.length - 2].total ? '↑' : '↓'}
                    {' '}
                    {Math.abs(
                      ((chartData[chartData.length - 1].total - chartData[chartData.length - 2].total) / 
                      chartData[chartData.length - 2].total) * 100
                    ).toFixed(1)}%
                  </span>
                </div>
                {/* Même mois années précédentes */}
                {(() => {
                  const currentPeriod = chartData[chartData.length - 1].period;
                  const currentMonth = currentPeriod.substring(5); // "03" par exemple
                  const currentYear = parseInt(currentPeriod.substring(0, 4));
                  
                  const sameMonthPrevYears = chartData.filter(d => {
                    const month = d.period.substring(5);
                    const year = parseInt(d.period.substring(0, 4));
                    return month === currentMonth && year < currentYear;
                  }).sort((a, b) => b.period.localeCompare(a.period));
                  
                  if (sameMonthPrevYears.length === 0) return null;
                  
                  return sameMonthPrevYears.map((prev, idx) => {
                    const variation = ((chartData[chartData.length - 1].total - prev.total) / prev.total * 100);
                    const yearDiff = currentYear - parseInt(prev.period.substring(0, 4));
                    const label = yearDiff === 1 ? 'Année préc. (même mois)' : `${prev.period.substring(0, 4)} (même mois)`;
                    
                    return (
                      <div key={prev.period} className="bg-slate-50 px-4 py-2 rounded-lg">
                        <span className="text-slate-500">{label}: </span>
                        <span className="font-bold text-slate-800">
                          €{prev.total.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`ml-2 text-xs font-medium ${variation >= 0 ? 'text-red-500' : 'text-violet-500'}`}>
                          ({variation >= 0 ? '+' : ''}{variation.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* Departments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Répartition par Département</h2>
          <div className="space-y-3">
            {sortedDepts.map(([dept, data]) => (
              <div key={dept} className="flex items-center gap-4">
                <span className="w-28 font-medium text-sm truncate text-slate-700">{dept}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${(data.total / maxCost) * 100}%`,
                      backgroundColor: `rgb(${getBrandColor()})`
                    }} 
                  />
                </div>
                <span className="w-32 text-right font-bold text-slate-800">€{data.total.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Detail Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h2 className="font-bold text-slate-800">👥 Détail par Employé</h2>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={empSearchTerm || ''}
                    onChange={e => setEmpSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full sm:w-48 focus:border-violet-500 outline-none text-sm"
                  />
                </div>
                
                {/* Department filter */}
                <select
                  value={empDeptFilter || 'all'}
                  onChange={e => setEmpDeptFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="all">Tous les départements</option>
                  {Object.keys(deptStats).sort().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                
                {/* Sort */}
                <select
                  value={empSortBy || 'cost-desc'}
                  onChange={e => setEmpSortBy(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="cost-desc">Coût ↓</option>
                  <option value="cost-asc">Coût ↑</option>
                  <option value="name-asc">Nom A→Z</option>
                  <option value="name-desc">Nom Z→A</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Employee Cards Grid */}
          <div className="p-6">
            {(() => {
              // Filter and sort employees
              let filtered = empList.filter(e => {
                if (empSearchTerm && !e.name.toLowerCase().includes(empSearchTerm.toLowerCase())) return false;
                if (empDeptFilter && empDeptFilter !== 'all' && e.dept !== empDeptFilter) return false;
                return true;
              });
              
              // Sort
              filtered.sort((a, b) => {
                switch (empSortBy || 'cost-desc') {
                  case 'cost-desc': return b.cost - a.cost;
                  case 'cost-asc': return a.cost - b.cost;
                  case 'name-asc': return a.name.localeCompare(b.name);
                  case 'name-desc': return b.name.localeCompare(a.name);
                  default: return 0;
                }
              });
              
              // Pagination
              const itemsPerPage = 12;
              const totalPages = Math.ceil(filtered.length / itemsPerPage);
              const currentPage = empCurrentPage || 1;
              const startIdx = (currentPage - 1) * itemsPerPage;
              const paginatedEmps = filtered.slice(startIdx, startIdx + itemsPerPage);
              
              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-medium">Aucun employé trouvé</p>
                    <p className="text-slate-400 text-sm mt-1">Essayez de modifier vos filtres</p>
                  </div>
                );
              }
              
              return (
                <>
                  {/* Results count */}
                  <p className="text-sm text-slate-500 mb-4">
                    {filtered.length} employé{filtered.length > 1 ? 's' : ''} 
                    {empSearchTerm || (empDeptFilter && empDeptFilter !== 'all') ? ' trouvé' + (filtered.length > 1 ? 's' : '') : ''}
                  </p>
                  
                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {paginatedEmps.map((e, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100 hover:border-slate-200">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            e.dept === 'Non assigné' 
                              ? 'bg-amber-100 text-amber-600' 
                              : 'bg-violet-100 text-violet-600'
                          }`}>
                            {e.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{e.name}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                              e.dept === 'Non assigné' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {e.dept}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-lg font-bold text-slate-800">
                            €{e.cost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEmpCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                      >
                        ← Préc.
                      </button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setEmpCurrentPage(pageNum)}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-violet-500 text-white'
                                  : 'border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setEmpCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                      >
                        Suiv. →
                      </button>
                    </div>
                  )}
                  
                  {/* Total */}
                  <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Total ({filtered.length} employés)</span>
                    <span className="text-xl font-bold text-violet-600">
                      €{filtered.reduce((sum, e) => sum + e.cost, 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        
        {/* Bouton de comparaison flottant */}
        {periods.length >= 2 && (
          <button
            onClick={() => setShowCompareModal(true)}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Comparer périodes
          </button>
        )}
        
        {/* Modal de comparaison */}
        {showCompareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold">📊 Comparer deux périodes</h2>
                <button onClick={() => { setShowCompareModal(false); setComparePeriod(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Période 1</label>
                    <select 
                      value={selectedPeriod === 'all' ? (periods[periods.length - 2] || '') : selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-violet-500 outline-none"
                    >
                      {periods.sort().map(p => (
                        <option key={p} value={p}>{formatPeriod(p)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Période 2</label>
                    <select 
                      value={comparePeriod || periods[periods.length - 1] || ''}
                      onChange={(e) => setComparePeriod(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-violet-500 outline-none"
                    >
                      {periods.sort().map(p => (
                        <option key={p} value={p}>{formatPeriod(p)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {(() => {
                  const period1 = selectedPeriod === 'all' ? periods[periods.length - 2] : selectedPeriod;
                  const period2 = comparePeriod || periods[periods.length - 1];
                  
                  if (!period1 || !period2 || period1 === period2) {
                    return <div className="text-center py-12 text-slate-400">Sélectionnez deux périodes différentes</div>;
                  }
                  
                  const emps1 = employees.filter(e => e.period === period1);
                  const emps2 = employees.filter(e => e.period === period2);
                  const total1 = emps1.reduce((s, e) => s + e.totalCost, 0);
                  const total2 = emps2.reduce((s, e) => s + e.totalCost, 0);
                  const names1 = new Set(emps1.map(e => e.name));
                  const names2 = new Set(emps2.map(e => e.name));
                  const nouveaux = [...names2].filter(n => !names1.has(n));
                  const partis = [...names1].filter(n => !names2.has(n));
                  const variation = total1 > 0 ? ((total2 - total1) / total1 * 100) : 0;
                  
                  return (
                    <>
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-slate-800">€{total1.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</div>
                          <div className="text-xs text-slate-500 mt-1">{formatPeriod(period1)}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-slate-800">€{total2.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</div>
                          <div className="text-xs text-slate-500 mt-1">{formatPeriod(period2)}</div>
                        </div>
                        <div className={`rounded-xl p-4 text-center ${variation >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                          <div className={`text-2xl font-bold ${variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Variation</div>
                        </div>
                        <div className="bg-violet-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-violet-600">€{Math.abs(total2 - total1).toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</div>
                          <div className="text-xs text-slate-500 mt-1">{total2 >= total1 ? 'Hausse' : 'Baisse'}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <h4 className="font-semibold text-green-800 mb-2">✅ Nouveaux ({nouveaux.length})</h4>
                          {nouveaux.length === 0 ? (
                            <p className="text-sm text-green-600">Aucun</p>
                          ) : (
                            <ul className="text-sm text-green-700 space-y-1 max-h-32 overflow-y-auto">
                              {nouveaux.slice(0, 10).map(n => <li key={n}>• {n}</li>)}
                              {nouveaux.length > 10 && <li className="text-green-500">... +{nouveaux.length - 10} autres</li>}
                            </ul>
                          )}
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <h4 className="font-semibold text-red-800 mb-2">❌ Départs ({partis.length})</h4>
                          {partis.length === 0 ? (
                            <p className="text-sm text-red-600">Aucun</p>
                          ) : (
                            <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                              {partis.slice(0, 10).map(n => <li key={n}>• {n}</li>)}
                              {partis.length > 10 && <li className="text-red-500">... +{partis.length - 10} autres</li>}
                            </ul>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button onClick={() => { setShowCompareModal(false); setComparePeriod(null); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
