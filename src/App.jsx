import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://dbqlyxeorexihuitejvq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicWx5eGVvcmV4aWh1aXRlanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzU3OTEsImV4cCI6MjA4NDAxMTc5MX0.QZKAv2vs5K_xwExc4P5GYtRaIr5DOIqIP_fh-BYR9Jo';

// Storage qui utilise UNIQUEMENT sessionStorage (déconnexion à la fermeture du navigateur)
// avec sync entre onglets via localStorage events temporaires
const sessionOnlyStorage = {
  getItem: (key) => {
    return sessionStorage.getItem(key);
  },
  
  setItem: (key, value) => {
    sessionStorage.setItem(key, value);
    // Supprimer de localStorage si présent (nettoyage)
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
    // Aussi supprimer de localStorage si présent
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
    // Broadcaster la suppression
    const broadcastKey = `__salarize_broadcast_${Date.now()}`;
    localStorage.setItem(broadcastKey, JSON.stringify({ key, value: null }));
    setTimeout(() => localStorage.removeItem(broadcastKey), 100);
  }
};

// Nettoyer les anciennes clés Supabase de localStorage au démarrage
if (typeof window !== 'undefined') {
  // Supprimer toutes les clés Supabase de localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Écouter les broadcasts pour sync entre onglets
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

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionOnlyStorage,
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'salarize-auth', // Clé custom pour éviter conflits
  }
});

// Helper pour obtenir une session valide
const getValidSession = async () => {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session) {
      session = refreshData.session;
    }
  }
  return session;
};

// ============================================
// DONNÉES DE DÉMONSTRATION
// ============================================
const DEMO_COMPANY = {
  name: 'TechStart SPRL',
  logo: null,
  brandColor: '139, 92, 246',
  website: 'techstart.be'
};

const DEMO_EMPLOYEES = [
  // 2024-01
  { name: 'Marie Dubois', department: 'Direction', function: 'CEO', totalCost: 8500, period: '2024-01' },
  { name: 'Pierre Martin', department: 'IT', function: 'Lead Developer', totalCost: 5200, period: '2024-01' },
  { name: 'Sophie Laurent', department: 'IT', function: 'Frontend Dev', totalCost: 4100, period: '2024-01' },
  { name: 'Lucas Bernard', department: 'IT', function: 'Backend Dev', totalCost: 4300, period: '2024-01' },
  { name: 'Emma Petit', department: 'Marketing', function: 'Marketing Manager', totalCost: 4800, period: '2024-01' },
  { name: 'Thomas Roux', department: 'Marketing', function: 'Content Creator', totalCost: 3200, period: '2024-01' },
  { name: 'Léa Moreau', department: 'Sales', function: 'Sales Lead', totalCost: 4500, period: '2024-01' },
  { name: 'Hugo Lefebvre', department: 'Sales', function: 'Account Manager', totalCost: 3800, period: '2024-01' },
  { name: 'Chloé Simon', department: 'Admin', function: 'Office Manager', totalCost: 3400, period: '2024-01' },
  { name: 'Nathan Michel', department: 'Admin', function: 'Comptable', totalCost: 3900, period: '2024-01' },
  // 2024-02
  { name: 'Marie Dubois', department: 'Direction', function: 'CEO', totalCost: 8500, period: '2024-02' },
  { name: 'Pierre Martin', department: 'IT', function: 'Lead Developer', totalCost: 5200, period: '2024-02' },
  { name: 'Sophie Laurent', department: 'IT', function: 'Frontend Dev', totalCost: 4100, period: '2024-02' },
  { name: 'Lucas Bernard', department: 'IT', function: 'Backend Dev', totalCost: 4300, period: '2024-02' },
  { name: 'Emma Petit', department: 'Marketing', function: 'Marketing Manager', totalCost: 4800, period: '2024-02' },
  { name: 'Thomas Roux', department: 'Marketing', function: 'Content Creator', totalCost: 3200, period: '2024-02' },
  { name: 'Léa Moreau', department: 'Sales', function: 'Sales Lead', totalCost: 4500, period: '2024-02' },
  { name: 'Hugo Lefebvre', department: 'Sales', function: 'Account Manager', totalCost: 3800, period: '2024-02' },
  { name: 'Chloé Simon', department: 'Admin', function: 'Office Manager', totalCost: 3400, period: '2024-02' },
  { name: 'Nathan Michel', department: 'Admin', function: 'Comptable', totalCost: 3900, period: '2024-02' },
  // 2024-03 (augmentation)
  { name: 'Marie Dubois', department: 'Direction', function: 'CEO', totalCost: 8700, period: '2024-03' },
  { name: 'Pierre Martin', department: 'IT', function: 'Lead Developer', totalCost: 5400, period: '2024-03' },
  { name: 'Sophie Laurent', department: 'IT', function: 'Frontend Dev', totalCost: 4200, period: '2024-03' },
  { name: 'Lucas Bernard', department: 'IT', function: 'Backend Dev', totalCost: 4400, period: '2024-03' },
  { name: 'Emma Petit', department: 'Marketing', function: 'Marketing Manager', totalCost: 4900, period: '2024-03' },
  { name: 'Thomas Roux', department: 'Marketing', function: 'Content Creator', totalCost: 3300, period: '2024-03' },
  { name: 'Léa Moreau', department: 'Sales', function: 'Sales Lead', totalCost: 4600, period: '2024-03' },
  { name: 'Hugo Lefebvre', department: 'Sales', function: 'Account Manager', totalCost: 3900, period: '2024-03' },
  { name: 'Chloé Simon', department: 'Admin', function: 'Office Manager', totalCost: 3500, period: '2024-03' },
  { name: 'Nathan Michel', department: 'Admin', function: 'Comptable', totalCost: 4000, period: '2024-03' },
  { name: 'Julie Dupont', department: 'IT', function: 'UX Designer', totalCost: 4000, period: '2024-03' },
  // 2024-04
  { name: 'Marie Dubois', department: 'Direction', function: 'CEO', totalCost: 8700, period: '2024-04' },
  { name: 'Pierre Martin', department: 'IT', function: 'Lead Developer', totalCost: 5400, period: '2024-04' },
  { name: 'Sophie Laurent', department: 'IT', function: 'Frontend Dev', totalCost: 4200, period: '2024-04' },
  { name: 'Lucas Bernard', department: 'IT', function: 'Backend Dev', totalCost: 4400, period: '2024-04' },
  { name: 'Emma Petit', department: 'Marketing', function: 'Marketing Manager', totalCost: 5100, period: '2024-04' },
  { name: 'Thomas Roux', department: 'Marketing', function: 'Content Creator', totalCost: 3400, period: '2024-04' },
  { name: 'Léa Moreau', department: 'Sales', function: 'Sales Lead', totalCost: 4700, period: '2024-04' },
  { name: 'Hugo Lefebvre', department: 'Sales', function: 'Account Manager', totalCost: 4000, period: '2024-04' },
  { name: 'Chloé Simon', department: 'Admin', function: 'Office Manager', totalCost: 3500, period: '2024-04' },
  { name: 'Nathan Michel', department: 'Admin', function: 'Comptable', totalCost: 4000, period: '2024-04' },
  { name: 'Julie Dupont', department: 'IT', function: 'UX Designer', totalCost: 4100, period: '2024-04' },
];

const DEMO_MAPPING = {
  'Marie Dubois': 'Direction',
  'Pierre Martin': 'IT',
  'Sophie Laurent': 'IT',
  'Lucas Bernard': 'IT',
  'Julie Dupont': 'IT',
  'Emma Petit': 'Marketing',
  'Thomas Roux': 'Marketing',
  'Léa Moreau': 'Sales',
  'Hugo Lefebvre': 'Sales',
  'Chloé Simon': 'Admin',
  'Nathan Michel': 'Admin'
};

// ============================================
// PLANS TARIFAIRES
// ============================================
const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 0,
    period: 'Gratuit',
    description: 'Pour découvrir Salarize',
    features: [
      '1 société',
      '10 employés max',
      '3 mois d\'historique',
      'Export PDF basique',
      'Support email'
    ],
    notIncluded: [
      'Export Excel',
      'Multi-sociétés',
      'Personnalisation',
      'Support prioritaire'
    ],
    cta: 'Commencer gratuitement',
    popular: false
  },
  {
    name: 'Pro',
    price: 29,
    period: '/mois',
    description: 'Pour les PME en croissance',
    features: [
      '5 sociétés',
      'Employés illimités',
      'Historique illimité',
      'Export PDF & Excel',
      'Logo personnalisé',
      'Comparaisons avancées',
      'Support prioritaire'
    ],
    notIncluded: [
      'API Access',
      'SSO'
    ],
    cta: 'Essai gratuit 14 jours',
    popular: true
  },
  {
    name: 'Business',
    price: 79,
    period: '/mois',
    description: 'Pour les grandes entreprises',
    features: [
      'Sociétés illimitées',
      'Employés illimités',
      'Historique illimité',
      'Export PDF & Excel',
      'Logo personnalisé',
      'Comparaisons avancées',
      'API Access',
      'SSO / SAML',
      'Account Manager dédié',
      'Formation incluse'
    ],
    notIncluded: [],
    cta: 'Contacter les ventes',
    popular: false
  }
];

const DEFAULT_DEPARTMENTS = ['Cuisine', 'Admin', 'Livreur', 'Plonge', 'SAV', 'OPÉR/LIVRAI', 'PREPA COMM', 'MISE EN BAR', 'DIRECTION'];

// Couleurs pour les graphiques
const CHART_COLORS = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#DDD6FE', '#EDE9FE', '#F5F3FF'];

// Page transition wrapper - évite le flash blanc
function PageTransition({ children, className = '', dark = false }) {
  const bgColor = dark ? 'bg-slate-950' : 'bg-slate-50';
  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className={`page-transition ${className}`}>
        {children}
      </div>
    </div>
  );
}

// Inject CSS for animations (only once)
if (typeof document !== 'undefined' && !document.getElementById('salarize-animations')) {
  const style = document.createElement('style');
  style.id = 'salarize-animations';
  style.textContent = `
    /* Transition de page fluide - commence visible puis s'anime */
    .page-transition {
      animation: pageEnter 0.25s ease-out;
    }
    @keyframes pageEnter {
      from { 
        opacity: 0.6; 
        transform: translateY(4px);
      }
      to { 
        opacity: 1; 
        transform: translateY(0);
      }
    }
    
    /* Fond persistant pour éviter le flash */
    html, body, #root {
      background-color: #020617; /* slate-950 */
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-16px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideOutRight {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(100%); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
    .animate-slideIn {
      animation: slideIn 0.3s ease-out forwards;
    }
    .animate-slideInRight {
      animation: slideInRight 0.3s ease-out forwards;
    }
    .animate-slideOutRight {
      animation: slideOutRight 0.2s ease-in forwards;
    }
    .animate-stagger > * {
      opacity: 0;
      animation: fadeIn 0.4s ease-out forwards;
    }
    .animate-stagger > *:nth-child(1) { animation-delay: 0.05s; }
    .animate-stagger > *:nth-child(2) { animation-delay: 0.1s; }
    .animate-stagger > *:nth-child(3) { animation-delay: 0.15s; }
    .animate-stagger > *:nth-child(4) { animation-delay: 0.2s; }
    .animate-stagger > *:nth-child(5) { animation-delay: 0.25s; }
    .animate-stagger > *:nth-child(6) { animation-delay: 0.3s; }
  `;
  document.head.appendChild(style);
}

// ============================================
// COMPOSANTS RÉUTILISABLES & OPTIMISATIONS
// ============================================

// Skeleton Loading Components
const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseClass = 'animate-pulse bg-slate-200 rounded';
  if (variant === 'circle') return <div className={`${baseClass} rounded-full ${className}`} />;
  if (variant === 'text') return <div className={`${baseClass} h-4 ${className}`} />;
  return <div className={`${baseClass} ${className}`} />;
};

const CardSkeleton = () => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-2">
      <Skeleton variant="text" className="w-20 h-3" />
      <Skeleton className="w-12 h-5 rounded-full" />
    </div>
    <Skeleton variant="text" className="w-32 h-7 mb-1" />
    <Skeleton variant="text" className="w-24 h-3" />
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="text" className="w-48 h-5" />
      <Skeleton className="w-32 h-8 rounded-lg" />
    </div>
    <div className="h-64 flex items-end gap-2 pt-8">
      {[40, 65, 45, 80, 55, 70, 60, 75, 50, 85, 65, 72].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

const DeptListSkeleton = () => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-3">
      <Skeleton variant="text" className="w-48 h-5" />
    </div>
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3" />
            <Skeleton variant="text" className="w-24 h-4" />
            <div className="flex-1" />
            <Skeleton variant="text" className="w-8 h-4" />
            <Skeleton variant="text" className="w-12 h-4" />
            <Skeleton variant="text" className="w-20 h-4" />
          </div>
          <Skeleton className="h-1 mt-1.5 ml-5" />
        </div>
      ))}
    </div>
  </div>
);

const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100">
    <div className="p-6 border-b border-slate-100">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-40 h-5" />
        <div className="flex gap-3">
          <Skeleton className="w-48 h-10 rounded-lg" />
          <Skeleton className="w-32 h-10 rounded-lg" />
        </div>
      </div>
    </div>
    <div className="divide-y divide-slate-100">
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton variant="text" className="w-32 h-4 mb-1" />
            <Skeleton variant="text" className="w-20 h-3" />
          </div>
          <Skeleton variant="text" className="w-16 h-4" />
          <Skeleton variant="text" className="w-24 h-5" />
        </div>
      ))}
    </div>
  </div>
);

// Dashboard Loading State
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div>
        <Skeleton variant="text" className="w-40 h-6 mb-1" />
        <Skeleton variant="text" className="w-24 h-4" />
      </div>
    </div>
    
    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
    
    {/* Chart */}
    <ChartSkeleton />
    
    {/* Departments */}
    <DeptListSkeleton />
  </div>
);

// Spinner avec logo S - réutilisable
const LoadingSpinner = ({ size = 'md', text = '', subtext = '', fullScreen = false, light = false }) => {
  const sizes = {
    sm: { container: 'w-10 h-10', text: 'text-sm', border: 'border-2' },
    md: { container: 'w-16 h-16', text: 'text-xl', border: 'border-4' },
    lg: { container: 'w-20 h-20', text: 'text-2xl', border: 'border-4' }
  };
  
  const s = sizes[size];
  const bgColor = light ? 'bg-white' : 'bg-slate-950';
  const textColor = light ? 'text-slate-800' : 'text-white';
  const subtextColor = light ? 'text-slate-500' : 'text-slate-400';
  
  const spinner = (
    <div className="text-center">
      <div className={`${s.container} relative mx-auto ${text || subtext ? 'mb-4' : ''}`}>
        <div className={`${s.container} ${s.border} border-violet-500/30 rounded-full`}></div>
        <div className={`${s.container} ${s.border} border-violet-500 border-t-transparent rounded-full animate-spin absolute inset-0`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${s.text} font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent`}>S</span>
        </div>
      </div>
      {text && <p className={`${textColor} text-base font-medium mb-1`}>{text}</p>}
      {subtext && <p className={`${subtextColor} text-sm`}>{subtext}</p>}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgColor}`}>
        {spinner}
      </div>
    );
  }
  
  return spinner;
};

// Optimized Button Component
const Button = React.memo(({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  className = '',
  icon,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-violet-500 hover:bg-violet-600 text-white focus:ring-violet-500',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-500',
    outline: 'border border-slate-200 hover:bg-slate-50 text-slate-700 focus:ring-slate-500',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
    ghost: 'hover:bg-slate-100 text-slate-600 focus:ring-slate-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
});

// Optimized Modal Component
const Modal = React.memo(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showClose = true 
}) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]'
  };

  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-2xl w-full ${sizes[size]} shadow-2xl`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
});

// Empty State Component
const EmptyState = React.memo(({ 
  icon, 
  title, 
  description, 
  action 
}) => (
  <div className="text-center py-12">
    {icon && (
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
    {description && <p className="text-slate-500 mb-4 max-w-sm mx-auto">{description}</p>}
    {action}
  </div>
));

// Number formatting utilities (memoized)
const formatCurrency = (value, decimals = 2) => {
  if (value == null || isNaN(value)) return '€0';
  return `€${value.toLocaleString('fr-BE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

const formatPercent = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '0%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

const formatNumber = (value) => {
  if (value == null || isNaN(value)) return '0';
  return value.toLocaleString('fr-BE');
};

// Toast notification system
const ToastContext = React.createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 200);
    }, duration);
  }, []);
  
  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning')
  }), [addToast]);
  
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] ${t.exiting ? 'animate-slideOutRight' : 'animate-slideInRight'} ${
              t.type === 'success' ? 'bg-emerald-500 text-white' :
              t.type === 'error' ? 'bg-red-500 text-white' :
              t.type === 'warning' ? 'bg-amber-500 text-white' :
              'bg-slate-800 text-white'
            }`}
          >
            {t.type === 'success' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.type === 'error' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.type === 'warning' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {t.type === 'info' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    // Return no-op functions if outside provider
    return { success: () => {}, error: () => {}, info: () => {}, warning: () => {} };
  }
  return context;
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Oups ! Une erreur s'est produite</h1>
            <p className="text-slate-500 mb-6">Veuillez recharger la page ou contacter le support.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium text-white transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom hook for debouncing values
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

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
        <nav className="hidden md:flex items-center gap-6">
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
          <button 
            onClick={() => setCurrentPage('pricing')}
            className={`text-sm font-medium transition-colors ${currentPage === 'pricing' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Tarifs
          </button>
          <button 
            onClick={() => setCurrentPage('demo')}
            className={`text-sm font-medium transition-colors ${currentPage === 'demo' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Démo
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

// Landing Page Component
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
              Analysez vos coûts
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                salariaux
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Importez vos fichiers de secrétariat social, visualisez vos données par département, 
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
                  Voir la démo
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
                      <p className="text-slate-400 text-[10px] md:text-xs">Coût Total</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">€51.500</p>
                      <p className="text-emerald-500 text-[10px]">↓ -2.3%</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                      <p className="text-slate-400 text-[10px] md:text-xs">Employés</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">11</p>
                      <p className="text-slate-400 text-[10px]">Actifs</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                      <p className="text-slate-400 text-[10px] md:text-xs">Départements</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">5</p>
                      <p className="text-slate-400 text-[10px]">IT en tête</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                      <p className="text-slate-400 text-[10px] md:text-xs">Coût Moyen</p>
                      <p className="font-bold text-slate-800 text-sm md:text-lg">€4.682</p>
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
                            {['Jan', 'Fév', 'Mar', 'Avr'][i]}
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
                Explorer la démo interactive →
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
              Importez vos fichiers de secrétariat social et Excel. Détection automatique des colonnes et des périodes.
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
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

// Features Page
function FeaturesPage({ onLogin, user, onGoToDashboard, setCurrentPage }) {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      title: "Import multi-formats",
      description: "Importez vos fichiers de secrétariat social, Excel (.xlsx, .xls) et CSV. Détection automatique des colonnes et mapping intelligent des données.",
      details: ["Acerta, SD Worx, Securex...", "Fichiers Excel", "Détection automatique", "Mapping intelligent"]
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
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ============================================
// FOOTER COMPONENT
// ============================================
function Footer({ setCurrentPage }) {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-white font-bold text-xl">Salarize</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              La solution belge pour analyser et optimiser vos coûts salariaux.
            </p>
            <a 
              href="mailto:elabdounimohamed144@gmail.com" 
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              elabdounimohamed144@gmail.com
            </a>
          </div>
          
          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Produit</h4>
            <ul className="space-y-3">
              <li><button onClick={() => setCurrentPage('features')} className="text-slate-400 hover:text-white text-sm transition-colors">Fonctionnalités</button></li>
              <li><button onClick={() => setCurrentPage('pricing')} className="text-slate-400 hover:text-white text-sm transition-colors">Tarifs</button></li>
              <li><button onClick={() => setCurrentPage('demo')} className="text-slate-400 hover:text-white text-sm transition-colors">Démo</button></li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:elabdounimohamed144@gmail.com" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Nous contacter
                </a>
              </li>
              <li><button onClick={() => setCurrentPage('demo')} className="text-slate-400 hover:text-white text-sm transition-colors">Guide de démarrage</button></li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Légal</h4>
            <ul className="space-y-3">
              <li><button onClick={() => setCurrentPage('privacy')} className="text-slate-400 hover:text-white text-sm transition-colors">Politique de confidentialité</button></li>
              <li><button onClick={() => setCurrentPage('terms')} className="text-slate-400 hover:text-white text-sm transition-colors">Conditions générales</button></li>
              <li><button onClick={() => setCurrentPage('legal')} className="text-slate-400 hover:text-white text-sm transition-colors">Mentions légales</button></li>
              <li><button onClick={() => setCurrentPage('cookies')} className="text-slate-400 hover:text-white text-sm transition-colors">Politique cookies</button></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Salarize. Tous droits réservés. Made with ❤️ in Belgium 🇧🇪
          </p>
          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <span>Belgique</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// PRICING PAGE
// ============================================
function PricingPage({ onLogin, user, onGoToDashboard, setCurrentPage }) {
  const [annual, setAnnual] = useState(true);
  
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-slate-950 to-fuchsia-600/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-violet-500/20 to-transparent rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400 text-sm font-medium">14 jours d'essai gratuit sur tous les plans</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Des tarifs <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">simples et transparents</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              Choisissez le plan qui correspond à vos besoins. Évoluez quand vous voulez.
            </p>
            
            {/* Toggle */}
            <div className="inline-flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-xl">
              <button 
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!annual ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
              >
                Mensuel
              </button>
              <button 
                onClick={() => setAnnual(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
              >
                Annuel
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">-20%</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {PRICING_PLANS.map((plan, index) => (
            <div 
              key={plan.name}
              className={`relative bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border transition-all hover:-translate-y-1 ${
                plan.popular 
                  ? 'border-violet-500 shadow-lg shadow-violet-500/20' 
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium rounded-full">
                    Plus populaire
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">
                    €{annual && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                {annual && plan.price > 0 && (
                  <p className="text-emerald-400 text-sm mt-1">
                    Économisez €{Math.round(plan.price * 12 * 0.2)}/an
                  </p>
                )}
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
                {plan.notIncluded.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 opacity-50">
                    <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-slate-500 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={user ? onGoToDashboard : onLogin}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/25' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
        
        {/* FAQ teaser */}
        <div className="mt-20 text-center">
          <p className="text-slate-400 mb-4">Des questions sur nos tarifs ?</p>
          <a href="mailto:contact@salarize.be" className="text-violet-400 hover:text-violet-300 font-medium">
            Contactez-nous →
          </a>
        </div>
      </div>
      
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ============================================
// LEGAL PAGES
// ============================================
function LegalPage({ setCurrentPage }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        
        <h1 className="text-4xl font-bold text-white mb-4">Mentions Légales</h1>
        <p className="text-slate-400 mb-8">Conformément à la loi belge du 11 mars 2003</p>
        
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">1. Éditeur du site</h2>
            <p className="text-slate-400 text-sm">
              <strong className="text-slate-300">Salarize</strong><br /><br />
              Responsable de la publication : Mohamed El Abdouni<br />
              Email : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a><br /><br />
              Salarize est un projet personnel développé en Belgique.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">2. Hébergement</h2>
            <p className="text-slate-400 text-sm">
              <strong className="text-slate-300">Hébergeur du site web :</strong><br />
              Vercel Inc.<br />
              440 N Barranca Ave #4133<br />
              Covina, CA 91723, États-Unis<br />
              <a href="https://vercel.com" className="text-violet-400 hover:text-violet-300">https://vercel.com</a><br /><br />
              
              <strong className="text-slate-300">Hébergeur de la base de données :</strong><br />
              Supabase Inc.<br />
              970 Toa Payoh North #07-04<br />
              Singapore 318992<br />
              <a href="https://supabase.com" className="text-violet-400 hover:text-violet-300">https://supabase.com</a>
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">3. Propriété intellectuelle</h2>
            <p className="text-slate-400 text-sm">
              L'ensemble des éléments constituant le site Salarize (textes, graphismes, logiciels, photographies, images, vidéos, sons, plans, noms, logos, marques, créations et œuvres protégeables diverses, bases de données, etc.) ainsi que le site lui-même, relèvent des législations belges et internationales sur le droit d'auteur et la propriété intellectuelle.<br /><br />
              
              Ces éléments sont la propriété exclusive de Salarize. La reproduction ou représentation, intégrale ou partielle, des pages, des données et de tout autre élément constitutif du site, par quelque procédé ou support que ce soit, est interdite et constitue, sans autorisation expresse et préalable de Salarize, une contrefaçon sanctionnée par les articles XI.293 et suivants du Code de droit économique belge.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4. Limitation de responsabilité</h2>
            <p className="text-slate-400 text-sm">
              Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement mis à jour, mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes.<br /><br />
              
              Salarize ne pourra être tenu responsable des dommages directs ou indirects résultant de l'accès au site ou de l'utilisation du site et/ou des informations disponibles sur ce site, sauf en cas de faute intentionnelle ou de faute lourde.<br /><br />
              
              Les données importées par l'utilisateur restent sous sa responsabilité exclusive. Salarize n'est pas responsable de l'exactitude des données salariales importées.
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">5. Droit applicable et juridiction</h2>
            <p className="text-slate-400 text-sm">
              Les présentes mentions légales sont régies par le droit belge. En cas de litige et à défaut d'accord amiable, le litige sera porté devant les tribunaux belges conformément aux règles de compétence en vigueur.<br /><br />
              
              <strong className="text-slate-300">Pour les consommateurs résidant dans l'UE :</strong><br />
              Conformément à l'article 14 du Règlement (UE) n°524/2013, la Commission Européenne met à disposition une plateforme de Règlement en Ligne des Litiges :<br />
              <a href="https://ec.europa.eu/consumers/odr" className="text-violet-400 hover:text-violet-300">https://ec.europa.eu/consumers/odr</a>
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">6. Contact</h2>
            <p className="text-slate-400 text-sm">
              Pour toute question relative aux présentes mentions légales ou pour toute demande concernant le site, vous pouvez nous contacter :<br /><br />
              Email : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

function PrivacyPage({ setCurrentPage }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        
        <h1 className="text-4xl font-bold text-white mb-4">Politique de Confidentialité</h1>
        <p className="text-slate-400 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-BE')}</p>
        
        <div className="space-y-8">
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">1. Responsable du traitement</h2>
            <p className="text-slate-400 text-sm">
              Mohamed El Abdouni, responsable du projet Salarize, est responsable du traitement de vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi belge du 30 juillet 2018 relative à la protection des personnes physiques à l'égard des traitements de données à caractère personnel.<br /><br />
              Contact : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">2. Données collectées</h2>
            <p className="text-slate-400 text-sm mb-4">Nous collectons les données suivantes :</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span><strong className="text-slate-300">Données d'identification :</strong> nom, prénom, adresse email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span><strong className="text-slate-300">Données professionnelles :</strong> nom de société, données salariales importées</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span><strong className="text-slate-300">Données techniques :</strong> adresse IP, type de navigateur, données de connexion</span>
              </li>
            </ul>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">3. Finalités du traitement</h2>
            <p className="text-slate-400 text-sm mb-4">Vos données sont traitées pour :</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>La fourniture et la gestion de nos services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>La création et la gestion de votre compte utilisateur</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>L'amélioration de nos services et de l'expérience utilisateur</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Le respect de nos obligations légales</span>
              </li>
            </ul>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4. Base légale</h2>
            <p className="text-slate-400 text-sm">
              Le traitement de vos données repose sur : l'exécution du contrat (fourniture du service), votre consentement (newsletter, cookies), notre intérêt légitime (amélioration des services), et le respect de nos obligations légales.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">5. Durée de conservation</h2>
            <p className="text-slate-400 text-sm">
              Vos données sont conservées pendant la durée de votre utilisation du service, puis pendant une durée de 3 ans après la clôture de votre compte, sauf obligation légale de conservation plus longue.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">6. Vos droits</h2>
            <p className="text-slate-400 text-sm mb-4">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Droit d'accès à vos données personnelles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Droit de rectification des données inexactes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Droit à l'effacement ("droit à l'oubli")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Droit à la portabilité de vos données</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Droit d'opposition et de limitation du traitement</span>
              </li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              Pour exercer vos droits : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">7. Autorité de contrôle</h2>
            <p className="text-slate-400 text-sm">
              Vous pouvez introduire une réclamation auprès de l'Autorité de Protection des Données (APD) :<br /><br />
              <strong className="text-slate-300">Autorité de protection des données</strong><br />
              Rue de la Presse 35, 1000 Bruxelles<br />
              <a href="https://www.autoriteprotectiondonnees.be" className="text-violet-400 hover:text-violet-300">www.autoriteprotectiondonnees.be</a>
            </p>
          </section>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

function TermsPage({ setCurrentPage }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        
        <h1 className="text-4xl font-bold text-white mb-4">Conditions Générales d'Utilisation</h1>
        <p className="text-slate-400 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-BE')}</p>
        
        <div className="space-y-8">
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 1 - Objet</h2>
            <p className="text-slate-400 text-sm">
              Les présentes conditions générales d'utilisation (CGU) ont pour objet de définir les modalités d'accès et d'utilisation de la plateforme Salarize, accessible à l'adresse salarize.be, éditée par Salarize SPRL.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 2 - Accès au service</h2>
            <p className="text-slate-400 text-sm">
              L'accès au service nécessite la création d'un compte utilisateur. L'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour. Le service est accessible 24h/24, 7j/7, sauf en cas de force majeure ou de maintenance.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 3 - Description du service</h2>
            <p className="text-slate-400 text-sm">
              Salarize est une plateforme d'analyse des coûts salariaux permettant aux entreprises d'importer leurs données de paie, de les visualiser sous forme de tableaux de bord et de générer des rapports. Le service est fourni "tel quel" sans garantie d'adéquation à un usage particulier.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 4 - Tarification</h2>
            <p className="text-slate-400 text-sm">
              Les tarifs en vigueur sont disponibles sur la page Tarifs du site. Les prix sont indiqués en euros, hors TVA. La TVA belge (21%) sera appliquée. Les tarifs peuvent être modifiés à tout moment, les utilisateurs en seront informés avec un préavis de 30 jours.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 5 - Propriété des données</h2>
            <p className="text-slate-400 text-sm">
              L'utilisateur reste propriétaire des données qu'il importe sur la plateforme. Salarize s'engage à ne pas utiliser ces données à d'autres fins que la fourniture du service. En cas de résiliation, l'utilisateur peut exporter ses données pendant une période de 30 jours.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 6 - Responsabilités</h2>
            <p className="text-slate-400 text-sm">
              L'utilisateur est responsable de l'utilisation qu'il fait du service et des données qu'il y importe. Salarize ne saurait être tenu responsable des dommages indirects résultant de l'utilisation du service. La responsabilité de Salarize est limitée au montant des sommes versées par l'utilisateur au cours des 12 derniers mois.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 7 - Résiliation</h2>
            <p className="text-slate-400 text-sm">
              L'utilisateur peut résilier son compte à tout moment depuis les paramètres de son compte. En cas de manquement aux présentes CGU, Salarize se réserve le droit de suspendre ou résilier le compte de l'utilisateur sans préavis.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 8 - Droit applicable</h2>
            <p className="text-slate-400 text-sm">
              Les présentes CGU sont soumises au droit belge. Tout litige relatif à l'interprétation ou à l'exécution des présentes sera soumis aux tribunaux de Bruxelles.
            </p>
          </section>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ============================================
// COOKIES PAGE
// ============================================
function CookiesPage({ setCurrentPage }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        
        <h1 className="text-4xl font-bold text-white mb-4">Politique de Cookies</h1>
        <p className="text-slate-400 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-BE')}</p>
        
        <div className="space-y-6">
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-slate-400 text-sm">
              Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site web. Il permet au site de mémoriser des informations sur votre visite, comme votre langue préférée et d'autres paramètres. Cela peut faciliter votre prochaine visite et rendre le site plus utile pour vous.
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">2. Les cookies que nous utilisons</h2>
            <p className="text-slate-400 text-sm mb-4">Salarize utilise les catégories de cookies suivantes :</p>
            
            <div className="space-y-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  Cookies strictement nécessaires
                </h3>
                <p className="text-slate-400 text-sm">
                  Ces cookies sont indispensables pour naviguer sur le site et utiliser ses fonctionnalités. Ils permettent notamment de maintenir votre session de connexion active. Sans ces cookies, le site ne peut pas fonctionner correctement.
                </p>
                <p className="text-slate-500 text-xs mt-2">Exemple : cookie de session d'authentification (Supabase)</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Cookies de fonctionnalité
                </h3>
                <p className="text-slate-400 text-sm">
                  Ces cookies permettent de mémoriser vos préférences (société active, affichage du dashboard, filtres sélectionnés) pour personnaliser votre expérience sur le site.
                </p>
                <p className="text-slate-500 text-xs mt-2">Exemple : préférences d'affichage, tutoriel vu</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  Cookies analytiques (optionnels)
                </h3>
                <p className="text-slate-400 text-sm">
                  Actuellement, Salarize n'utilise pas de cookies analytiques ou de tracking tiers. Nous ne partageons aucune donnée avec des services d'analyse externes.
                </p>
              </div>
            </div>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">3. Durée de conservation</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 text-slate-300">Cookie</th>
                    <th className="text-left py-3 text-slate-300">Finalité</th>
                    <th className="text-left py-3 text-slate-300">Durée</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-b border-slate-700">
                    <td className="py-3">sb-*-auth-token</td>
                    <td className="py-3">Authentification</td>
                    <td className="py-3">Session</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3">salarize_onboarding_done</td>
                    <td className="py-3">Tutoriel complété</td>
                    <td className="py-3">Permanent</td>
                  </tr>
                  <tr>
                    <td className="py-3">salarize_preferences</td>
                    <td className="py-3">Préférences utilisateur</td>
                    <td className="py-3">1 an</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4. Gestion des cookies</h2>
            <p className="text-slate-400 text-sm mb-4">
              Vous pouvez à tout moment modifier vos préférences en matière de cookies. La plupart des navigateurs vous permettent de :
            </p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Voir les cookies stockés et les supprimer individuellement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Bloquer les cookies tiers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Bloquer tous les cookies d'un site particulier</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Supprimer tous les cookies à la fermeture du navigateur</span>
              </li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              <strong className="text-slate-300">Attention :</strong> Si vous désactivez les cookies nécessaires, certaines fonctionnalités du site pourraient ne plus être disponibles (notamment la connexion à votre compte).
            </p>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">5. Comment gérer les cookies dans votre navigateur</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-white">C</span>
                </div>
                <span className="text-slate-300 text-sm">Google Chrome</span>
              </a>
              <a href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-white">F</span>
                </div>
                <span className="text-slate-300 text-sm">Mozilla Firefox</span>
              </a>
              <a href="https://support.apple.com/fr-be/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-white">S</span>
                </div>
                <span className="text-slate-300 text-sm">Safari</span>
              </a>
              <a href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-white">E</span>
                </div>
                <span className="text-slate-300 text-sm">Microsoft Edge</span>
              </a>
            </div>
          </section>
          
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">6. Contact</h2>
            <p className="text-slate-400 text-sm">
              Pour toute question relative à notre utilisation des cookies, vous pouvez nous contacter à :<br /><br />
              <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

// ============================================
// DEMO PAGE (Dashboard Preview)
// ============================================
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
              <span className="text-amber-400 text-sm font-medium">Mode démonstration - Données fictives</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Découvrez Salarize <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">en action</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-6">
              Explorez notre dashboard avec des données de démonstration
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
              <p className="text-slate-500 text-sm">Coût Total</p>
              <p className="text-2xl font-bold text-slate-800">€{demoTotalCost.toLocaleString('fr-BE')}</p>
              <p className="text-emerald-500 text-xs mt-1">↓ -2.3% vs mois préc.</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm">Employés</p>
              <p className="text-2xl font-bold text-slate-800">{demoEmployeeCount}</p>
              <p className="text-slate-400 text-xs mt-1">Actifs ce mois</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm">Départements</p>
              <p className="text-2xl font-bold text-slate-800">{demoDepts.length}</p>
              <p className="text-slate-400 text-xs mt-1">IT en tête</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-slate-500 text-sm">Coût Moyen</p>
              <p className="text-2xl font-bold text-slate-800">€{Math.round(demoTotalCost / demoEmployeeCount).toLocaleString('fr-BE')}</p>
              <p className="text-slate-400 text-xs mt-1">Par employé</p>
            </div>
          </div>
          
          {/* Chart */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 mb-6">
            <h3 className="font-bold text-slate-800 mb-4">📈 Évolution des Coûts</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demoChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => {
                      const months = ['Jan', 'Fév', 'Mar', 'Avr'];
                      return months[parseInt(value.split('-')[1]) - 1] + " '24";
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => [`€${value.toLocaleString('fr-BE')}`, 'Coût total']}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Departments */}
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">📊 Répartition par Département</h3>
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
                  <span className="text-slate-800 font-semibold text-sm w-20 text-right">€{dept.total.toLocaleString('fr-BE')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-400 mb-6">Prêt à analyser vos propres données ?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={user ? onGoToDashboard : onLogin}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
            >
              {user ? 'Aller au dashboard' : 'Créer un compte gratuit'}
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

// Profile Page
function ProfilePage({ user, onLogout, companies, setCurrentPage, onUpdateUser }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  
  const isGoogleUser = user?.provider === 'google' || user?.picture?.includes('googleusercontent');
  
  // Date d'inscription - utiliser la vraie date si disponible
  const memberSince = useMemo(() => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    // Si on a la date de création du compte
    if (user?.created_at) {
      const date = new Date(user.created_at);
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    
    // Fallback: date actuelle (nouvel utilisateur)
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }, [user?.created_at]);
  
  // Upload avatar
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner une image' });
      return;
    }
    
    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'L\'image ne doit pas dépasser 2MB' });
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      // Convertir en base64 pour stockage simple
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        
        // Mettre à jour dans Supabase user metadata
        const { error } = await supabase.auth.updateUser({
          data: { avatar_url: base64, picture: base64 }
        });
        
        if (error) {
          setMessage({ type: 'error', text: error.message });
          setUploadingAvatar(false);
          return;
        }
        
        // Mettre à jour localement
        const updatedUser = { ...user, picture: base64 };
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        sessionStorage.setItem('salarize_user', JSON.stringify(updatedUser));
        
        setMessage({ type: 'success', text: 'Photo de profil mise à jour' });
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
      setMessage({ type: 'error', text: 'Le nom ne peut pas être vide' });
      return;
    }
    
    if (editEmail !== user?.email && !editEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Email invalide' });
      return;
    }
    
    setSaving(true);
    try {
      // Mise à jour via Supabase
      const updateData = {
        data: { full_name: editName, name: editName }
      };
      
      // Seulement ajouter l'email s'il a changé
      if (editEmail !== user?.email) {
        updateData.email = editEmail;
      }
      
      const { error } = await supabase.auth.updateUser(updateData);
      
      if (error) throw error;
      
      // Mettre à jour localement
      if (onUpdateUser) {
        onUpdateUser({ ...user, name: editName, email: editEmail });
      }
      
      // Mettre à jour le localStorage aussi
      const updatedUser = { ...user, name: editName, email: editEmail };
      sessionStorage.setItem('salarize_user', JSON.stringify(updatedUser));
      
      setMessage({ type: 'success', text: editEmail !== user?.email 
        ? 'Profil mis à jour. Un email de confirmation a été envoyé.' 
        : 'Profil mis à jour avec succès' 
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Update error:', err);
      if (err.message?.includes('session') || err.message?.includes('JWT')) {
        setMessage({ type: 'error', text: 'Session expirée. Veuillez vous reconnecter.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Erreur lors de la mise à jour' });
      }
    }
    setSaving(false);
  };
  
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
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
      
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' });
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.message?.includes('session') || err.message?.includes('JWT')) {
        setMessage({ type: 'error', text: 'Session expirée. Veuillez vous reconnecter.' });
      } else {
        setMessage({ type: 'error', text: err.message || 'Erreur lors du changement de mot de passe' });
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
                  {/* Overlay pour changer la photo */}
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
                  <p className="text-slate-500 text-xs">Voir mes données</p>
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
                  <p className="text-white font-medium text-sm">Fonctionnalités</p>
                  <p className="text-slate-500 text-xs">Découvrir Salarize</p>
                </div>
              </button>
            </div>
          </div>
          
          {/* Colonne droite - Paramètres */}
          <div className="lg:col-span-2 space-y-6">
            {/* Modifier le profil */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">✏️ Informations personnelles</h3>
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
                      {isGoogleUser && <span className="text-amber-400 ml-2">(lié à Google)</span>}
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
                      <p className="text-xs text-slate-500 mt-2">L'email est géré par votre compte Google</p>
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
            
            {/* Changer mot de passe - seulement pour les comptes email */}
            {!isGoogleUser && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">🔐 Mot de passe</h3>
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
                        placeholder="••••••••"
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
                        placeholder="••••••••"
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
                  <p className="text-slate-500 text-sm">••••••••••••</p>
                )}
              </div>
            )}
            
            {/* Mes sociétés */}
            {Object.keys(companies || {}).length > 0 && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🏢 Mes sociétés</h3>
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
                            {new Set((data.employees || []).map(e => e.name)).size} employés • {(data.periods || []).length} périodes
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCurrentPage('dashboard')}
                        className="px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                      >
                        Voir →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Zone danger */}
            <div className="bg-slate-900 rounded-2xl border border-red-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">⚠️ Zone dangereuse</h3>
              <p className="text-slate-400 text-sm mb-4">Ces actions sont irréversibles.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={onLogout}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Se déconnecter
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
                Cette action supprimera définitivement votre compte et toutes vos données. Cette action est irréversible.
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
                      // Supprimer les données de l'utilisateur
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      if (currentUser) {
                        // Supprimer les sociétés (cascade supprimera employees et mappings)
                        await supabase.from('companies').delete().eq('user_id', currentUser.id);
                      }
                      // Déconnecter
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

// Auth Modal - Connexion / Inscription
function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError('');
    setSuccess('');
  };
  
  const handleGoogleLogin = async () => {
    try {
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
      
      if (error) throw error;
      
      if (data.user) {
        onSuccess({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
          picture: data.user.user_metadata?.avatar_url || null,
          provider: 'email'
        });
        onClose();
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect' 
        : err.message);
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
      setError('Le mot de passe doit contenir au moins 6 caractères');
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
        if (data.user.identities?.length === 0) {
          setError('Cet email est déjà utilisé');
        } else {
          setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
          resetForm();
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setSuccess('Un email de réinitialisation a été envoyé');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  
  if (!isOpen) return null;
  
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
                {tab === 'login' ? 'Connexion' : 'Créer un compte'}
              </h2>
              <p className="text-slate-400 text-xs">
                {tab === 'login' ? 'Accédez à votre espace' : 'Rejoignez Salarize'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => { setTab('login'); resetForm(); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'login' 
                ? 'text-violet-400 border-b-2 border-violet-400' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => { setTab('signup'); resetForm(); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'signup' 
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
            className="w-full py-3 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-3 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-slate-500 text-xs">ou par email</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>
          
          {/* Form */}
          <form onSubmit={tab === 'login' ? handleEmailLogin : handleSignup} className="space-y-4">
            {tab === 'signup' && (
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
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            
            {tab === 'signup' && (
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
                  placeholder="••••••••"
                />
              </div>
            )}
            
            {tab === 'login' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Mot de passe oublié ?
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
              {tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Dashboard Header (for when in dashboard view)
function DashboardHeader({ user, onLogout, setCurrentPage, onMenuClick }) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Header minimaliste - visible seulement sur mobile pour le menu
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-0 lg:h-0 flex items-center justify-between px-4 z-30 lg:hidden">
      {/* Mobile only - floating buttons */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button 
          onClick={onMenuClick}
          className="p-2.5 bg-white shadow-lg rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 bg-white shadow-lg rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
          >
            {user?.picture && user?.provider === 'google' ? (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-lg" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg py-2 w-48 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-medium text-slate-800 text-sm">{user?.name}</p>
                  <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                </div>
                <button 
                  onClick={() => { setCurrentPage('home'); setShowDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Accueil site
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
    </header>
  );
}

// Old Header removed - we use LandingHeader and DashboardHeader now

// Modal component OUTSIDE of App to prevent re-renders
function SelectCompanyModal({ companies, newName, setNewName, onSelect, onCancel }) {
  const companyNames = Object.keys(companies);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
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
function Sidebar({ companies, activeCompany, onSelectCompany, onImportClick, onAddCompany, onManageData, onManageDepts, debugMsg, setCurrentPage, isOpen, onClose }) {
  const [showActions, setShowActions] = useState(false);
  
  // Calculer employés non assignés
  const unassignedCount = activeCompany && companies[activeCompany] 
    ? new Set(
        (companies[activeCompany].employees || [])
          .filter(e => !e.department && !companies[activeCompany].mapping?.[e.name])
          .map(e => e.name)
      ).size
    : 0;
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`w-64 bg-slate-900 text-white fixed top-0 left-0 bottom-0 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-700">
          <button 
            onClick={() => setCurrentPage && setCurrentPage('home')}
            className="flex-1 p-5 flex items-center gap-3 hover:bg-slate-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-black text-lg">S</span>
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Salarize</span>
          </button>
          
          {/* Close button mobile */}
          <button 
            onClick={onClose}
            className="p-5 lg:hidden hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Actions Button - Fixed at top */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-center py-3 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
            >
              <svg className={`w-5 h-5 transition-transform ${showActions ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Actions
            </button>
            
            {showActions && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-20">
                  {/* 1. Importer des données - Action principale */}
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
                  
                  {/* 2. Départements - Si société active */}
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
                        <p className="font-medium text-white text-sm">Départements</p>
                        <p className="text-slate-400 text-xs">Réassigner, renommer, fusionner</p>
                      </div>
                    </button>
                  )}
                  
                  {/* 3. Nouvelle société */}
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
                  
                  {/* 4. Séparateur + Gérer société - Si société active */}
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
                        <p className="text-slate-400 text-xs">Périodes, données, supprimer</p>
                      </div>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      
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
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full"></div>
          <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Mes Sociétés</p>
        </div>
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
    </div>
    </>
  );
}

// Modal des paramètres de société avec état local
function CompanySettingsModal({ activeCompany, companies, setCompanies, setActiveCompany, getBrandColor, handleBrandColorChange, onClose, saveAll }) {
  const [localWebsite, setLocalWebsite] = useState(companies[activeCompany]?.website || '');
  const [localName, setLocalName] = useState(activeCompany);
  const [saving, setSaving] = useState(false);
  
  // Détecter si quelque chose a changé
  const originalWebsite = companies[activeCompany]?.website || '';
  const hasWebsiteChanged = localWebsite !== originalWebsite;
  const hasNameChanged = localName.trim() !== '' && localName.trim() !== activeCompany;
  const hasChanges = hasWebsiteChanged || hasNameChanged;
  
  const handleSave = async () => {
    if (!hasChanges) return;
    
    const newName = localName.trim();
    
    // Vérifier si le nouveau nom existe déjà
    if (hasNameChanged && companies[newName]) {
      alert('Une société avec ce nom existe déjà');
      return;
    }
    
    setSaving(true);
    
    let newCompanies = { ...companies };
    
    // Mettre à jour le website
    newCompanies[activeCompany] = {
      ...newCompanies[activeCompany],
      website: localWebsite
    };
    
    // Si le nom a changé, renommer la société
    if (hasNameChanged) {
      newCompanies[newName] = newCompanies[activeCompany];
      delete newCompanies[activeCompany];
      setActiveCompany(newName);
      localStorage.setItem('salarize_active', newName);
    }
    
    setCompanies(newCompanies);
    await saveAll(newCompanies, hasNameChanged ? newName : activeCompany);
    
    setSaving(false);
    onClose();
  };
  
  const brandColor = getBrandColor();
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">🎨 Paramètres de {activeCompany}</h2>
          <button 
            onClick={onClose}
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
            <input
              type="text"
              id="company-name"
              name="companyName"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
            />
          </div>
          
          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site web</label>
            <input
              type="text"
              id="company-website"
              name="website"
              placeholder="www.example.com"
              value={localWebsite}
              onChange={e => setLocalWebsite(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
            />
          </div>
          
          {/* Brand Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Couleur de marque</label>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-lg border-2 border-slate-200"
                style={{ backgroundColor: `rgb(${brandColor})` }}
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
                        brandColor === c.value ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
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
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: hasChanges ? `rgb(${brandColor})` : '#cbd5e1' }}
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </>
            ) : hasChanges ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enregistrer les modifications
              </>
            ) : (
              'Aucune modification'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  // Toast notifications
  const toast = useToast();
  
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
  const [selectedPeriods, setSelectedPeriods] = useState([]); // Empty = all periods
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
  const [selectedEmployees, setSelectedEmployees] = useState(new Set()); // For bulk assign
  const [bulkAssignDept, setBulkAssignDept] = useState(''); // Target department for bulk assign
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'features', 'profile', 'dashboard'
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false); // Chargement des données Supabase
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const dataLoadedRef = useRef(false); // Track si les données ont déjà été chargées
  const companiesRef = useRef({}); // Ref pour tracker companies en temps réel (pour imports multiples)
  const [showExportModal, setShowExportModal] = useState(false);
  const [comparePeriod, setComparePeriod] = useState(null);
  const [comparePeriod1, setComparePeriod1] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [shares, setShares] = useState([]); // Liste des partages actifs
  const [selectedEmployee, setSelectedEmployee] = useState(null); // For employee evolution modal
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile sidebar
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false); // For period multi-select
  const [showAuthModal, setShowAuthModal] = useState(false); // For auth modal
  const [fileQueue, setFileQueue] = useState([]); // File d'attente pour import multi-fichiers
  const [currentFileIndex, setCurrentFileIndex] = useState(0); // Index du fichier en cours
  const [importReady, setImportReady] = useState(false); // Délai avant de pouvoir importer
  
  // === NOUVEAUX ÉTATS PRIORITÉ HAUTE ===
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgets, setBudgets] = useState({}); // { companyName: { monthly: number, alertThreshold: number } }
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', '3m', '6m', '12m', 'ytd'
  const [alerts, setAlerts] = useState([]); // [{ type, message, dept, variation }]
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  
  // === NOUVEAUX ÉTATS PRIORITÉ MOYENNE ===
  const [drillDownDept, setDrillDownDept] = useState(null); // Département sélectionné pour drill-down
  const [showYearComparison, setShowYearComparison] = useState(false); // Toggle graphique comparatif
  const [showKpiSettings, setShowKpiSettings] = useState(false); // Modal KPIs
  const [visibleKpis, setVisibleKpis] = useState({
    totalCost: true,
    employees: true,
    departments: true,
    avgCost: true,
    comparison: true,
    deptBreakdown: true
  });
  const [activityLog, setActivityLog] = useState([]); // Historique des modifications
  const [showActivityLog, setShowActivityLog] = useState(false);
  
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  // Employee detail section states
  const [empSearchTerm, setEmpSearchTerm] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('all');
  const [empSortBy, setEmpSortBy] = useState('cost-desc');
  const [empCurrentPage, setEmpCurrentPage] = useState(1);

  // Debounced search terms for performance
  const debouncedEmpSearch = useDebounce(empSearchTerm, 300);
  const debouncedDeptSearch = useDebounce(deptSearchTerm, 300);

  // Reset pagination when filters change
  useEffect(() => {
    setEmpCurrentPage(1);
  }, [debouncedEmpSearch, empDeptFilter, empSortBy]);

  // Auto-show onboarding for new users
  useEffect(() => {
    if (!isLoading && !isLoadingData && user && !localStorage.getItem('salarize_onboarding_done')) {
      // Petit délai pour laisser le dashboard se charger
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isLoadingData, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape - fermer les modals
      if (e.key === 'Escape') {
        if (showOnboarding) { setShowOnboarding(false); setOnboardingStep(0); }
        else if (showExportModal) setShowExportModal(false);
        else if (showDataManager) { setShowDataManager(false); setConfirmAction(null); }
        else if (showDeptManager) { setShowDeptManager(false); setSelectedEmployees(new Set()); }
        else if (showCompanySettings) setShowCompanySettings(false);
        else if (showImportModal) setShowImportModal(false);
        else if (showModal) setShowModal(false);
        else if (showNewCompanyModal) setShowNewCompanyModal(false);
        else if (showCompareModal) { setShowCompareModal(false); setComparePeriod(null); setComparePeriod1(null); }
      }
      
      // Cmd/Ctrl + E - Export Excel
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && currentPage === 'dashboard') {
        e.preventDefault();
        if (activeCompany && employees.length > 0) {
          exportToExcel();
        }
      }
      
      // Cmd/Ctrl + P - Export PDF (override default print)
      if ((e.metaKey || e.ctrlKey) && e.key === 'p' && currentPage === 'dashboard') {
        e.preventDefault();
        if (activeCompany && employees.length > 0) {
          handleExportPDF();
        }
      }
      
      // Cmd/Ctrl + I - Import
      if ((e.metaKey || e.ctrlKey) && e.key === 'i' && currentPage === 'dashboard') {
        e.preventDefault();
        setShowImportModal(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExportModal, showDataManager, showDeptManager, showCompanySettings, showImportModal, showModal, showNewCompanyModal, showCompareModal, currentPage, activeCompany, employees.length]);

  // Délai avant de pouvoir importer (évite les clics trop rapides)
  useEffect(() => {
    if (pendingPeriodSelection) {
      setImportReady(false);
      const timer = setTimeout(() => setImportReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [pendingPeriodSelection]);

  // Synchroniser companiesRef avec companies state
  useEffect(() => {
    companiesRef.current = companies;
  }, [companies]);

  // Check auth state on load
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      // Détecter le token dans le hash (flow OAuth)
      if (window.location.hash && window.location.hash.includes('access_token')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Session error:', error);
          } else if (data.session) {
            // Nettoyer l'URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Mettre à jour l'user
            const user = data.session.user;
            setUser({
              id: user.id,
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
              email: user.email,
              picture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              created_at: user.created_at,
              provider: user.app_metadata?.provider || 'email'
            });
            setCurrentPage('dashboard');
            loadFromSupabase(user.id);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Récupérer la session existante
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
      }
      
      if (!mounted) return;
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          created_at: session.user.created_at,
          provider: session.user.app_metadata?.provider || 'email'
        });
        // Ne charger que si pas déjà chargé
        if (!dataLoadedRef.current) {
          dataLoadedRef.current = true;
          loadFromSupabase(session.user.id);
        }
      } else {
        if (!dataLoadedRef.current) {
          dataLoadedRef.current = true;
          loadFromLocalStorage();
        }
      }
      setIsLoading(false);
    };
    
    initAuth();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Ignorer les events qui ne changent pas l'état
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Seulement après une nouvelle connexion, aller au dashboard
        setUser(prev => {
          // Si l'user est déjà le même, ne pas mettre à jour
          if (prev?.id === session.user.id) return prev;
          return {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
            email: session.user.email,
            picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            created_at: session.user.created_at,
            provider: session.user.app_metadata?.provider || 'email'
          };
        });
        setCurrentPage('dashboard');
        if (!dataLoadedRef.current) {
          dataLoadedRef.current = true;
          loadFromSupabase(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        dataLoadedRef.current = false; // Reset pour permettre le rechargement après reconnexion
        setUser(null);
        setCompanies({});
        setActiveCompany(null);
        setEmployees([]);
        setView('upload');
        setCurrentPage('home');
      }
      // Ne rien faire pour les autres events (évite les re-renders inutiles)
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    setIsLoadingData(false);
  };

  // Load data from Supabase
  const loadFromSupabase = async (userId) => {
    console.log('[Salarize] Loading data from Supabase for user:', userId);
    setIsLoadingData(true);
    try {
      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId);

      if (companiesError) {
        console.error('[Salarize] Error loading companies:', companiesError);
        throw companiesError;
      }

      console.log('[Salarize] Loaded companies:', companiesData?.length || 0);

      const loadedCompanies = {};
      
      for (const company of companiesData || []) {
        console.log(`[Salarize] Loading data for company: ${company.name} (ID: ${company.id})`);
        
        // Load employees for this company
        const { data: employeesData, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', company.id);

        if (empError) {
          console.error('[Salarize] Error loading employees:', empError);
        }

        // Load mappings for this company
        const { data: mappingsData, error: mapError } = await supabase
          .from('department_mappings')
          .select('*')
          .eq('company_id', company.id);

        if (mapError) {
          console.error('[Salarize] Error loading mappings:', mapError);
        }

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

        console.log(`[Salarize] Company ${company.name}: ${emps.length} employees, ${periods.length} periods`);

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
        console.log('[Salarize] Loading first company:', companyNames[0]);
        loadCompany(companyNames[0], loadedCompanies);
        setCurrentPage('dashboard');
      }
    } catch (e) {
      console.error('[Salarize] Error loading from Supabase:', e);
    }
    setIsLoadingData(false);
  };

  // Save to Supabase - avec logging pour debug
  const saveToSupabase = async (newCompanies, activeCompanyName) => {
    if (!user?.id) {
      console.log('[Salarize] No user ID, saving to localStorage');
      saveToLocalStorage(newCompanies, activeCompanyName);
      return;
    }

    console.log('[Salarize] Saving to Supabase for user:', user.id);
    setIsSyncing(true);
    
    try {
      for (const [companyName, companyData] of Object.entries(newCompanies)) {
        let companyId = companyData.id;
        console.log(`[Salarize] Processing company: ${companyName}, existing ID: ${companyId}`);

        // Create or update company
        if (!companyId) {
          // New company - insert
          console.log(`[Salarize] Creating new company: ${companyName}`);
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

          if (error) {
            console.error('[Salarize] Error creating company:', error);
            // Essayer de récupérer une company existante avec ce nom
            const { data: existingCompany } = await supabase
              .from('companies')
              .select('id')
              .eq('user_id', user.id)
              .eq('name', companyName)
              .single();
            
            if (existingCompany) {
              companyId = existingCompany.id;
              console.log(`[Salarize] Found existing company with ID: ${companyId}`);
            } else {
              throw error;
            }
          } else {
            companyId = newCompany.id;
            console.log(`[Salarize] Company created with ID: ${companyId}`);
          }
          newCompanies[companyName].id = companyId;
        } else {
          // Existing company - update
          console.log(`[Salarize] Updating company: ${companyName} (ID: ${companyId})`);
          const { error } = await supabase
            .from('companies')
            .update({
              name: companyName,
              logo: companyData.logo || null,
              brand_color: companyData.brandColor || null,
              website: companyData.website || null
            })
            .eq('id', companyId);
          
          if (error) {
            console.error('[Salarize] Error updating company:', error);
          }
        }

        // Sync employees
        if (companyData.employees?.length > 0) {
          console.log(`[Salarize] Syncing ${companyData.employees.length} employees for ${companyName}`);
          
          // D'abord supprimer tous les employés existants pour cette company
          const { error: deleteError } = await supabase
            .from('employees')
            .delete()
            .eq('company_id', companyId);
          
          if (deleteError) {
            console.error('[Salarize] Error deleting old employees:', deleteError);
          }
          
          // Puis insérer tous les employés
          const employeesToInsert = companyData.employees.map(e => ({
            company_id: companyId,
            name: e.name,
            department: e.department || null,
            function: e.function || null,
            total_cost: e.totalCost,
            period: e.period
          }));

          // Insert in batches of 500
          const batchSize = 500;
          for (let i = 0; i < employeesToInsert.length; i += batchSize) {
            const batch = employeesToInsert.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('employees')
              .insert(batch);
            
            if (insertError) {
              console.error('[Salarize] Error inserting employees batch:', insertError);
            } else {
              console.log(`[Salarize] Inserted batch ${i / batchSize + 1}, ${batch.length} employees`);
            }
          }
        } else {
          // No employees - delete all
          console.log(`[Salarize] No employees, deleting all for ${companyName}`);
          await supabase.from('employees').delete().eq('company_id', companyId);
        }

        // Sync department mappings
        const mappingEntries = Object.entries(companyData.mapping || {});
        if (mappingEntries.length > 0) {
          console.log(`[Salarize] Syncing ${mappingEntries.length} mappings for ${companyName}`);
          
          // Supprimer les anciens mappings
          await supabase.from('department_mappings').delete().eq('company_id', companyId);
          
          // Insérer les nouveaux
          const mappingsToInsert = mappingEntries.map(([empName, dept]) => ({
            company_id: companyId,
            employee_name: empName,
            department: dept
          }));

          const { error: mappingError } = await supabase
            .from('department_mappings')
            .insert(mappingsToInsert);
          
          if (mappingError) {
            console.error('[Salarize] Error inserting mappings:', mappingError);
          }
        } else {
          await supabase.from('department_mappings').delete().eq('company_id', companyId);
        }
      }

      console.log('[Salarize] Save completed successfully');
      setCompanies(newCompanies);
      setLastSaved(new Date());
    } catch (e) {
      console.error('[Salarize] Error saving to Supabase:', e);
      // Fallback to localStorage
      saveToLocalStorage(newCompanies, activeCompanyName);
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

  // Export Excel amélioré avec comparaisons
  const exportToExcel = () => {
    if (!activeCompany || employees.length === 0) return;
    
    const company = companies[activeCompany];
    const filteredData = selectedPeriods.length === 0 
      ? employees 
      : employees.filter(e => selectedPeriods.includes(e.period));
    
    // Feuille 1 : Résumé avec comparaisons
    const summaryRows = [];
    
    // En-tête du rapport
    summaryRows.push({ 'Rapport': `Analyse Salariale - ${activeCompany}` });
    summaryRows.push({ 'Rapport': `Généré le ${new Date().toLocaleDateString('fr-BE')}` });
    summaryRows.push({});
    
    // Stats globales
    const totalCostExport = filteredData.reduce((sum, e) => sum + e.totalCost, 0);
    summaryRows.push({ 'Indicateur': 'Coût Total', 'Valeur': `€${totalCostExport.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}` });
    summaryRows.push({ 'Indicateur': 'Nombre d\'employés', 'Valeur': new Set(filteredData.map(e => e.name)).size });
    summaryRows.push({ 'Indicateur': 'Périodes analysées', 'Valeur': periods.length });
    
    // Comparaisons si disponibles
    if (comparisonData && comparisonData.current) {
      summaryRows.push({});
      summaryRows.push({ 'Indicateur': '=== COMPARAISONS ===' });
      if (comparisonData.prevMonth && comparisonData.variationVsPrevMonth !== null) {
        summaryRows.push({ 
          'Indicateur': 'vs Mois précédent', 
          'Valeur': `${comparisonData.variationVsPrevMonth >= 0 ? '+' : ''}${comparisonData.variationVsPrevMonth.toFixed(2)}%`,
          'Détail': `€${comparisonData.diffVsPrevMonth?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}`
        });
      }
      if (comparisonData.sameMonthLastYear && comparisonData.variationVsLastYear !== null) {
        summaryRows.push({ 
          'Indicateur': 'vs Année précédente', 
          'Valeur': `${comparisonData.variationVsLastYear >= 0 ? '+' : ''}${comparisonData.variationVsLastYear.toFixed(2)}%`,
          'Détail': `€${comparisonData.diffVsLastYear?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}`
        });
      }
    }
    summaryRows.push({});
    
    // Feuille 2 : Départements avec comparaisons
    const deptRows = [
      { 'Département': 'DÉPARTEMENT', 'Coût Actuel': 'COÛT ACTUEL', 'vs M-1 (%)': 'VS M-1 (%)', 'vs M-1 (€)': 'VS M-1 (€)', 'vs An-1 (%)': 'VS N-1 (%)', 'vs An-1 (€)': 'VS N-1 (€)', 'Employés': 'EMPLOYÉS' }
    ];
    
    Object.entries(deptStatsWithComparison)
      .sort((a, b) => b[1].current - a[1].current)
      .forEach(([dept, data]) => {
        deptRows.push({
          'Département': dept,
          'Coût Actuel': `€${data.current.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}`,
          'vs M-1 (%)': data.variationVsPrevMonth !== null ? `${data.variationVsPrevMonth >= 0 ? '+' : ''}${data.variationVsPrevMonth.toFixed(1)}%` : '-',
          'vs M-1 (€)': data.diffVsPrevMonth ? `€${data.diffVsPrevMonth.toLocaleString('fr-BE', { minimumFractionDigits: 0 })}` : '-',
          'vs An-1 (%)': data.variationVsLastYear !== null ? `${data.variationVsLastYear >= 0 ? '+' : ''}${data.variationVsLastYear.toFixed(1)}%` : '-',
          'vs An-1 (€)': data.diffVsLastYear ? `€${data.diffVsLastYear.toLocaleString('fr-BE', { minimumFractionDigits: 0 })}` : '-',
          'Employés': data.currentCount
        });
      });
    
    // Feuille 3 : Détail employés
    const detailData = filteredData.map(e => ({
      'Nom': e.name,
      'Département': e.department || departmentMapping[e.name] || 'Non assigné',
      'Fonction': e.function || '-',
      'Période': formatPeriod(e.period),
      'Coût total (€)': Math.round(e.totalCost * 100) / 100
    }));
    
    // Créer le workbook
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    const ws2 = XLSX.utils.json_to_sheet(deptRows);
    const ws3 = XLSX.utils.json_to_sheet(detailData);
    
    XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');
    XLSX.utils.book_append_sheet(wb, ws2, 'Comparaison Départements');
    XLSX.utils.book_append_sheet(wb, ws3, 'Détail employés');
    
    // Télécharger
    const periodStr = selectedPeriods.length === 0 ? 'Complet' : selectedPeriods.map(formatPeriod).join('_');
    XLSX.writeFile(wb, `Salarize_${activeCompany}_${periodStr}.xlsx`);
    toast.success('Export Excel téléchargé');
  };

  // Export PDF
  const exportToPDF = async () => {
    if (!activeCompany || employees.length === 0) return;
    
    const company = companies[activeCompany];
    const filteredData = selectedPeriods.length === 0 
      ? employees 
      : employees.filter(e => selectedPeriods.includes(e.period));
    
    // Calculs
    const totalCostPdf = filteredData.reduce((sum, e) => sum + e.totalCost, 0);
    const avgCost = totalCostPdf / filteredData.length;
    
    const deptData = {};
    filteredData.forEach(e => {
      const dept = e.department || departmentMapping[e.name] || 'Non assigné';
      if (!deptData[dept]) deptData[dept] = { count: 0, cost: 0 };
      deptData[dept].count++;
      deptData[dept].cost += e.totalCost;
    });
    
    const deptArray = Object.entries(deptData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.cost - a.cost);
    
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
    const periodStr = selectedPeriods.length === 0 ? 'Toutes périodes' : selectedPeriods.map(formatPeriod).join(', ');
    doc.text(periodStr.length > 30 ? periodStr.substring(0, 30) + '...' : periodStr, pageWidth - 20, 25, { align: 'right' });
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
  const handleLogin = () => {
    setShowAuthModal(true);
  };
  
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    sessionStorage.setItem('salarize_user', JSON.stringify(userData));
    setShowAuthModal(false);
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
    setSelectedPeriods([]);
    setView('dashboard');
  };

  // Détection du type de fichier et de la période depuis le nom
  const detectFileInfo = (filename) => {
    const lower = filename.toLowerCase();
    let provider = 'unknown';
    let suggestedPeriod = null;
    
    // Détecter le fournisseur
    if (lower.includes('acerta')) {
      provider = 'acerta';
    } else if (lower.includes('securex')) {
      provider = 'securex';
    } else if (lower.includes('sd worx') || lower.includes('sdworx')) {
      provider = 'sdworx';
    } else if (lower.includes('partena')) {
      provider = 'partena';
    }
    
    // Détecter la période depuis le nom du fichier
    // Patterns: 2024-01, 01-2024, janvier_2024, jan2024, 202401, etc.
    const patterns = [
      /(\d{4})[-_]?(\d{2})/, // 2024-01 ou 202401
      /(\d{2})[-_](\d{4})/, // 01-2024
      /(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)[-_\s]?(\d{4})/i,
      /(jan|fev|feb|mar|avr|apr|mai|may|jun|jul|aou|aug|sep|oct|nov|dec)[-_\s]?(\d{4})/i,
    ];
    
    const monthNames = {
      'janvier': '01', 'jan': '01', 'février': '02', 'fevrier': '02', 'fev': '02', 'feb': '02',
      'mars': '03', 'mar': '03', 'avril': '04', 'avr': '04', 'apr': '04', 'mai': '05', 'may': '05',
      'juin': '06', 'jun': '06', 'juillet': '07', 'jul': '07', 'août': '08', 'aout': '08', 'aou': '08', 'aug': '08',
      'septembre': '09', 'sep': '09', 'octobre': '10', 'oct': '10', 'novembre': '11', 'nov': '11',
      'décembre': '12', 'decembre': '12', 'dec': '12'
    };
    
    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match) {
        if (match[1].length === 4) {
          // Format YYYY-MM
          const year = match[1];
          const month = match[2].length === 2 ? match[2] : monthNames[match[2].toLowerCase()];
          if (month) {
            suggestedPeriod = `${year}-${month}`;
            break;
          }
        } else if (match[2].length === 4) {
          // Format MM-YYYY ou mois-YYYY
          const year = match[2];
          const month = match[1].length === 2 ? match[1] : monthNames[match[1].toLowerCase()];
          if (month) {
            suggestedPeriod = `${year}-${month}`;
            break;
          }
        }
      }
    }
    
    return { provider, suggestedPeriod };
  };

  // ========== SYSTÈME DE DÉTECTION AUTOMATIQUE MULTI-FORMAT ==========
  
  // Détection intelligente de la période depuis les données du fichier
  const detectPeriodFromData = (rows, headerIdx = 0) => {
    const monthNamesFR = {
      'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
    };
    
    const monthNamesNL = {
      'januari': '01', 'februari': '02', 'maart': '03', 'april': '04',
      'mei': '05', 'juni': '06', 'juli': '07', 'augustus': '08',
      'september': '09', 'oktober': '10', 'november': '11', 'december': '12'
    };
    
    // Chercher dans les lignes avant l'en-tête
    for (let i = 0; i < Math.min(headerIdx + 5, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      
      for (const cell of row) {
        if (!cell) continue;
        const cellStr = String(cell);
        
        // Pattern 1: "Période salariale: 01-03-2024" (Acerta)
        const acertaMatch = cellStr.match(/Période salariale[:\s]+(\d{2})[-\/](\d{2})[-\/](\d{4})/i);
        if (acertaMatch) {
          return `${acertaMatch[3]}-${acertaMatch[2]}`;
        }
        
        // Pattern 2: "Loonperiode: 03/2024" (Securex NL)
        const securexNLMatch = cellStr.match(/Loonperiode[:\s]+(\d{2})[-\/](\d{4})/i);
        if (securexNLMatch) {
          return `${securexNLMatch[2]}-${securexNLMatch[1]}`;
        }
        
        // Pattern 3: "Période: Mars 2024" ou "Période: 03/2024"
        const periodMatch = cellStr.match(/Période[:\s]+(\w+)\s+(\d{4})/i);
        if (periodMatch) {
          const monthLower = periodMatch[1].toLowerCase();
          const month = monthNamesFR[monthLower] || monthNamesNL[monthLower];
          if (month) {
            return `${periodMatch[2]}-${month}`;
          }
        }
        
        // Pattern 4: "03/2024" ou "2024/03"
        const slashMatch = cellStr.match(/(\d{2})[-\/](\d{4})|(\d{4})[-\/](\d{2})/);
        if (slashMatch) {
          if (slashMatch[1] && slashMatch[2]) {
            const month = parseInt(slashMatch[1]);
            if (month >= 1 && month <= 12) {
              return `${slashMatch[2]}-${slashMatch[1]}`;
            }
          } else if (slashMatch[3] && slashMatch[4]) {
            const month = parseInt(slashMatch[4]);
            if (month >= 1 && month <= 12) {
              return `${slashMatch[3]}-${slashMatch[4]}`;
            }
          }
        }
        
        // Pattern 5: Date Excel (nombre de jours depuis 1900)
        if (typeof cell === 'number' && cell > 40000 && cell < 50000) {
          const date = new Date((cell - 25569) * 86400 * 1000);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return `${year}-${month}`;
        }
      }
    }
    
    return null;
  };

  // Analyse du fichier pour suggérer une période basée sur plusieurs indices
  const analyzePeriodSuggestion = (rows, filename) => {
    const suggestions = [];
    
    // 1. Depuis le nom du fichier
    const fileInfo = detectFileInfo(filename);
    if (fileInfo.suggestedPeriod) {
      suggestions.push({ source: 'filename', period: fileInfo.suggestedPeriod, confidence: 0.9 });
    }
    
    // 2. Depuis les données du fichier
    const dataPeriod = detectPeriodFromData(rows);
    if (dataPeriod) {
      suggestions.push({ source: 'data', period: dataPeriod, confidence: 0.95 });
    }
    
    // 3. Depuis la date de modification du fichier (si disponible)
    // Note: file.lastModified peut être utilisé si on a accès à l'objet File
    
    // Retourner la suggestion avec la plus haute confiance
    if (suggestions.length === 0) {
      // Suggérer le mois précédent par défaut
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevMonth.getFullYear();
      const month = String(prevMonth.getMonth() + 1).padStart(2, '0');
      return {
        period: `${year}-${month}`,
        confidence: 0.3,
        source: 'default',
        allSuggestions: suggestions
      };
    }
    
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return {
      period: suggestions[0].period,
      confidence: suggestions[0].confidence,
      source: suggestions[0].source,
      allSuggestions: suggestions
    };
  };

  // Parser Securex amélioré
  const parseSecurex = (rows, filename) => {
    if (!rows || rows.length === 0) return null;
    
    // Chercher des indices Securex
    let isSecurex = false;
    let headerIdx = -1;
    
    // Vérifier les premières lignes pour "Securex" ou des colonnes spécifiques
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      
      const rowStr = row.join(' ').toLowerCase();
      if (rowStr.includes('securex')) {
        isSecurex = true;
      }
      
      // Colonnes typiques Securex: Matricule, Nom, Prénom, Département, Coût total
      const hasMatricule = row.some(c => c && String(c).toLowerCase() === 'matricule');
      const hasNom = row.some(c => c && String(c).toLowerCase() === 'nom');
      const hasCost = row.some(c => c && (
        String(c).toLowerCase().includes('coût') || 
        String(c).toLowerCase().includes('cout') ||
        String(c).toLowerCase().includes('total')
      ));
      
      if ((hasMatricule || hasNom) && hasCost) {
        headerIdx = i;
        break;
      }
    }
    
    if (headerIdx === -1) return null;
    
    console.log('Securex header found at row', headerIdx);
    
    const h = rows[headerIdx];
    
    // Trouver les colonnes
    const findColIdx = (names) => {
      for (let j = 0; j < h.length; j++) {
        const cell = h[j];
        if (!cell) continue;
        const cellLower = String(cell).toLowerCase();
        for (const name of names) {
          if (cellLower === name.toLowerCase() || cellLower.includes(name.toLowerCase())) {
            return j;
          }
        }
      }
      return -1;
    };
    
    const cols = {
      nom: findColIdx(['nom', 'name', 'werknemer']),
      prenom: findColIdx(['prénom', 'prenom', 'voornaam', 'firstname']),
      dept: findColIdx(['département', 'departement', 'department', 'centre de coût', 'centre de cout', 'afdeling']),
      func: findColIdx(['fonction', 'functie', 'function']),
      cost: findColIdx(['coût total', 'cout total', 'totale loonkost', 'total', 'coût', 'cout', 'loonkost'])
    };
    
    console.log('Securex columns:', cols);
    
    if (cols.nom === -1 || cols.cost === -1) return null;
    
    // Détecter la période depuis le fichier ou les données
    let period = 'Unknown';
    const fileInfo = detectFileInfo(filename);
    if (fileInfo.suggestedPeriod) {
      period = fileInfo.suggestedPeriod;
    } else {
      // Chercher dans les premières lignes
      for (let i = 0; i < Math.min(10, headerIdx); i++) {
        const row = rows[i];
        if (!row) continue;
        const rowStr = row.join(' ');
        // Chercher des patterns de date
        const match = rowStr.match(/(\d{2})[-\/](\d{4})|(\d{4})[-\/](\d{2})/);
        if (match) {
          if (match[1] && match[2]) {
            period = `${match[2]}-${match[1]}`;
          } else if (match[3] && match[4]) {
            period = `${match[3]}-${match[4]}`;
          }
          break;
        }
      }
    }
    
    const emps = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      
      const nomVal = r[cols.nom];
      if (!nomVal) continue;
      
      const nom = String(nomVal).trim();
      if (!nom || nom.toLowerCase() === 'nom' || nom.toLowerCase() === 'total') continue;
      
      const costVal = r[cols.cost];
      const cost = parseFloat(String(costVal).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
      if (cost === 0) continue;
      
      // Combiner nom et prénom si disponible
      let fullName = nom;
      if (cols.prenom !== -1 && r[cols.prenom]) {
        fullName = `${nom} ${String(r[cols.prenom]).trim()}`;
      }
      
      emps.push({
        name: fullName,
        department: cols.dept !== -1 && r[cols.dept] ? String(r[cols.dept]).trim() : null,
        function: cols.func !== -1 && r[cols.func] ? String(r[cols.func]).trim() : '',
        totalCost: cost,
        period
      });
    }
    
    console.log('Securex parsed', emps.length, 'employees');
    return emps.length > 0 ? { employees: emps, periods: [period], provider: 'securex' } : null;
  };

  // Parser générique amélioré qui essaie de détecter le format automatiquement
  const parseGeneric = (rows, filename) => {
    if (!rows || rows.length === 0) return null;
    
    // Chercher la ligne d'en-tête la plus probable
    let headerIdx = -1;
    let bestScore = 0;
    
    const costKeywords = ['coût', 'cout', 'cost', 'loonkost', 'salaire', 'total', 'brut'];
    const nameKeywords = ['nom', 'name', 'naam', 'werknemer', 'employé', 'employe'];
    
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;
      
      let score = 0;
      const rowLower = row.map(c => String(c || '').toLowerCase());
      
      for (const cell of rowLower) {
        if (costKeywords.some(k => cell.includes(k))) score += 2;
        if (nameKeywords.some(k => cell.includes(k))) score += 2;
        if (cell.includes('département') || cell.includes('department')) score += 1;
        if (cell.includes('fonction') || cell.includes('function')) score += 1;
      }
      
      if (score > bestScore) {
        bestScore = score;
        headerIdx = i;
      }
    }
    
    if (headerIdx === -1 || bestScore < 3) return null;
    
    console.log('Generic header found at row', headerIdx, 'score:', bestScore);
    
    const h = rows[headerIdx];
    
    // Trouver les colonnes
    const findCol = (keywords) => {
      for (let j = 0; j < h.length; j++) {
        const cell = String(h[j] || '').toLowerCase();
        for (const k of keywords) {
          if (cell.includes(k)) return j;
        }
      }
      return -1;
    };
    
    const cols = {
      nom: findCol(nameKeywords),
      cost: findCol(costKeywords),
      dept: findCol(['département', 'departement', 'department', 'centre', 'afdeling']),
      func: findCol(['fonction', 'function', 'functie'])
    };
    
    if (cols.nom === -1 || cols.cost === -1) return null;
    
    // Période depuis le nom du fichier
    const fileInfo = detectFileInfo(filename);
    let period = fileInfo.suggestedPeriod || 'Unknown';
    
    const emps = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[cols.nom]) continue;
      
      const nom = String(r[cols.nom]).trim();
      if (!nom || nom.toLowerCase() === 'total') continue;
      
      const costVal = r[cols.cost];
      const cost = parseFloat(String(costVal).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
      if (cost === 0) continue;
      
      emps.push({
        name: nom,
        department: cols.dept !== -1 && r[cols.dept] ? String(r[cols.dept]).trim() : null,
        function: cols.func !== -1 && r[cols.func] ? String(r[cols.func]).trim() : '',
        totalCost: cost,
        period
      });
    }
    
    return emps.length > 0 ? { employees: emps, periods: [period], provider: 'generic' } : null;
  };

  // Multi-fichiers: parser plusieurs fichiers et combiner les résultats
  const parseMultipleFiles = async (files) => {
    const results = [];
    
    for (const file of files) {
      try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
        
        let sheetName = wb.SheetNames[0];
        for (const name of wb.SheetNames) {
          const lower = name.toLowerCase();
          if (lower.includes('données') || lower.includes('data') || lower.includes('salaire')) {
            sheetName = name;
            break;
          }
        }
        
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Essayer tous les parsers
        let result = parseAcerta(rows);
        if (!result) result = parseAcertaNL(rows);
        if (!result) result = parseSecurex(rows, file.name);
        if (!result) result = parseGeneric(rows, file.name);
        
        if (result && result.employees.length > 0) {
          // Utiliser la période suggérée depuis le nom du fichier si disponible
          const fileInfo = detectFileInfo(file.name);
          if (fileInfo.suggestedPeriod && result.periods[0] === 'Unknown') {
            result.employees.forEach(e => e.period = fileInfo.suggestedPeriod);
            result.periods = [fileInfo.suggestedPeriod];
          }
          
          results.push({
            filename: file.name,
            ...result,
            suggestedPeriod: fileInfo.suggestedPeriod
          });
        }
      } catch (err) {
        console.error('Error parsing', file.name, err);
      }
    }
    
    return results;
  };

  const parseFile = (file) => {
    return new Promise((resolve) => {
      if (!file) {
        resolve();
        return;
      }
      
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
          
          // Détecter le type de fichier depuis le nom
          const fileInfo = detectFileInfo(file.name);
          console.log('File info detected:', fileInfo);
          
          // Try parse - Acerta FR first, then Acerta NL, then Securex, then generic
          let result = parseAcerta(rows);
          let detectedProvider = 'acerta';
          
          if (!result) {
            result = parseAcertaNL(rows);
            detectedProvider = 'acerta-nl';
          }
          if (!result) {
            result = parseSecurex(rows, file.name);
            detectedProvider = 'securex';
          }
          if (!result) {
            result = parseGeneric(rows, file.name);
            detectedProvider = 'generic';
          }
          
          if (!result || result.employees.length === 0) {
            setDebugMsg('Aucune donnée');
            alert('Aucune donnée trouvée dans ce fichier. Formats supportés: Acerta, Securex, ou fichier avec colonnes Nom + Coût.');
            resolve();
            return;
          }
          
          // Analyse intelligente de la période
          const periodAnalysis = analyzePeriodSuggestion(rows, file.name);
          console.log('Period analysis:', periodAnalysis);
          
          // Appliquer la période suggérée si pas déjà définie
          const suggestedPeriod = periodAnalysis.period;
          if (result.periods[0] === 'Unknown' && suggestedPeriod) {
            result.employees.forEach(e => e.period = suggestedPeriod);
            result.periods = [suggestedPeriod];
          }
          
          console.log('Parsed successfully:', result.employees.length, 'employees, provider:', detectedProvider);
          setDebugMsg(`✓ ${result.employees.length} entrées (${detectedProvider})`);
          
          // Stocker les données avec la période suggérée et les infos de confiance
          setPendingPeriodSelection({
            employees: result.employees,
            suggestedPeriod: result.periods[0] !== 'Unknown' ? result.periods[0] : suggestedPeriod,
            detectedProvider,
            periodConfidence: periodAnalysis.confidence,
            periodSource: periodAnalysis.source,
            fileName: file.name
          });
          setShowImportModal(false);
          resolve();
          
        } catch (err) {
          console.error(err);
          setDebugMsg('Erreur: ' + err.message);
          resolve();
        }
      };
      
      reader.onerror = () => {
        setDebugMsg('Erreur lecture');
        resolve();
      };
      
      reader.readAsArrayBuffer(file);
    });
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
    
    // Utiliser la ref pour avoir les données les plus récentes (important pour imports multiples)
    const currentCompanies = companiesRef.current;
    const existing = currentCompanies[companyName] || { employees: [], mapping: {}, periods: [] };
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
    const newCompanies = { ...currentCompanies, [companyName]: newCompany };
    
    // Mettre à jour la ref IMMÉDIATEMENT pour les imports suivants
    companiesRef.current = newCompanies;
    
    setCompanies(newCompanies);
    setActiveCompany(companyName);
    setEmployees(allEmps);
    setDepartmentMapping(mapping);
    setPeriods(allPeriods);
    saveAll(newCompanies, companyName);
    
    setPendingData(null);
    setShowModal(false);
    setNewCompanyName('');
    setDebugMsg(`✓ ${newEmps.length} nouvelles entrées (total: ${allEmps.length})`);

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

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    
    if (files.length === 1) {
      // Un seul fichier - comportement normal
      await parseFile(files[0]);
    } else {
      // Plusieurs fichiers - créer une file d'attente
      setFileQueue(files);
      setCurrentFileIndex(0);
      // Parser le premier fichier
      await parseFile(files[0]);
    }
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
    return companies[activeCompany]?.brandColor || '139, 92, 246';
  };

  // Convertir RGB string en HEX
  const rgbToHex = (rgbString) => {
    const [r, g, b] = rgbString.split(',').map(s => parseInt(s.trim()));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  // Générer des variantes de couleur (plus clair/foncé)
  const getColorVariants = (rgbString) => {
    const [r, g, b] = rgbString.split(',').map(s => parseInt(s.trim()));
    const hex = rgbToHex(rgbString);
    
    // Version plus claire (pour backgrounds)
    const lighterR = Math.min(255, r + 100);
    const lighterG = Math.min(255, g + 100);
    const lighterB = Math.min(255, b + 100);
    const lighter = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
    
    // Version très claire (pour backgrounds subtils)
    const lightestR = Math.min(255, Math.round(r + (255 - r) * 0.85));
    const lightestG = Math.min(255, Math.round(g + (255 - g) * 0.85));
    const lightestB = Math.min(255, Math.round(b + (255 - b) * 0.85));
    const lightest = `rgb(${lightestR}, ${lightestG}, ${lightestB})`;
    
    // Version foncée
    const darkerR = Math.max(0, r - 30);
    const darkerG = Math.max(0, g - 30);
    const darkerB = Math.max(0, b - 30);
    const darker = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
    const darkerHex = '#' + [darkerR, darkerG, darkerB].map(x => x.toString(16).padStart(2, '0')).join('');
    
    return { hex, rgb: `rgb(${r}, ${g}, ${b})`, lighter, lightest, darker, darkerHex, r, g, b };
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
    // Récupérer la couleur de la société
    const brandColor = getBrandColor();
    const colors = getColorVariants(brandColor);
    
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

    const logoHtml = companies[activeCompany]?.logo 
      ? `<img src="${companies[activeCompany].logo}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;" />`
      : `<div style="width: 60px; height: 60px; border-radius: 12px; background: ${colors.hex}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 28px;">${activeCompany?.charAt(0) || 'S'}</div>`;

    // Générer les barres de répartition
    const maxDeptCost = Math.max(...sortedDepts.map(([_, d]) => d.total));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Salarize - ${activeCompany}</title>
        <meta charset="UTF-8">
        <style>
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
            border-bottom: 3px solid ${colors.hex};
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
            color: ${colors.hex};
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
            background: ${colors.lightest};
            border: 1px solid ${colors.lighter};
            border-radius: 12px;
            padding: 16px;
            text-align: center;
          }
          .stat-card.highlight {
            background: ${colors.hex};
            border: none;
          }
          .stat-card.highlight .stat-value,
          .stat-card.highlight .stat-label {
            color: white;
          }
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: ${colors.darkerHex};
          }
          .stat-label {
            font-size: 10px;
            color: ${colors.hex};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            font-weight: 600;
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
            background: ${colors.hex};
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
            background: ${colors.lightest} !important;
            font-weight: 600;
          }
          .total-row td {
            border-bottom: none;
            color: ${colors.darkerHex};
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
            background: ${colors.hex};
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
            background: ${colors.hex};
            border-radius: 4px;
          }
          
          /* Print Button */
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors.hex};
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-btn:hover { 
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.4);
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
              <div class="header-subtitle">Rapport des coûts salariaux • ${selectedPeriods.length === 0 ? 'Toutes périodes' : selectedPeriods.map(formatPeriod).join(', ')}</div>
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
    toast.success('Rapport PDF généré');
  };

  // Partager le rapport avec un CEO/collaborateur
  const handleShare = async () => {
    if (!shareEmail || !activeCompany) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail)) {
      toast.error('Adresse email invalide');
      return;
    }
    
    setShareSending(true);
    
    try {
      const totalCostValue = filtered.reduce((s, e) => s + e.totalCost, 0);
      const uniqueEmps = new Set(filtered.map(e => e.name)).size;
      const periodsCount = periods.length;
      const avgCost = uniqueEmps > 0 ? totalCostValue / uniqueEmps : 0;
      
      const shareToken = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('name', activeCompany)
          .single();
        
        if (companyData) {
          await supabase
            .from('shares')
            .insert({
              company_id: companyData.id,
              shared_by: currentUser.id,
              shared_with_email: shareEmail,
              token: shareToken,
              message: shareMessage,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        }
      }
      
      const senderName = user?.name || 'Un utilisateur Salarize';
      const emailSubject = `📊 Rapport salarial ${activeCompany}`;
      
      const deptCosts = {};
      filtered.forEach(e => {
        const dept = e.department || departmentMapping[e.name] || 'Non assigné';
        deptCosts[dept] = (deptCosts[dept] || 0) + e.totalCost;
      });
      const topDepts = Object.entries(deptCosts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dept, cost]) => `  • ${dept}: €${cost.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}`)
        .join('\n');
      
      const emailBody = `Bonjour,

${senderName} vous partage un rapport salarial via Salarize.

📊 RÉSUMÉ - ${activeCompany}

💰 Coût total: €${totalCostValue.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
👥 Nombre d'employés: ${uniqueEmps}
📅 Périodes analysées: ${periodsCount}
📈 Coût moyen/employé: €${avgCost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}

🏢 TOP DÉPARTEMENTS PAR COÛT
${topDepts}

${shareMessage ? `💬 MESSAGE: "${shareMessage}"\n` : ''}
Ce rapport a été généré par Salarize.

Cordialement,
L'équipe Salarize`;

      let emailSent = false;
      
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            to: shareEmail,
            subject: emailSubject,
            text: emailBody,
            from_name: senderName
          })
        });
        
        if (response.ok) {
          emailSent = true;
          toast.success(`Email envoyé à ${shareEmail}`);
        }
      } catch (e) {
        console.log('Edge Function non disponible');
      }
      
      if (!emailSent) {
        const mailtoLink = `mailto:${shareEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
        toast.success(`Client email ouvert pour ${shareEmail}`);
      }
      
      setShowShareModal(false);
      setShareEmail('');
      setShareMessage('');
      
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Erreur lors du partage');
    }
    
    setShareSending(false);
  };

  // Load user from localStorage
  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem('salarize_user');
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

  const deleteCompany = async () => {
    if (!activeCompany) return;
    
    // Récupérer l'ID de la société à supprimer avant de la retirer
    const companyToDelete = companies[activeCompany];
    const companyId = companyToDelete?.id;
    
    const newCompanies = { ...companies };
    delete newCompanies[activeCompany];
    setCompanies(newCompanies);
    
    // Supprimer de Supabase si connecté et si la société a un ID
    if (user?.id && companyId) {
      try {
        // Supprimer les employés
        await supabase.from('employees').delete().eq('company_id', companyId);
        // Supprimer les mappings
        await supabase.from('department_mappings').delete().eq('company_id', companyId);
        // Supprimer la société
        await supabase.from('companies').delete().eq('id', companyId);
      } catch (e) {
        console.error('Error deleting company from Supabase:', e);
      }
    }
    
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

  // Computed values with useMemo for performance
  const filtered = useMemo(() => 
    selectedPeriods.length === 0 
      ? employees 
      : employees.filter(e => selectedPeriods.includes(e.period)),
    [employees, selectedPeriods]
  );
  
  const totalCost = useMemo(() => 
    filtered.reduce((s, e) => s + e.totalCost, 0),
    [filtered]
  );
  
  const uniqueNames = useMemo(() => 
    new Set(filtered.map(e => e.name)).size,
    [filtered]
  );
  
  // Get unique years from periods
  const years = useMemo(() => 
    [...new Set(periods.map(p => p.substring(0, 4)))].sort(),
    [periods]
  );
  
  // Filter chart data by selected periods or quick filters
  const chartData = useMemo(() => {
    let filteredPeriods = periods;
    
    // Si des périodes spécifiques sont sélectionnées
    if (selectedPeriods.length > 0) {
      filteredPeriods = periods.filter(p => selectedPeriods.includes(p));
    } 
    // Sinon appliquer les filtres rapides
    else if (periodFilter !== 'all') {
      const sortedPeriods = [...periods].sort((a, b) => b.localeCompare(a));
      const now = new Date();
      const currentYear = now.getFullYear();
      
      if (periodFilter === '3m') {
        filteredPeriods = sortedPeriods.slice(0, 3);
      } else if (periodFilter === '6m') {
        filteredPeriods = sortedPeriods.slice(0, 6);
      } else if (periodFilter === '12m') {
        filteredPeriods = sortedPeriods.slice(0, 12);
      } else if (periodFilter === 'ytd') {
        filteredPeriods = periods.filter(p => p.startsWith(String(currentYear)));
      }
    }
    
    // Aussi filtrer par année si sélectionnée
    if (selectedYear !== 'all') {
      filteredPeriods = filteredPeriods.filter(p => p.startsWith(selectedYear));
    }
    
    return filteredPeriods
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
  }, [periods, employees, selectedYear, selectedPeriods, periodFilter]);
  
  // Années uniques pour les couleurs
  const uniqueYears = useMemo(() => 
    [...new Set(chartData.map(d => d.year))].sort(),
    [chartData]
  );

  // === NOUVELLES COMPARAISONS AVANCÉES ===
  
  // Période actuelle et périodes de comparaison
  const comparisonData = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    
    const sortedPeriods = [...chartData].sort((a, b) => b.period.localeCompare(a.period));
    const current = sortedPeriods[0];
    
    if (!current || !current.period) return null;
    
    const currentMonth = current.period.substring(5);
    const currentYear = parseInt(current.period.substring(0, 4));
    
    // Mois précédent
    const prevMonth = sortedPeriods[1] || null;
    
    // Même mois année précédente
    const sameMonthLastYear = chartData.find(d => {
      const month = d.period.substring(5);
      const year = parseInt(d.period.substring(0, 4));
      return month === currentMonth && year === currentYear - 1;
    }) || null;
    
    // Calculs de variation
    const calcVariation = (current, previous) => {
      if (!previous || previous.total === 0) return null;
      return ((current.total - previous.total) / previous.total) * 100;
    };
    
    return {
      current,
      prevMonth,
      sameMonthLastYear,
      variationVsPrevMonth: prevMonth ? calcVariation(current, prevMonth) : null,
      variationVsLastYear: sameMonthLastYear ? calcVariation(current, sameMonthLastYear) : null,
      diffVsPrevMonth: prevMonth ? current.total - prevMonth.total : null,
      diffVsLastYear: sameMonthLastYear ? current.total - sameMonthLastYear.total : null
    };
  }, [chartData]);

  // Stats par département avec comparaisons
  const deptStatsWithComparison = useMemo(() => {
    if (!chartData || chartData.length === 0 || !employees || employees.length === 0) return {};
    
    const sortedPeriods = [...chartData].sort((a, b) => b.period.localeCompare(a.period));
    if (sortedPeriods.length === 0) return {};
    
    const currentPeriod = sortedPeriods[0]?.period;
    const prevPeriod = sortedPeriods[1]?.period;
    
    if (!currentPeriod) return {};
    
    const currentMonth = currentPeriod.substring(5);
    const currentYear = parseInt(currentPeriod.substring(0, 4));
    const sameMonthLastYearPeriod = currentMonth ? `${currentYear - 1}-${currentMonth}` : null;
    
    const stats = {};
    
    // Calculer pour chaque département
    employees.forEach(e => {
      const d = e.department || departmentMapping[e.name] || 'Non assigné';
      if (!stats[d]) {
        stats[d] = {
          current: 0,
          prevMonth: 0,
          sameMonthLastYear: 0,
          currentCount: 0,
          prevMonthCount: 0,
          lastYearCount: 0
        };
      }
      
      if (e.period === currentPeriod) {
        stats[d].current += e.totalCost;
        stats[d].currentCount++;
      }
      if (prevPeriod && e.period === prevPeriod) {
        stats[d].prevMonth += e.totalCost;
        stats[d].prevMonthCount++;
      }
      if (sameMonthLastYearPeriod && e.period === sameMonthLastYearPeriod) {
        stats[d].sameMonthLastYear += e.totalCost;
        stats[d].lastYearCount++;
      }
    });
    
    // Calculer les variations
    Object.keys(stats).forEach(dept => {
      const s = stats[dept];
      s.variationVsPrevMonth = s.prevMonth > 0 ? ((s.current - s.prevMonth) / s.prevMonth) * 100 : null;
      s.variationVsLastYear = s.sameMonthLastYear > 0 ? ((s.current - s.sameMonthLastYear) / s.sameMonthLastYear) * 100 : null;
      s.diffVsPrevMonth = s.prevMonth > 0 ? s.current - s.prevMonth : null;
      s.diffVsLastYear = s.sameMonthLastYear > 0 ? s.current - s.sameMonthLastYear : null;
    });
    
    return stats;
  }, [employees, chartData, departmentMapping]);
  
  const deptStats = useMemo(() => {
    const stats = {};
    filtered.forEach(e => {
      const d = e.department || departmentMapping[e.name] || 'Non assigné';
      if (!stats[d]) stats[d] = { total: 0, count: 0 };
      stats[d].total += e.totalCost;
      stats[d].count++;
    });
    return stats;
  }, [filtered, departmentMapping]);
  
  const sortedDepts = useMemo(() => 
    Object.entries(deptStats).sort((a, b) => b[1].total - a[1].total),
    [deptStats]
  );
  
  const maxCost = useMemo(() => 
    Math.max(...sortedDepts.map(([_name, d]) => d.total), 1),
    [sortedDepts]
  );

  const empAgg = useMemo(() => {
    const agg = {};
    filtered.forEach(e => {
      if (!agg[e.name]) agg[e.name] = { name: e.name, dept: e.department || departmentMapping[e.name] || 'Non assigné', cost: 0 };
      agg[e.name].cost += e.totalCost;
    });
    return agg;
  }, [filtered, departmentMapping]);
  
  const empList = useMemo(() => 
    Object.values(empAgg).sort((a, b) => b.cost - a.cost),
    [empAgg]
  );

  // === FILTRAGE PÉRIODES DYNAMIQUE ===
  const filteredPeriodsByRange = useMemo(() => {
    if (periodFilter === 'all' || periods.length === 0) return periods;
    
    const sortedPeriods = [...periods].sort((a, b) => b.localeCompare(a));
    const latestPeriod = sortedPeriods[0];
    const latestYear = parseInt(latestPeriod.substring(0, 4));
    const latestMonth = parseInt(latestPeriod.substring(5, 7));
    
    const getMonthsAgo = (months) => {
      const result = [];
      for (let i = 0; i < months && i < sortedPeriods.length; i++) {
        result.push(sortedPeriods[i]);
      }
      return result;
    };
    
    switch (periodFilter) {
      case '3m':
        return getMonthsAgo(3);
      case '6m':
        return getMonthsAgo(6);
      case '12m':
        return getMonthsAgo(12);
      case 'ytd':
        return periods.filter(p => p.startsWith(latestYear.toString()));
      default:
        return periods;
    }
  }, [periods, periodFilter]);

  // === GÉNÉRATION AUTOMATIQUE DES ALERTES ===
  const generatedAlerts = useMemo(() => {
    const alertsList = [];
    const budget = budgets[activeCompany];
    const alertThreshold = budget?.alertThreshold || 10; // 10% par défaut
    
    // Alertes sur les départements
    Object.entries(deptStatsWithComparison).forEach(([dept, data]) => {
      if (data.variationVsPrevMonth !== null && Math.abs(data.variationVsPrevMonth) >= alertThreshold) {
        alertsList.push({
          type: data.variationVsPrevMonth > 0 ? 'warning' : 'success',
          category: 'department',
          dept,
          message: data.variationVsPrevMonth > 0 
            ? `${dept}: +${data.variationVsPrevMonth.toFixed(1)}% vs mois précédent`
            : `${dept}: ${data.variationVsPrevMonth.toFixed(1)}% vs mois précédent`,
          variation: data.variationVsPrevMonth,
          diff: data.diffVsPrevMonth
        });
      }
    });
    
    // Alerte budget global
    if (budget?.monthly && comparisonData?.current) {
      const budgetVariation = ((comparisonData.current.total - budget.monthly) / budget.monthly) * 100;
      if (budgetVariation > 0) {
        alertsList.push({
          type: 'danger',
          category: 'budget',
          message: `Budget dépassé de ${budgetVariation.toFixed(1)}% (€${(comparisonData.current.total - budget.monthly).toLocaleString('fr-BE', { minimumFractionDigits: 2 })})`,
          variation: budgetVariation,
          diff: comparisonData.current.total - budget.monthly
        });
      } else if (budgetVariation > -10) {
        alertsList.push({
          type: 'warning',
          category: 'budget',
          message: `Budget presque atteint: ${(100 + budgetVariation).toFixed(1)}% utilisé`,
          variation: budgetVariation
        });
      }
    }
    
    // Trier par gravité
    return alertsList.sort((a, b) => {
      const priority = { danger: 0, warning: 1, success: 2 };
      return priority[a.type] - priority[b.type];
    });
  }, [deptStatsWithComparison, budgets, activeCompany, comparisonData]);

  // === DONNÉES GRAPHIQUE COMPARATIF ANNÉE SUR ANNÉE ===
  const yearComparisonData = useMemo(() => {
    if (chartData.length === 0) return [];
    
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const yearlyData = {};
    
    // Grouper par année
    chartData.forEach(d => {
      const year = d.period.substring(0, 4);
      const month = parseInt(d.period.substring(5, 7), 10);
      if (!yearlyData[year]) yearlyData[year] = {};
      yearlyData[year][month] = d.total;
    });
    
    // Créer les données pour chaque mois
    const result = months.map((monthName, idx) => {
      const monthNum = idx + 1;
      const row = { month: monthName };
      Object.keys(yearlyData).sort().forEach(year => {
        row[year] = yearlyData[year][monthNum] || null;
      });
      return row;
    });
    
    return result;
  }, [chartData]);

  // === EMPLOYÉS PAR DÉPARTEMENT (DRILL-DOWN) ===
  const drillDownEmployees = useMemo(() => {
    if (!drillDownDept) return [];
    
    const deptEmployees = {};
    employees.forEach(e => {
      const dept = e.department || departmentMapping[e.name] || 'Non assigné';
      if (dept === drillDownDept) {
        if (!deptEmployees[e.name]) {
          deptEmployees[e.name] = { name: e.name, total: 0, periods: [] };
        }
        deptEmployees[e.name].total += e.totalCost;
        deptEmployees[e.name].periods.push({ period: e.period, cost: e.totalCost });
      }
    });
    
    return Object.values(deptEmployees).sort((a, b) => b.total - a.total);
  }, [drillDownDept, employees, departmentMapping]);

  // === FONCTION LOG ACTIVITÉ ===
  const logActivity = useCallback((action, details) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      details,
      user: user?.name || 'Anonyme',
      company: activeCompany
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 100)); // Garder 100 dernières entrées
  }, [user, activeCompany]);

  // Loading screen
  if (isLoading) {
    return <LoadingSpinner size="lg" text="Salarize" subtext="Chargement de votre espace..." fullScreen />;
  }

  // Landing page (home)
  if (currentPage === 'home') {
    return (
      <PageTransition key="home" dark>
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
          onViewDemo={() => setCurrentPage('demo')}
          setCurrentPage={setCurrentPage}
        />
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </PageTransition>
    );
  }

  // Features page
  if (currentPage === 'features') {
    return (
      <PageTransition key="features" dark>
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
          setCurrentPage={setCurrentPage}
        />
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </PageTransition>
    );
  }

  // Pricing page (accessible à tous)
  if (currentPage === 'pricing') {
    return (
      <PageTransition key="pricing" dark>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <PricingPage 
          onLogin={handleLogin} 
          user={user} 
          onGoToDashboard={() => setCurrentPage('dashboard')}
          setCurrentPage={setCurrentPage}
        />
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </PageTransition>
    );
  }

  // Demo page (accessible à tous)
  if (currentPage === 'demo') {
    return (
      <PageTransition key="demo" dark>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <DemoPage 
          onLogin={handleLogin} 
          user={user} 
          onGoToDashboard={() => setCurrentPage('dashboard')}
          setCurrentPage={setCurrentPage}
        />
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </PageTransition>
    );
  }

  // Legal pages (accessibles à tous)
  if (currentPage === 'legal') {
    return (
      <PageTransition key="legal" dark>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <LegalPage setCurrentPage={setCurrentPage} />
      </PageTransition>
    );
  }

  if (currentPage === 'privacy') {
    return (
      <PageTransition key="privacy" dark>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <PrivacyPage setCurrentPage={setCurrentPage} />
      </PageTransition>
    );
  }

  if (currentPage === 'terms') {
    return (
      <PageTransition key="terms" dark>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <TermsPage setCurrentPage={setCurrentPage} />
      </PageTransition>
    );
  }

  if (currentPage === 'cookies') {
    return (
      <PageTransition key="cookies" dark>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <CookiesPage setCurrentPage={setCurrentPage} />
      </PageTransition>
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
      <PageTransition key="profile" dark>
        <LandingHeader 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <ProfilePage 
          user={user} 
          onLogout={handleLogout} 
          companies={companies}
          setCurrentPage={setCurrentPage}
        />
      </PageTransition>
    );
  }

  // Upload screen (connected but no companies yet AND data is loaded)
  if (Object.keys(companies).length === 0 && view === 'upload' && !isLoadingData) {
    return (
      <PageTransition key="upload">
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
                  id="file-upload"
                  name="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </label>
              
              {debugMsg && (
                <p className="mt-4 text-sm text-slate-400 text-center">{debugMsg}</p>
              )}
            </div>
            
            <p className="text-center text-slate-600 text-sm mt-6">
              Compatible : Export secrétariat social (Acerta, SD Worx, Securex...), fichiers d'analyse internes
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
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
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
      </PageTransition>
    );
  }

  // Assignment screen
  if (view === 'assign' && currentAssignment) {
    return (
      <PageTransition key="assign">
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
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
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
          <div className="lg:ml-64 flex-1 flex items-center justify-center bg-slate-100 p-4">
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
      </PageTransition>
    );
  }

  // Dashboard
  return (
    <PageTransition key="dashboard">
      <div className="min-h-screen flex bg-slate-50">
        <Sidebar 
          companies={companies}
          activeCompany={activeCompany}
          onSelectCompany={(name) => { loadCompany(name); setSidebarOpen(false); }}
          onImportClick={() => { setShowImportModal(true); setSidebarOpen(false); }}
          onAddCompany={() => { setShowNewCompanyModal(true); setSidebarOpen(false); }}
          onManageData={() => { setShowDataManager(true); setSidebarOpen(false); }}
          onManageDepts={() => { setShowDeptManager(true); setSidebarOpen(false); }}
          debugMsg={debugMsg}
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <DashboardHeader 
          user={user} 
          onLogout={handleLogout} 
          setCurrentPage={setCurrentPage} 
          onMenuClick={() => setSidebarOpen(true)}
        />
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
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
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
        <CompanySettingsModal 
          activeCompany={activeCompany}
          companies={companies}
          setCompanies={setCompanies}
          setActiveCompany={setActiveCompany}
          getBrandColor={getBrandColor}
          handleBrandColorChange={handleBrandColorChange}
          onClose={() => setShowCompanySettings(false)}
          saveAll={saveAll}
        />
      )}
      
      {/* Import Modal with Drag & Drop */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
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
            
            {/* Formats supportés */}
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">✓ Acerta</span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">✓ Securex</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">SD Worx (bientôt)</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">Partena (bientôt)</span>
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
                  <p className="font-semibold text-blue-800 mb-1">Détection automatique</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Le format du fichier est détecté automatiquement</li>
                    <li>• La période est suggérée depuis le nom du fichier</li>
                    <li>• Vous pouvez importer plusieurs fichiers à la fois</li>
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
                  Import vers <strong>{activeCompany}</strong>
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
                  id="import-file"
                  name="importFile" 
                  accept=".xlsx,.xls"
                  multiple
                  onChange={(e) => {
                    handleFileChange(e);
                    setShowImportModal(false);
                  }}
                  className="hidden" 
                />
              </label>
            </div>
            
            <p className="text-xs text-slate-400 mt-4 text-center">
              Formats supportés : .xlsx, .xls (Acerta, SD Worx, Securex, format interne)
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
      
      {/* Period Selection Modal - Redesigned */}
      {pendingPeriodSelection && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Header avec gradient */}
            <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              
              <div className="relative">
                {/* Progress pour multi-fichiers */}
                {fileQueue.length > 1 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">Import en cours</span>
                      <span className="text-white/80">{currentFileIndex + 1} / {fileQueue.length}</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-300"
                        style={{ width: `${((currentFileIndex + 1) / fileQueue.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Nom du fichier */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">
                      {pendingPeriodSelection.fileName || 'Fichier importé'}
                    </p>
                    <p className="text-white/70 text-sm">
                      {pendingPeriodSelection.employees.length} employés • {pendingPeriodSelection.detectedProvider === 'acerta' ? 'Acerta FR' : 
                       pendingPeriodSelection.detectedProvider === 'acerta-nl' ? 'Acerta NL' :
                       pendingPeriodSelection.detectedProvider === 'securex' ? 'Securex' : 'Format générique'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Bouton fermer */}
              <button 
                onClick={() => {
                  setPendingPeriodSelection(null);
                  setFileQueue([]);
                  setCurrentFileIndex(0);
                }}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Contenu */}
            <div className="p-6">
              {/* Période suggérée */}
              {pendingPeriodSelection.suggestedPeriod && pendingPeriodSelection.suggestedPeriod !== 'Unknown' && (
                <div className={`mb-6 p-4 rounded-2xl flex items-center gap-4 ${
                  pendingPeriodSelection.periodConfidence >= 0.8 
                    ? 'bg-emerald-50 border-2 border-emerald-200' 
                    : 'bg-amber-50 border-2 border-amber-200'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    pendingPeriodSelection.periodConfidence >= 0.8 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-lg ${
                      pendingPeriodSelection.periodConfidence >= 0.8 ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {formatPeriod(pendingPeriodSelection.suggestedPeriod)}
                    </p>
                    <p className={`text-sm ${
                      pendingPeriodSelection.periodConfidence >= 0.8 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {pendingPeriodSelection.periodSource === 'data' ? 'Détectée dans les données' : 
                       pendingPeriodSelection.periodSource === 'filename' ? 'Détectée dans le nom du fichier' : 
                       'Suggestion automatique'}
                    </p>
                  </div>
                  {pendingPeriodSelection.periodConfidence >= 0.8 && (
                    <div className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                      ✓ Sûr
                    </div>
                  )}
                </div>
              )}
              
              {/* Sélecteur de période */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  {pendingPeriodSelection.suggestedPeriod && pendingPeriodSelection.suggestedPeriod !== 'Unknown' 
                    ? 'Modifier si nécessaire' 
                    : 'Sélectionnez la période'}
                </label>
                <div className="flex gap-3">
                  <select 
                    id="period-year"
                    className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:bg-white outline-none text-lg font-medium transition-colors"
                    defaultValue={
                      pendingPeriodSelection.suggestedPeriod && pendingPeriodSelection.suggestedPeriod !== 'Unknown'
                        ? pendingPeriodSelection.suggestedPeriod.split('-')[0]
                        : new Date().getFullYear()
                    }
                  >
                    {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select 
                    id="period-month"
                    className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:bg-white outline-none font-medium transition-colors"
                    defaultValue={
                      pendingPeriodSelection.suggestedPeriod && pendingPeriodSelection.suggestedPeriod !== 'Unknown'
                        ? pendingPeriodSelection.suggestedPeriod.split('-')[1]
                        : String(new Date().getMonth() + 1).padStart(2, '0')
                    }
                  >
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                      <option key={m} value={m}>
                        {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][parseInt(m) - 1]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Boutons d'action */}
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setPendingPeriodSelection(null);
                    setFileQueue([]);
                    setCurrentFileIndex(0);
                  }}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  disabled={!importReady}
                  onClick={async () => {
                    if (!importReady) return;
                    
                    const year = document.getElementById('period-year').value;
                    const month = document.getElementById('period-month').value;
                    const period = `${year}-${month}`;
                    
                    const updatedEmployees = pendingPeriodSelection.employees.map(e => ({
                      ...e,
                      period
                    }));
                    
                    const result = {
                      employees: updatedEmployees,
                      periods: [period]
                    };
                    
                    if (activeCompany && view === 'dashboard') {
                      importToCompanyDirect(activeCompany, result);
                    } else {
                      setPendingData(result);
                      setShowModal(true);
                    }
                    
                    if (fileQueue.length > 0 && currentFileIndex < fileQueue.length - 1) {
                      const nextIndex = currentFileIndex + 1;
                      setCurrentFileIndex(nextIndex);
                      setPendingPeriodSelection(null);
                      setTimeout(async () => {
                        await parseFile(fileQueue[nextIndex]);
                      }, 300);
                    } else {
                      setPendingPeriodSelection(null);
                      setFileQueue([]);
                      setCurrentFileIndex(0);
                      if (fileQueue.length > 1) {
                        toast.success(`${fileQueue.length} fichiers importés avec succès`);
                      }
                    }
                  }}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    importReady 
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:shadow-lg hover:shadow-violet-500/25' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {!importReady ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Vérification...
                    </>
                  ) : (
                    <>
                      {fileQueue.length > 1 && currentFileIndex < fileQueue.length - 1 ? (
                        <>
                          Confirmer
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Importer
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
              
              {/* Ignorer - très discret, séparé */}
              {fileQueue.length > 1 && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                  <button
                    onClick={async () => {
                      if (currentFileIndex < fileQueue.length - 1) {
                        const nextIndex = currentFileIndex + 1;
                        setCurrentFileIndex(nextIndex);
                        setPendingPeriodSelection(null);
                        setTimeout(async () => {
                          await parseFile(fileQueue[nextIndex]);
                        }, 300);
                      } else {
                        setPendingPeriodSelection(null);
                        setFileQueue([]);
                        setCurrentFileIndex(0);
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Ignorer ce fichier →
                  </button>
                </div>
              )}
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
                
                {/* Bulk assign bar */}
                {selectedEmployees.size > 0 && (
                  <div className="mb-3 p-3 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-violet-700">
                        {selectedEmployees.size} employé{selectedEmployees.size > 1 ? 's' : ''} sélectionné{selectedEmployees.size > 1 ? 's' : ''}
                      </span>
                    </div>
                    <select
                      value={bulkAssignDept}
                      onChange={e => setBulkAssignDept(e.target.value)}
                      className="px-3 py-2 border border-violet-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Assigner à...</option>
                      {[...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))].sort().map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!bulkAssignDept) return;
                        
                        const newMapping = { ...departmentMapping };
                        const newEmps = employees.map(e => {
                          if (selectedEmployees.has(e.name)) {
                            newMapping[e.name] = bulkAssignDept;
                            return { ...e, department: bulkAssignDept };
                          }
                          return e;
                        });
                        
                        setDepartmentMapping(newMapping);
                        setEmployees(newEmps);
                        
                        const newCompanies = {
                          ...companies,
                          [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping }
                        };
                        setCompanies(newCompanies);
                        saveAll(newCompanies, activeCompany);
                        
                        setSelectedEmployees(new Set());
                        setBulkAssignDept('');
                      }}
                      disabled={!bulkAssignDept}
                      className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors"
                    >
                      Appliquer
                    </button>
                    <button
                      onClick={() => { setSelectedEmployees(new Set()); setBulkAssignDept(''); }}
                      className="p-2 text-violet-500 hover:bg-violet-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
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
              
              {/* Employee list - Optimisé avec limite d'affichage */}
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto" style={{ willChange: 'scroll-position' }}>
                {(() => {
                  const allDepts = [...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))].sort();
                  
                  const uniqueEmps = [...new Map(employees.map(e => [e.name, e])).values()]
                    .map(e => ({
                      ...e,
                      currentDept: e.department || departmentMapping[e.name] || null
                    }))
                    .filter(e => {
                      if (debouncedDeptSearch && !e.name.toLowerCase().includes(debouncedDeptSearch.toLowerCase())) return false;
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
                  
                  // Check if all visible are selected
                  const allVisibleSelected = uniqueEmps.length > 0 && uniqueEmps.every(e => selectedEmployees.has(e.name));
                  const someSelected = uniqueEmps.some(e => selectedEmployees.has(e.name));
                  
                  return (
                    <>
                      {/* Select all header */}
                      <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 sticky top-0">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          ref={el => { if (el) el.indeterminate = someSelected && !allVisibleSelected; }}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedEmployees(new Set([...selectedEmployees, ...uniqueEmps.map(emp => emp.name)]));
                            } else {
                              const newSet = new Set(selectedEmployees);
                              uniqueEmps.forEach(emp => newSet.delete(emp.name));
                              setSelectedEmployees(newSet);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-500">
                          {selectedEmployees.size > 0 
                            ? `${selectedEmployees.size} sélectionné${selectedEmployees.size > 1 ? 's' : ''}` 
                            : 'Tout sélectionner'}
                        </span>
                      </div>
                      
                      {uniqueEmps.map((emp, idx) => (
                        <div 
                          key={emp.name} 
                          className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${selectedEmployees.has(emp.name) ? 'bg-violet-50' : ''}`}
                          style={{ contain: 'layout style paint' }}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedEmployees.has(emp.name)}
                            onChange={e => {
                              const newSet = new Set(selectedEmployees);
                              if (e.target.checked) {
                                newSet.add(emp.name);
                              } else {
                                newSet.delete(emp.name);
                              }
                              setSelectedEmployees(newSet);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          
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
                  ))}
                  </>
                  );
                })()}
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={() => { setShowDeptManager(false); setDeptSearchTerm(''); setDeptFilter('all'); setSelectedEmployees(new Set()); setBulkAssignDept(''); }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                >
                  Terminé
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <main className="lg:ml-64 pt-4 lg:pt-6 flex-1 p-4 lg:p-6">
        {/* Loading overlay quand on recharge les données */}
        {isLoadingData && employees.length > 0 && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-slate-900/90 rounded-2xl p-8 shadow-2xl border border-slate-800">
              <LoadingSpinner size="md" text="Synchronisation..." />
            </div>
          </div>
        )}
        
        {/* Skeleton de chargement seulement si pas de données */}
        {isLoadingData && employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" text="Chargement des données" subtext="Veuillez patienter..." />
          </div>
        ) : (
        <>
        {/* Company Header Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 mb-6 relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Company Logo */}
            <div className="relative group flex-shrink-0">
              {companies[activeCompany]?.logo ? (
                <img src={companies[activeCompany].logo} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-white/10" />
              ) : (
                <div 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold ring-4 ring-white/10"
                  style={{ background: `linear-gradient(135deg, rgb(${getBrandColor()}), rgb(${getBrandColor().split(',').map((c, i) => Math.max(0, parseInt(c) - 40)).join(',')}))` }}
                >
                  {activeCompany?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => setShowLogoMenu(!showLogoMenu)}
                className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
            
            {/* Company Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{activeCompany}</h1>
                <button
                  onClick={() => setShowCompanySettings(true)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  title="Paramètres société"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                {companies[activeCompany]?.website && (
                  <>
                    <a 
                      href={companies[activeCompany].website.startsWith('http') ? companies[activeCompany].website : `https://${companies[activeCompany].website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="truncate max-w-[150px]">{companies[activeCompany].website.replace(/^https?:\/\//, '')}</span>
                    </a>
                    <span className="text-white/30">•</span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {periods.length} période{periods.length > 1 ? 's' : ''}
                </span>
                {isSyncing && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="flex items-center gap-1.5 text-violet-400">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sync...
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Export Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl transition-colors text-sm font-medium text-white border border-white/10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Exporter</span>
                </button>
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-1.5">
                    <button
                      onClick={exportToExcel}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 text-sm">Excel</p>
                        <p className="text-slate-400 text-xs">Données complètes</p>
                      </div>
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 text-sm">PDF</p>
                        <p className="text-slate-400 text-xs">Rapport imprimable</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-xl transition-all text-sm font-medium text-white shadow-lg shadow-violet-500/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Partager</span>
              </button>
              
              {/* Settings Menu */}
              <div className="relative group">
                <button className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl transition-colors text-white border border-white/10">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-1.5">
                    <button
                      onClick={() => setShowActivityLog(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-slate-700">Historique</span>
                    </button>
                    {periods.length > 1 && (
                      <button
                        onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-slate-700">Sélection périodes</span>
                      </button>
                    )}
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => setShowOnboarding(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-slate-700">Aide / Tutorial</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-500">Coût Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">€{totalCost.toLocaleString('fr-BE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-500">Employés</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{uniqueNames}</p>
            <p className="text-xs text-slate-400 mt-1">Actifs sur la période</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-500">Départements</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{[...new Set(filtered.map(e => e.department).filter(Boolean))].length}</p>
            <p className="text-xs text-slate-400 mt-1">{[...new Set(filtered.map(e => e.department).filter(Boolean))][0] || 'Aucun'} en tête</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-500">Coût Moyen</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">€{uniqueNames > 0 ? (totalCost / uniqueNames).toLocaleString('fr-BE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0,00'}</p>
            <p className="text-xs text-slate-400 mt-1">Par employé</p>
          </div>
        </div>
        
        {/* Period Filter Bar - Unified */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-white rounded-xl p-2 border border-slate-200 shadow-sm">
          {/* Quick filters */}
          <div className="flex items-center gap-1 pr-3 border-r border-slate-200">
            <button
              onClick={() => { setSelectedPeriods([]); setPeriodFilter('all'); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedPeriods.length === 0 && periodFilter === 'all'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => { setPeriodFilter('3m'); setSelectedPeriods([]); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                periodFilter === '3m' && selectedPeriods.length === 0
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              3 mois
            </button>
            <button
              onClick={() => { setPeriodFilter('6m'); setSelectedPeriods([]); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                periodFilter === '6m' && selectedPeriods.length === 0
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              6 mois
            </button>
            <button
              onClick={() => { setPeriodFilter('12m'); setSelectedPeriods([]); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                periodFilter === '12m' && selectedPeriods.length === 0
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              12 mois
            </button>
            <button
              onClick={() => { setPeriodFilter('ytd'); setSelectedPeriods([]); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                periodFilter === 'ytd' && selectedPeriods.length === 0
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {new Date().getFullYear()}
            </button>
          </div>
          
          {/* Custom period selector */}
          {periods.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedPeriods.length > 0
                    ? 'bg-violet-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {selectedPeriods.length > 0 ? (
                  <span>{selectedPeriods.length} période{selectedPeriods.length > 1 ? 's' : ''}</span>
                ) : (
                  <span>Personnalisé</span>
                )}
                <svg className={`w-3 h-3 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Selected periods pills */}
          {selectedPeriods.length > 0 && selectedPeriods.length <= 4 && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              {selectedPeriods.sort().map(p => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 rounded-md text-xs font-medium"
                >
                  {formatPeriod(p)}
                  <button
                    onClick={() => setSelectedPeriods(selectedPeriods.filter(sp => sp !== p))}
                    className="hover:text-violet-900"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                onClick={() => setSelectedPeriods([])}
                className="text-xs text-slate-400 hover:text-slate-600 ml-1"
              >
                Effacer
              </button>
            </div>
          )}
        </div>

        {/* Period Multi-Select Dropdown */}
        {showPeriodDropdown && periods.length > 1 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPeriodDropdown(false)} />
            <div className="fixed right-6 top-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-72 max-h-96 overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50 sticky top-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Sélectionner des périodes</span>
                  <button
                    onClick={() => setShowPeriodDropdown(false)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedPeriods([])}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mt-2 transition-colors ${
                    selectedPeriods.length === 0 ? 'bg-violet-100 text-violet-700 font-medium' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  ✓ Toutes les périodes
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-64 p-2">
              {(() => {
                const grouped = periods.reduce((acc, p) => {
                  const year = p.substring(0, 4);
                  if (!acc[year]) acc[year] = [];
                  acc[year].push(p);
                  return acc;
                }, {});
                
                return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yearPeriods]) => (
                  <div key={year} className="mb-2">
                    <div className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded-lg mb-1">
                      <span className="text-xs font-bold text-slate-500">{year}</span>
                      <button
                        onClick={() => {
                          const allYearSelected = yearPeriods.every(p => selectedPeriods.includes(p));
                          if (allYearSelected) {
                            setSelectedPeriods(selectedPeriods.filter(p => !yearPeriods.includes(p)));
                          } else {
                            setSelectedPeriods([...new Set([...selectedPeriods, ...yearPeriods])]);
                          }
                        }}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                      >
                        {yearPeriods.every(p => selectedPeriods.includes(p)) ? 'Désélectionner' : 'Tout sélectionner'}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                    {yearPeriods.sort().reverse().map(p => {
                      const isSelected = selectedPeriods.includes(p);
                      const monthName = formatPeriod(p).split(' ')[0].substring(0, 3);
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPeriods(selectedPeriods.filter(sp => sp !== p));
                            } else {
                              setSelectedPeriods([...selectedPeriods, p]);
                            }
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-violet-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {monthName}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                ));
              })()}
              </div>
              
              {selectedPeriods.length > 0 && (
                <div className="p-3 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={() => setShowPeriodDropdown(false)}
                    className="w-full py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors"
                  >
                    Appliquer ({selectedPeriods.length} période{selectedPeriods.length > 1 ? 's' : ''})
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Data Manager Modal */}
        {showDataManager && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full relative">
              
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
                    multiple
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

        {/* Cartes de Comparaison Détaillées */}
        {visibleKpis.comparison && comparisonData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Comparaison vs Mois Précédent */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">vs Mois Précédent</h3>
                  <p className="text-slate-400 text-xs">{comparisonData.prevMonth ? formatPeriod(comparisonData.prevMonth.period) : 'N/A'}</p>
                </div>
              </div>
              
              {comparisonData.prevMonth ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Mois actuel</span>
                    <span className="font-bold">€{comparisonData.current?.total?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Mois précédent</span>
                    <span className="font-bold">€{comparisonData.prevMonth?.total?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Différence</span>
                      <span className={`font-bold text-lg ${(comparisonData.diffVsPrevMonth || 0) >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {(comparisonData.diffVsPrevMonth || 0) >= 0 ? '+' : ''}€{(comparisonData.diffVsPrevMonth || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {comparisonData.variationVsPrevMonth !== null && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-slate-400 text-sm">Variation</span>
                        <span className={`font-semibold ${comparisonData.variationVsPrevMonth >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {comparisonData.variationVsPrevMonth >= 0 ? '↑' : '↓'} {Math.abs(comparisonData.variationVsPrevMonth).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Pas de données du mois précédent</p>
              )}
            </div>

            {/* Comparaison vs Même Mois Année Précédente */}
            <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">vs Année Précédente</h3>
                  <p className="text-violet-200 text-xs">{comparisonData.sameMonthLastYear ? formatPeriod(comparisonData.sameMonthLastYear.period) : 'N/A'}</p>
                </div>
              </div>
              
              {comparisonData.sameMonthLastYear ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-violet-200">Cette année</span>
                    <span className="font-bold">€{comparisonData.current?.total?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-violet-200">Année précédente</span>
                    <span className="font-bold">€{comparisonData.sameMonthLastYear?.total?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}</span>
                  </div>
                  <div className="border-t border-violet-500/50 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-violet-200">Différence</span>
                      <span className={`font-bold text-lg ${(comparisonData.diffVsLastYear || 0) >= 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                        {(comparisonData.diffVsLastYear || 0) >= 0 ? '+' : ''}€{(comparisonData.diffVsLastYear || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {comparisonData.variationVsLastYear !== null && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-violet-300 text-sm">Variation annuelle</span>
                        <span className={`font-semibold ${comparisonData.variationVsLastYear >= 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                          {comparisonData.variationVsLastYear >= 0 ? '↑' : '↓'} {Math.abs(comparisonData.variationVsLastYear).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-violet-200 text-sm">Pas de données de l'année précédente pour ce mois</p>
              )}
            </div>
          </div>
        )}

        {/* Evolution Chart */}
        {chartData.length >= 1 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">📊 Évolution des coûts salariaux</h2>
              <div className="flex items-center gap-3">
                {/* Toggle comparaison année */}
                {years.length > 1 && (
                  <button
                    onClick={() => setShowYearComparison(!showYearComparison)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      showYearComparison 
                        ? 'bg-violet-100 text-violet-700 border border-violet-200' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    📈 Comparaison Annuelle
                  </button>
                )}
                {years.length > 1 && !showYearComparison && (
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
            </div>
            
            {/* Graphique Comparatif Année sur Année */}
            {showYearComparison && years.length > 1 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearComparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => value ? `€${(value / 1000).toFixed(0)}k` : ''}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value ? `€${value.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}` : 'N/A', name]}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    {years.map((year, idx) => (
                      <Line 
                        key={year}
                        type="monotone"
                        dataKey={year}
                        name={year}
                        stroke={idx === years.length - 1 ? '#8B5CF6' : idx === years.length - 2 ? '#06B6D4' : '#94A3B8'}
                        strokeWidth={idx === years.length - 1 ? 3 : 2}
                        dot={{ r: idx === years.length - 1 ? 4 : 3 }}
                        strokeDasharray={idx < years.length - 1 ? '5 5' : '0'}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                {/* Légende custom uniquement */}
                <div className="flex justify-center gap-6 mt-3">
                  {years.slice(-2).reverse().map((year, idx) => (
                    <div key={year} className="flex items-center gap-2">
                      <div className={`w-8 h-0.5 rounded ${idx === 0 ? 'bg-violet-500' : 'bg-cyan-500'}`} 
                           style={idx === 1 ? { backgroundImage: 'repeating-linear-gradient(90deg, #06B6D4 0, #06B6D4 4px, transparent 4px, transparent 8px)' } : {}} />
                      <span className="text-sm font-medium text-slate-600">{year}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Graphique Standard */
              <div className="h-96">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
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
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="font-medium text-slate-500">Aucune donnée disponible</p>
                    <p className="text-sm mt-1">pour la période sélectionnée</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Departments - Version Simple sans scroll */}
        {visibleKpis.deptBreakdown && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">📊 Répartition par Département</h2>
            <span className="text-xs text-slate-400">{sortedDepts.length} départements</span>
          </div>
          
          <div className="space-y-2">
            {sortedDepts.map(([dept, data]) => {
              const comparison = deptStatsWithComparison[dept] || {};
              const pct = ((data.total / totalCost) * 100).toFixed(1);
              const barWidth = Math.max(5, (data.total / maxCost) * 100);
              
              return (
                <div key={dept} className="flex items-center gap-3 py-2">
                  {/* Nom du département */}
                  <div className="w-32 sm:w-40 flex-shrink-0">
                    <span className="font-medium text-slate-700 text-sm truncate block">{dept}</span>
                    <span className="text-xs text-slate-400">{data.count} emp.</span>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${barWidth}%`,
                        background: `rgb(${getBrandColor()})`
                      }} 
                    />
                  </div>
                  
                  {/* Pourcentage */}
                  <span className="w-12 text-right text-xs font-medium text-slate-500">{pct}%</span>
                  
                  {/* Variation */}
                  {comparison.variationVsPrevMonth !== null && comparison.variationVsPrevMonth !== 0 ? (
                    <span className={`w-14 text-right text-xs font-semibold ${
                      comparison.variationVsPrevMonth >= 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {comparison.variationVsPrevMonth >= 0 ? '↑' : '↓'}{Math.abs(comparison.variationVsPrevMonth).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="w-14"></span>
                  )}
                  
                  {/* Montant */}
                  <span className="w-24 text-right font-bold text-slate-800 text-sm">
                    €{data.total.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Résumé des tendances */}
          {Object.keys(deptStatsWithComparison).length > 0 && (() => {
            const sorted = Object.entries(deptStatsWithComparison)
              .filter(([_dept, d]) => d.variationVsPrevMonth !== null && d.variationVsPrevMonth !== 0)
              .sort((a, b) => (b[1].variationVsPrevMonth || 0) - (a[1].variationVsPrevMonth || 0));
            const highest = sorted[0];
            const lowest = sorted[sorted.length - 1];
            const hasData = (highest && highest[1].variationVsPrevMonth > 0) || (lowest && lowest[1].variationVsPrevMonth < 0);
            
            return hasData ? (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                {highest && highest[1].variationVsPrevMonth > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                    <span className="text-lg">📈</span>
                    <div>
                      <p className="text-xs text-red-600 font-medium">Plus forte hausse</p>
                      <p className="font-bold text-red-700 text-sm">{highest[0]} +{highest[1].variationVsPrevMonth.toFixed(0)}%</p>
                    </div>
                  </div>
                )}
                {lowest && lowest[1].variationVsPrevMonth < 0 && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <span className="text-lg">📉</span>
                    <div>
                      <p className="text-xs text-emerald-600 font-medium">Plus forte baisse</p>
                      <p className="font-bold text-emerald-700 text-sm">{lowest[0]} {lowest[1].variationVsPrevMonth.toFixed(0)}%</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null;
          })()}
        </div>
        )}

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
                if (debouncedEmpSearch && !e.name.toLowerCase().includes(debouncedEmpSearch.toLowerCase())) return false;
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
                    {debouncedEmpSearch || (empDeptFilter && empDeptFilter !== 'all') ? ' trouvé' + (filtered.length > 1 ? 's' : '') : ''}
                  </p>
                  
                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {paginatedEmps.map((e, i) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedEmployee(e.name)}
                        className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100 hover:border-slate-200 cursor-pointer"
                      >
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
                          
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
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
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold">📊 Comparer deux périodes</h2>
                <button onClick={() => { setShowCompareModal(false); setComparePeriod(null); setComparePeriod1(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
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
                      value={comparePeriod1 || (periods.length > 1 ? periods[periods.length - 2] : '')}
                      onChange={(e) => setComparePeriod1(e.target.value)}
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
                  const period1 = comparePeriod1 || (periods.length > 1 ? periods[periods.length - 2] : null);
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
                <button onClick={() => { setShowCompareModal(false); setComparePeriod(null); setComparePeriod1(null); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Employee Evolution Modal */}
        {selectedEmployee && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedEmployee(null); }}
          >
            <div className="min-h-full flex items-start justify-center p-4 pt-8 pb-8">
              <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-xl font-bold">
                        {selectedEmployee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">{selectedEmployee}</h2>
                        <p className="text-violet-200 text-sm mt-0.5">
                          {employees.find(e => e.name === selectedEmployee)?.department || 
                           departmentMapping[selectedEmployee] || 'Non assigné'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedEmployee(null)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Evolution Chart */}
                <div className="p-6">
                  {(() => {
                    const empData = employees
                      .filter(e => e.name === selectedEmployee)
                      .sort((a, b) => a.period.localeCompare(b.period));
                    
                    const chartData = empData.map(e => ({
                      period: formatPeriod(e.period),
                      cost: e.totalCost
                    }));
                    
                    const totalCost = empData.reduce((s, e) => s + e.totalCost, 0);
                    const avgCost = empData.length > 0 ? totalCost / empData.length : 0;
                    const minCost = empData.length > 0 ? Math.min(...empData.map(e => e.totalCost)) : 0;
                    const maxCost = empData.length > 0 ? Math.max(...empData.map(e => e.totalCost)) : 0;
                    
                    // Variation
                    let variation = null;
                    if (empData.length >= 2) {
                      const first = empData[0].totalCost;
                      const last = empData[empData.length - 1].totalCost;
                      variation = ((last - first) / first) * 100;
                    }
                    
                    return (
                      <>
                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                          <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-slate-800">€{totalCost.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs text-slate-500">Total</div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-slate-800">€{avgCost.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs text-slate-500">Moyenne</div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-slate-800">{empData.length}</div>
                            <div className="text-xs text-slate-500">Périodes</div>
                          </div>
                          {variation !== null && (
                            <div className={`rounded-xl p-3 text-center ${variation >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                              <div className={`text-xl font-bold ${variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                              </div>
                              <div className="text-xs text-slate-500">Évolution</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Chart */}
                        {chartData.length > 1 ? (
                          <div className="h-64 mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis 
                                  dataKey="period" 
                                  tick={{ fontSize: 11, fill: '#64748B' }}
                                  axisLine={{ stroke: '#E2E8F0' }}
                                />
                                <YAxis 
                                  tick={{ fontSize: 11, fill: '#64748B' }}
                                  axisLine={{ stroke: '#E2E8F0' }}
                                  tickFormatter={v => `€${(v/1000).toFixed(0)}k`}
                                />
                                <Tooltip 
                                  formatter={(value) => [`€${value.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}`, 'Coût']}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="cost" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                                <ReferenceLine y={avgCost} stroke="#A78BFA" strokeDasharray="5 5" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-xl p-8 text-center mb-6">
                            <p className="text-slate-500">Une seule période disponible</p>
                          </div>
                        )}
                        
                        {/* Detail by period */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <h4 className="font-semibold text-slate-700 text-sm">Détail par période</h4>
                          </div>
                          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                            {empData.map((e, i) => {
                              const prevCost = i > 0 ? empData[i - 1].totalCost : null;
                              const diff = prevCost ? ((e.totalCost - prevCost) / prevCost) * 100 : null;
                              
                              return (
                                <div key={e.period} className="flex items-center justify-between px-4 py-3">
                                  <span className="text-sm text-slate-600">{formatPeriod(e.period)}</span>
                                  <div className="flex items-center gap-3">
                                    {diff !== null && (
                                      <span className={`text-xs font-medium ${diff >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                      </span>
                                    )}
                                    <span className="font-semibold text-slate-800">
                                      €{e.totalCost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <button 
                    onClick={() => setSelectedEmployee(null)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Share Modal */}
        {showShareModal && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Partager le rapport</h2>
                      <p className="text-violet-200 text-sm">{activeCompany}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-slate-600 text-sm mb-4">
                  Envoyez un résumé du rapport à votre CEO ou collaborateur. Il recevra un email avec les statistiques clés.
                </p>
                
                {/* Stats preview */}
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-slate-800">€{totalCost.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</div>
                      <div className="text-xs text-slate-500">Coût total</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-violet-600">{uniqueNames}</div>
                      <div className="text-xs text-slate-500">Employés</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-fuchsia-600">{periods.length}</div>
                      <div className="text-xs text-slate-500">Périodes</div>
                    </div>
                  </div>
                </div>
                
                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Email du destinataire *
                    </label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="ceo@entreprise.com"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-violet-500 outline-none transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Message (optionnel)
                    </label>
                    <textarea
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                      placeholder="Voici le rapport salarial du mois..."
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-violet-500 outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleShare}
                  disabled={!shareEmail || shareSending}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {shareSending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Envoyer par email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Panneau Alertes */}
        {showAlertsPanel && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAlertsPanel(false); }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Alertes & Notifications</h2>
                      <p className="text-amber-100 text-sm">{generatedAlerts.length} alerte{generatedAlerts.length > 1 ? 's' : ''} active{generatedAlerts.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAlertsPanel(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {generatedAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2">Tout est en ordre !</h3>
                    <p className="text-slate-500 text-sm">Aucune variation significative détectée sur vos coûts salariaux.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generatedAlerts.map((alert, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-xl border ${
                          alert.type === 'danger' ? 'bg-red-50 border-red-200' :
                          alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                          'bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            alert.type === 'danger' ? 'bg-red-100' :
                            alert.type === 'warning' ? 'bg-amber-100' :
                            'bg-emerald-100'
                          }`}>
                            {alert.type === 'danger' && (
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            {alert.type === 'warning' && (
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            )}
                            {alert.type === 'success' && (
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${
                              alert.type === 'danger' ? 'text-red-800' :
                              alert.type === 'warning' ? 'text-amber-800' :
                              'text-emerald-800'
                            }`}>
                              {alert.message}
                            </p>
                            {alert.diff && (
                              <p className={`text-sm mt-1 ${
                                alert.type === 'danger' ? 'text-red-600' :
                                alert.type === 'warning' ? 'text-amber-600' :
                                'text-emerald-600'
                              }`}>
                                {alert.diff >= 0 ? '+' : ''}€{alert.diff.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Configuration seuil alertes */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500 mb-2">Les alertes se déclenchent à partir d'une variation de :</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={budgets[activeCompany]?.alertThreshold || 10}
                      onChange={(e) => setBudgets(prev => ({
                        ...prev,
                        [activeCompany]: {
                          ...prev[activeCompany],
                          alertThreshold: Math.max(1, parseInt(e.target.value) || 10)
                        }
                      }))}
                      className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center"
                      min="1"
                      max="100"
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Budget */}
        {showBudgetModal && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowBudgetModal(false); }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Budget Mensuel</h2>
                      <p className="text-blue-100 text-sm">{activeCompany}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowBudgetModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600 text-sm mb-6">
                  Définissez un budget mensuel pour suivre vos coûts salariaux et recevoir des alertes en cas de dépassement.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Budget mensuel (€)
                    </label>
                    <input
                      type="number"
                      value={budgets[activeCompany]?.monthly || ''}
                      onChange={(e) => setBudgets(prev => ({
                        ...prev,
                        [activeCompany]: {
                          ...prev[activeCompany],
                          monthly: parseFloat(e.target.value) || 0
                        }
                      }))}
                      placeholder="Ex: 50000"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Seuil d'alerte (%)
                    </label>
                    <input
                      type="number"
                      value={budgets[activeCompany]?.alertThreshold || 10}
                      onChange={(e) => setBudgets(prev => ({
                        ...prev,
                        [activeCompany]: {
                          ...prev[activeCompany],
                          alertThreshold: Math.max(1, parseInt(e.target.value) || 10)
                        }
                      }))}
                      placeholder="10"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                      min="1"
                      max="100"
                    />
                    <p className="text-xs text-slate-400 mt-1">Alerte si variation département &gt; ce seuil</p>
                  </div>
                </div>
                
                {/* Prévisualisation */}
                {budgets[activeCompany]?.monthly > 0 && comparisonData?.current && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                    <h4 className="font-medium text-slate-700 mb-3">📊 Situation actuelle</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Budget défini</span>
                        <span className="font-medium">€{budgets[activeCompany].monthly.toLocaleString('fr-BE')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Coût actuel</span>
                        <span className="font-medium">€{comparisonData.current.total.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Écart</span>
                        <span className={`font-bold ${comparisonData.current.total > budgets[activeCompany].monthly ? 'text-red-500' : 'text-emerald-500'}`}>
                          {comparisonData.current.total > budgets[activeCompany].monthly ? '+' : ''}
                          €{(comparisonData.current.total - budgets[activeCompany].monthly).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Utilisation budget</span>
                          <span>{((comparisonData.current.total / budgets[activeCompany].monthly) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              comparisonData.current.total > budgets[activeCompany].monthly ? 'bg-red-500' :
                              comparisonData.current.total > budgets[activeCompany].monthly * 0.9 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (comparisonData.current.total / budgets[activeCompany].monthly) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setShowBudgetModal(false);
                    toast.success('Budget enregistré');
                  }}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal KPI Settings */}
        {showKpiSettings && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowKpiSettings(false); }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Personnaliser le Dashboard</h2>
                      <p className="text-slate-300 text-sm">Choisissez les KPIs à afficher</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowKpiSettings(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { key: 'totalCost', label: 'Coût Total', desc: 'Afficher le coût total avec variation' },
                    { key: 'employees', label: 'Nombre d\'employés', desc: 'Compteur d\'employés actifs' },
                    { key: 'departments', label: 'Départements', desc: 'Nombre de départements' },
                    { key: 'avgCost', label: 'Coût Moyen', desc: 'Coût moyen par employé' },
                    { key: 'comparison', label: 'Cartes Comparaison', desc: 'Comparaisons vs M-1 et N-1' },
                    { key: 'deptBreakdown', label: 'Répartition Départements', desc: 'Graphique par département' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-medium text-slate-700">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={visibleKpis[item.key]}
                        onChange={(e) => setVisibleKpis(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </label>
                  ))}
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setVisibleKpis({
                      totalCost: true, employees: true, departments: true,
                      avgCost: true, comparison: true, deptBreakdown: true
                    })}
                    className="flex-1 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    Tout afficher
                  </button>
                  <button
                    onClick={() => setShowKpiSettings(false)}
                    className="flex-1 py-2 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Historique des Modifications */}
        {showActivityLog && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowActivityLog(false); }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Historique des Modifications</h2>
                      <p className="text-emerald-100 text-sm">{activityLog.length} entrée{activityLog.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowActivityLog(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {activityLog.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2">Aucune activité</h3>
                    <p className="text-slate-500 text-sm">L'historique des modifications apparaîtra ici</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activityLog.map(log => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              log.action.includes('Import') ? 'bg-blue-100 text-blue-600' :
                              log.action.includes('Suppression') ? 'bg-red-100 text-red-600' :
                              log.action.includes('Modification') ? 'bg-amber-100 text-amber-600' :
                              'bg-emerald-100 text-emerald-600'
                            }`}>
                              {log.action.includes('Import') && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              )}
                              {log.action.includes('Suppression') && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                              {log.action.includes('Modification') && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              )}
                              {!log.action.includes('Import') && !log.action.includes('Suppression') && !log.action.includes('Modification') && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-700">{log.action}</p>
                              <p className="text-xs text-slate-500">{log.details}</p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(log.timestamp).toLocaleString('fr-BE', { 
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        {log.company && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-xs">
                            <span className="text-slate-400">Société: {log.company}</span>
                            <span className="text-slate-400">Par: {log.user}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {activityLog.length > 0 && (
                  <button
                    onClick={() => {
                      setActivityLog([]);
                      toast.success('Historique effacé');
                    }}
                    className="w-full mt-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    Effacer l'historique
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Onboarding / Tutorial */}
        {showOnboarding && (
          <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowOnboarding(false); setOnboardingStep(0); }}}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-slate-100">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                  style={{ width: `${((onboardingStep + 1) / 5) * 100}%` }}
                />
              </div>
              
              {/* Content */}
              <div className="p-6 sm:p-8">
                {onboardingStep === 0 && (
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <span className="text-3xl sm:text-4xl">👋</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">Bienvenue sur Salarize !</h2>
                    <p className="text-slate-500 mb-4 sm:mb-6 text-sm sm:text-base">
                      Votre outil d'analyse des coûts salariaux. Découvrons ensemble les fonctionnalités principales.
                    </p>
                  </div>
                )}
                
                {onboardingStep === 1 && (
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">1. Importez vos données</h2>
                    <p className="text-slate-500 mb-6">
                      Cliquez sur <strong>+ Actions</strong> en bas à gauche puis <strong>Importer des données</strong>. 
                      Salarize accepte les fichiers Excel (.xlsx) exportés de votre secrétariat social (Acerta, SD Worx, Securex...) ou d'autres systèmes de paie.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-4 text-left">
                      <p className="text-sm text-slate-600">
                        💡 <strong>Astuce :</strong> Vous pouvez importer plusieurs périodes pour voir l'évolution dans le temps.
                      </p>
                    </div>
                  </div>
                )}
                
                {onboardingStep === 2 && (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">2. Organisez par département</h2>
                    <p className="text-slate-500 mb-6">
                      Assignez vos employés à des départements pour une analyse plus fine. 
                      Cliquez sur <strong>Gérer les départements</strong> dans le menu Actions.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-4 text-left">
                      <p className="text-sm text-slate-600">
                        💡 <strong>Astuce :</strong> Sélectionnez plusieurs employés et assignez-les en masse !
                      </p>
                    </div>
                  </div>
                )}
                
                {onboardingStep === 3 && (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">3. Analysez vos données</h2>
                    <p className="text-slate-500 mb-6">
                      Le dashboard affiche vos KPIs en temps réel : coût total, évolution, comparaisons avec le mois précédent 
                      et l'année précédente.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-4 text-left">
                      <p className="text-sm text-slate-600">
                        💡 <strong>Astuce :</strong> Cliquez sur un département pour voir le détail des employés.
                      </p>
                    </div>
                  </div>
                )}
                
                {onboardingStep === 4 && (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-fuchsia-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">4. Partagez vos rapports</h2>
                    <p className="text-slate-500 mb-6">
                      Exportez en Excel ou PDF, ou partagez directement par email avec vos collaborateurs. 
                      Vos données sont synchronisées dans le cloud.
                    </p>
                    <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl p-4 text-white text-left">
                      <p className="text-sm">
                        🎉 <strong>C'est parti !</strong> Vous êtes prêt à analyser vos coûts salariaux comme un pro.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-8 pb-8 flex items-center justify-between">
                <button
                  onClick={() => { setShowOnboarding(false); setOnboardingStep(0); }}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  Passer
                </button>
                
                <div className="flex items-center gap-2">
                  {/* Dots */}
                  <div className="flex gap-1 mr-4">
                    {[0, 1, 2, 3, 4].map(i => (
                      <button
                        key={i}
                        onClick={() => setOnboardingStep(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === onboardingStep ? 'bg-violet-500' : 'bg-slate-200 hover:bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {onboardingStep > 0 && (
                    <button
                      onClick={() => setOnboardingStep(s => s - 1)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Précédent
                    </button>
                  )}
                  
                  {onboardingStep < 4 ? (
                    <button
                      onClick={() => setOnboardingStep(s => s + 1)}
                      className="px-6 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Suivant
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowOnboarding(false); setOnboardingStep(0); localStorage.setItem('salarize_onboarding_done', 'true'); }}
                      className="px-6 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Commencer 🚀
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
    </PageTransition>
  );
}

// Export avec Error Boundary et Toast Provider
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}
