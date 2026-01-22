/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                           SALARIZE - App.jsx                                   ║
 * ║                 Application principale de gestion salariale                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  [AI-DOC] GUIDE POUR L'ASSISTANT IA                                           ║
 * ║  ─────────────────────────────────────────────────────────────────────────────║
 * ║                                                                               ║
 * ║  Ce fichier contient la logique principale de l'application Salarize.        ║
 * ║  Cherche les tags suivants pour comprendre rapidement le code:               ║
 * ║                                                                               ║
 * ║  🔍 TAGS DE DOCUMENTATION:                                                    ║
 * ║  - [AI-DOC]              → Explication du fonctionnement                      ║
 * ║  - [DB-DEPENDENCY]       → Tables/colonnes Supabase requises                  ║
 * ║  - [DB-MIGRATION-REQUIRED] → Commandes SQL à exécuter si erreur               ║
 * ║                                                                               ║
 * ║  📦 SCHÉMA SUPABASE REQUIS:                                                   ║
 * ║  ─────────────────────────────────────────────────────────────────────────────║
 * ║  companies: id, user_id, name, logo, brand_color, website                    ║
 * ║  employees: id, company_id, name, department, function, period, total_cost   ║
 * ║  department_mappings: id, company_id, employee_name, department              ║
 * ║  invitations: id, company_id, email, role, status, display_name*, invited_by ║
 * ║                                                                               ║
 * ║  * display_name est OPTIONNEL - doit être ajouté manuellement:               ║
 * ║    ALTER TABLE invitations ADD COLUMN display_name TEXT;                      ║
 * ║                                                                               ║
 * ║  🔥 FONCTIONS CLÉS:                                                           ║
 * ║  - saveToSupabase()      → Sauvegarde toutes les données (ligne ~1120)       ║
 * ║  - importToCompanyDirect() → Import de fichiers Excel (ligne ~2520)          ║
 * ║  - quickImportFromPending() → Import rapide sans confirmation (ligne ~2213)  ║
 * ║  - parseFile()           → Parse les fichiers Acerta/Securex (ligne ~2097)   ║
 * ║  - loadCompanyInvitations() → Charge les invités (ligne ~290)                ║
 * ║  - applyPendingChanges() → Sauve les modifs d'invitations (ligne ~339)       ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';

// ============================================
// IMPORTS FROM MODULAR STRUCTURE
// ============================================

// Config
import { supabase, getValidSession } from './config/supabase';
import { emailjs, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './config/emailjs';

// Constants
import { DEMO_COMPANY, DEMO_EMPLOYEES, DEMO_MAPPING } from './constants/demo';
import { PRICING_PLANS } from './constants/pricing';
import { DEFAULT_DEPARTMENTS, ONBOARDING_MESSAGES } from './constants/defaults';
import { DESIGN, CHART_COLORS } from './constants/design';

// Utils
import { formatCurrency, formatPercent, formatNumber } from './utils';

// Hooks
import { useDebounce, useDebouncedCallback } from './hooks';

// Context
import { ToastProvider, useToast } from './context/ToastContext';

// Components - UI
import { Button, Modal, EmptyState, LoadingSpinner, Skeleton, CardSkeleton, ChartSkeleton, DeptListSkeleton, TableSkeleton, DashboardSkeleton } from './components/ui';
import CustomSelect from './components/ui/CustomSelect';

// Components - Layout
import { Footer, PageTransition, ErrorBoundary } from './components/layout';

// Components - Landing
import { LandingHeader } from './components/landing';

// Pages
import {
  LandingPage,
  FeaturesPage,
  PricingPage,
  LegalPage,
  PrivacyPage,
  TermsPage,
  CookiesPage,
  DemoPage,
  ProfilePage
} from './pages';

// Components - Dashboard
import {
  AuthModal,
  DashboardHeader,
  Sidebar,
  SelectCompanyModal,
  CompanySettingsModal
} from './components/dashboard';

// Components - Timesheet
import TimesheetPage from './components/timesheet/TimesheetPage';

// Styles
import './styles/animations.css';

// ============================================
// MAIN APP CONTENT
// ============================================

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
  const [selectedYear, setSelectedYear] = useState('2025');
  const [showDataManager, setShowDataManager] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'clear' | 'delete' | 'deletePeriod', period?: string }
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingPeriodSelection, setPendingPeriodSelection] = useState(null); // { data, detectedPeriods }
  const [showQuickImportModal, setShowQuickImportModal] = useState(false); // Modal d'import rapide avec liste des fichiers
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
  const [companyOrder, setCompanyOrder] = useState([]); // Ordre des sociétés dans la sidebar (drag & drop)
  const [showTimesheet, setShowTimesheet] = useState(false); // Afficher la page timesheet
  // Track si on est en mode reset password - initialisé IMMÉDIATEMENT au premier rendu
  const isRecoveryModeRef = useRef(
    typeof window !== 'undefined' && 
    window.location.hash && 
    window.location.hash.includes('type=recovery')
  );
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
  const [showCreateDept, setShowCreateDept] = useState(false); // Créer un département
  const [newDeptName, setNewDeptName] = useState(''); // Nom du nouveau département
  const [createdDepartments, setCreatedDepartments] = useState([]); // Départements créés manuellement
  const [deptPage, setDeptPage] = useState(0); // Pagination du gestionnaire de départements
  const [pendingDeptChange, setPendingDeptChange] = useState(null); // { empName, oldDept, newDept, empCost } pour confirmation
  const DEPT_PAGE_SIZE = 30; // Nombre d'employés par page
  const [showInviteModal, setShowInviteModal] = useState(false); // Inviter un CEO
  const [inviteEmail, setInviteEmail] = useState(''); // Email d'invitation
  const [inviteRole, setInviteRole] = useState('viewer'); // Rôle de l'invité
  const [pendingInvites, setPendingInvites] = useState([]); // Invitations en attente
  const [sendingInvite, setSendingInvite] = useState(false); // État d'envoi de l'invitation
  const [showManageAccessModal, setShowManageAccessModal] = useState(false); // Modal gestion des accès
  const [companyInvitations, setCompanyInvitations] = useState([]); // Invitations de la société
  const [loadingInvitations, setLoadingInvitations] = useState(false); // Chargement des invitations
  const [updatingRole, setUpdatingRole] = useState(null); // ID de l'invitation en cours de modification
  const [pendingRoleChanges, setPendingRoleChanges] = useState({}); // { invitationId: newRole } changements en attente
  const [editingInviteName, setEditingInviteName] = useState(null); // ID de l'invitation en cours d'édition du nom
  const [inviteDisplayNames, setInviteDisplayNames] = useState({}); // { invitationId: displayName } noms personnalisés
  
  // Détecter si on arrive d'un lien de reset password IMMÉDIATEMENT
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      return hashParams.get('type') === 'recovery';
    }
    return false;
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Fonction pour mettre à jour le mot de passe
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    
    setResetPasswordLoading(true);
    setResetPasswordError('');
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success('Mot de passe mis à jour avec succès !');
      
      // Réinitialiser l'état
      isRecoveryModeRef.current = false;
      setShowResetPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      
      // Déconnecter et rediriger vers la page de connexion
      await supabase.auth.signOut();
      setCurrentPage('home');
      
    } catch (err) {
      setResetPasswordError(err.message);
    }
    setResetPasswordLoading(false);
  };

  // Fonction pour envoyer une invitation par email
  const sendInvitation = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Veuillez entrer un email valide');
      return;
    }

    setSendingInvite(true);
    
    try {
      // Générer un token unique pour l'invitation
      const inviteToken = crypto.randomUUID();
      const inviteLink = `${window.location.origin}?invite=${inviteToken}`;
      
      // Envoyer l'email via EmailJS
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: inviteEmail,
          from_name: user?.name || user?.email || 'Un utilisateur',
          company_name: activeCompany,
          role: inviteRole === 'viewer' ? 'Lecteur (consultation uniquement)' : 'Éditeur (consultation et modification)',
          invite_link: inviteLink,
        }
      );

      // Ajouter à la liste des invitations en attente
      setPendingInvites([...pendingInvites, { 
        email: inviteEmail, 
        role: inviteRole, 
        company: activeCompany,
        token: inviteToken,
        createdAt: new Date().toISOString()
      }]);
      
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
      
    } catch (error) {
      console.error('Erreur envoi invitation:', error);
      toast.error('Erreur lors de l\'envoi de l\'invitation. Veuillez réessayer.');
    } finally {
      setSendingInvite(false);
    }
  };

  /**
   * [AI-DOC] Charge les invitations pour la société active
   *
   * [DB-DEPENDENCY] Table: invitations
   * - Lit: id, company_id, email, role, status, display_name, invited_by, created_at
   * - display_name peut être null si la colonne n'existe pas encore
   */
  const loadCompanyInvitations = async () => {
    if (!activeCompany || !companies[activeCompany]?.id) return;

    setLoadingInvitations(true);
    try {
      const companyId = companies[activeCompany].id;
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Salarize] Error loading company invitations:', error);
        toast.error('Erreur lors du chargement des invitations');
      } else {
        setCompanyInvitations(data || []);
      }
    } catch (e) {
      console.error('[Salarize] Error:', e);
    } finally {
      setLoadingInvitations(false);
    }
  };

  // Modifier le rôle d'un invité (staging pour confirmation)
  const stageRoleChange = (invitationId, newRole) => {
    setPendingRoleChanges(prev => ({
      ...prev,
      [invitationId]: newRole
    }));
  };

  // Annuler les changements en attente
  const cancelPendingChanges = () => {
    setPendingRoleChanges({});
    setInviteDisplayNames({});
    setEditingInviteName(null);
  };

  /**
   * [AI-DOC] Applique les modifications d'invitations (rôle + nom personnalisé)
   *
   * [DB-DEPENDENCY] Table: invitations
   * - Écrit: role, display_name
   *
   * [DB-MIGRATION-REQUIRED] Si display_name cause une erreur:
   * ALTER TABLE invitations ADD COLUMN display_name TEXT;
   */
  const applyPendingChanges = async () => {
    const changes = Object.entries(pendingRoleChanges);
    if (changes.length === 0 && Object.keys(inviteDisplayNames).length === 0) {
      toast.info('Aucune modification à appliquer');
      return;
    }

    setUpdatingRole('all');
    try {
      // Appliquer les changements de rôle
      for (const [invitationId, newRole] of changes) {
        const { error } = await supabase
          .from('invitations')
          .update({ role: newRole })
          .eq('id', invitationId);

        if (error) {
          console.error('[Salarize] Error updating invitation role:', error);
          toast.error('Erreur lors de la modification du rôle');
          return;
        }
      }

      // Appliquer les noms personnalisés
      for (const [invitationId, displayName] of Object.entries(inviteDisplayNames)) {
        const { error } = await supabase
          .from('invitations')
          .update({ display_name: displayName })
          .eq('id', invitationId);

        if (error) {
          console.error('[Salarize] Error updating display name:', error);
        }
      }

      // Mettre à jour localement
      setCompanyInvitations(prev =>
        prev.map(inv => {
          let updated = { ...inv };
          if (pendingRoleChanges[inv.id]) {
            updated.role = pendingRoleChanges[inv.id];
          }
          if (inviteDisplayNames[inv.id]) {
            updated.display_name = inviteDisplayNames[inv.id];
          }
          return updated;
        })
      );

      toast.success('Modifications enregistrées');
      setPendingRoleChanges({});
      setInviteDisplayNames({});
      setEditingInviteName(null);
    } catch (e) {
      console.error('[Salarize] Error:', e);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setUpdatingRole(null);
    }
  };

  // Vérifier s'il y a des changements en attente
  const hasPendingChanges = Object.keys(pendingRoleChanges).length > 0 || Object.keys(inviteDisplayNames).length > 0;

  // Révoquer l'accès d'un invité
  const revokeInvitation = async (invitationId, email) => {
    if (!confirm(`Voulez-vous vraiment révoquer l'accès de ${email} ?`)) return;

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('[Salarize] Error revoking invitation:', error);
        toast.error('Erreur lors de la révocation');
      } else {
        setCompanyInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        toast.success(`Accès de ${email} révoqué`);
      }
    } catch (e) {
      console.error('[Salarize] Error:', e);
    }
  };

  // Ouvrir le modal de gestion des accès
  const openManageAccessModal = () => {
    setShowManageAccessModal(true);
    loadCompanyInvitations();
  };

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
      // Détecter le token dans le hash (flow OAuth ou reset password)
      if (window.location.hash && window.location.hash.includes('access_token')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // Si c'est un reset password, juste établir la session et afficher le modal
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('[Salarize] Mode recovery détecté');
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          // Nettoyer l'URL mais garder le modal ouvert
          window.history.replaceState(null, '', window.location.pathname);
          setIsLoading(false);
          // Ne pas continuer - le modal s'affiche grâce au state initial
          return;
        }
        
        // Flow OAuth normal (Google login)
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
            // Ne pas mettre dashboard ici - loadFromSupabase décidera
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
        // Ne charger que si pas déjà chargé ET si on n'est pas en mode recovery
        if (!dataLoadedRef.current && !isRecoveryModeRef.current) {
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
      
      // Si on est en mode reset password, ignorer TOUS les events de redirection
      if (isRecoveryModeRef.current) {
        console.log('[Salarize] Mode recovery actif, ignoring event:', event);
        return;
      }
      
      // Détecter le reset password via event
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPasswordModal(true);
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Seulement après une nouvelle connexion
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
        // Charger les données si pas déjà fait
        if (!dataLoadedRef.current) {
          dataLoadedRef.current = true;
          setIsLoadingData(true);
          loadFromSupabase(session.user.id);
        } else {
          // Données déjà chargées, s'assurer qu'on va au dashboard
          setIsLoadingData(false);
          setCurrentPage('dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        dataLoadedRef.current = false;
        setUser(null);
        setCompanies({});
        setActiveCompany(null);
        setEmployees([]);
        setView('upload');
        setCurrentPage('home');
      }
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
      // Get user email for invitation lookup
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;
      console.log('[Salarize] User email:', userEmail);

      // Load user's own companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId);

      if (companiesError) {
        console.error('[Salarize] Error loading companies:', companiesError);
        throw companiesError;
      }

      console.log('[Salarize] Loaded own companies:', companiesData?.length || 0);

      // Load shared companies via invitations
      let sharedCompaniesData = [];
      if (userEmail) {
        // Find all invitations for this email (pending or accepted)
        const { data: invitations, error: invError } = await supabase
          .from('invitations')
          .select('*')
          .eq('invited_email', userEmail);

        if (invError) {
          console.error('[Salarize] Error loading invitations:', invError);
        } else if (invitations && invitations.length > 0) {
          console.log('[Salarize] Found invitations:', invitations.length);

          // Mark pending invitations as accepted
          const pendingInvites = invitations.filter(inv => inv.status === 'pending');
          if (pendingInvites.length > 0) {
            console.log('[Salarize] Accepting pending invitations:', pendingInvites.length);
            for (const inv of pendingInvites) {
              await supabase
                .from('invitations')
                .update({
                  status: 'accepted',
                  accepted_at: new Date().toISOString()
                })
                .eq('id', inv.id);
            }
          }

          // Get the company IDs from accepted/pending invitations
          const sharedCompanyIds = invitations.map(inv => inv.company_id);

          if (sharedCompanyIds.length > 0) {
            const { data: sharedComps, error: sharedError } = await supabase
              .from('companies')
              .select('*')
              .in('id', sharedCompanyIds);

            if (sharedError) {
              console.error('[Salarize] Error loading shared companies:', sharedError);
            } else {
              sharedCompaniesData = sharedComps || [];
              console.log('[Salarize] Loaded shared companies:', sharedCompaniesData.length);
            }
          }
        }
      }

      // Merge own companies + shared companies (avoid duplicates)
      const ownIds = new Set((companiesData || []).map(c => c.id));

      // Create a map of company_id -> role from invitations
      const invitationRoles = {};
      if (userEmail) {
        const { data: invs } = await supabase
          .from('invitations')
          .select('company_id, role')
          .eq('invited_email', userEmail);
        (invs || []).forEach(inv => {
          invitationRoles[inv.company_id] = inv.role;
        });
      }

      const allCompanies = [
        ...(companiesData || []),
        ...sharedCompaniesData.filter(c => !ownIds.has(c.id)).map(c => ({
          ...c,
          isShared: true,
          sharedRole: invitationRoles[c.id] || 'viewer'
        }))
      ];

      console.log('[Salarize] Total companies to load:', allCompanies.length);

      const loadedCompanies = {};

      for (const company of allCompanies) {
        console.log(`[Salarize] Loading data for company: ${company.name} (ID: ${company.id})`);
        
        // Load ALL employees for this company with pagination
        let allEmployeesData = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data: batch, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('company_id', company.id)
            .range(offset, offset + pageSize - 1)
            .order('id');

          if (empError) {
            console.error('[Salarize] Error loading employees batch:', empError);
            break;
          }
          
          if (batch && batch.length > 0) {
            allEmployeesData = [...allEmployeesData, ...batch];
            console.log(`[Salarize] Loaded batch ${Math.floor(offset / pageSize) + 1}: ${batch.length} employees (total: ${allEmployeesData.length})`);
            offset += pageSize;
            hasMore = batch.length === pageSize;
          } else {
            hasMore = false;
          }
        }
        
        console.log(`[Salarize] Total employees loaded for ${company.name}: ${allEmployeesData.length}`);

        // Load mappings for this company
        const { data: mappingsData, error: mapError } = await supabase
          .from('department_mappings')
          .select('*')
          .eq('company_id', company.id)
          .limit(10000);

        if (mapError) {
          console.error('[Salarize] Error loading mappings:', mapError);
        }

        const mapping = {};
        (mappingsData || []).forEach(m => {
          mapping[m.employee_name] = m.department;
        });
        console.log(`[Salarize] Loaded ${Object.keys(mapping).length} mappings for ${company.name}:`, mapping);

        const emps = allEmployeesData.map(e => {
          const finalDept = mapping[e.name] || e.department;
          if (mapping[e.name] && mapping[e.name] !== e.department) {
            console.log(`[Salarize] Employee ${e.name}: using mapping "${mapping[e.name]}" instead of DB "${e.department}"`);
          }
          return {
            name: e.name,
            department: finalDept,  // Priorité au mapping
            function: e.function,
            totalCost: parseFloat(e.total_cost) || 0,
            period: e.period
          };
        });

        const periods = [...new Set(emps.map(e => e.period).filter(Boolean))].sort();

        console.log(`[Salarize] Company ${company.name}: ${emps.length} employees, ${periods.length} periods`);
        console.log(`[Salarize] Periods found: ${periods.join(', ')}`);

        loadedCompanies[company.name] = {
          id: company.id,
          employees: emps,
          mapping,
          periods,
          logo: company.logo,
          brandColor: company.brand_color,
          website: company.website,
          isShared: company.isShared || false,
          sharedRole: company.sharedRole || null // 'viewer' ou 'editor' si partagée
        };
      }

      setCompanies(loadedCompanies);
      companiesRef.current = loadedCompanies; // Synchroniser la ref

      // Charger l'ordre des sociétés (priorité: Supabase > localStorage)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const supabaseOrder = authUser?.user_metadata?.company_order;

      if (supabaseOrder && Array.isArray(supabaseOrder)) {
        setCompanyOrder(supabaseOrder);
        console.log('[Salarize] Loaded company order from Supabase:', supabaseOrder);
        // Sync to localStorage
        localStorage.setItem(`salarize_company_order_${userId}`, JSON.stringify(supabaseOrder));
      } else {
        // Fallback to localStorage
        const savedOrder = localStorage.getItem(`salarize_company_order_${userId}`);
        if (savedOrder) {
          try {
            const parsedOrder = JSON.parse(savedOrder);
            setCompanyOrder(parsedOrder);
            console.log('[Salarize] Loaded company order from localStorage:', parsedOrder);
          } catch (e) {
            console.warn('[Salarize] Failed to parse saved company order');
          }
        }
      }

      // Load first company if exists
      const companyNames = Object.keys(loadedCompanies);
      if (companyNames.length > 0) {
        console.log('[Salarize] Loading first company:', companyNames[0]);
        loadCompany(companyNames[0], loadedCompanies);
      }
      
      // Toujours aller au dashboard après le chargement (avec ou sans données)
      setCurrentPage('dashboard');
    } catch (e) {
      console.error('[Salarize] Error loading from Supabase:', e);
      // Même en cas d'erreur, aller au dashboard
      setCurrentPage('dashboard');
    }
    setIsLoadingData(false);
  };

  // ============================================
  // SYSTÈME DE SAUVEGARDE ULTRA-ROBUSTE
  // Garantie: Les données importées ne se perdent JAMAIS
  // ============================================

  // État de synchronisation
  const [pendingSaveQueue, setPendingSaveQueue] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'pending', 'saving', 'error'
  const saveQueueRef = useRef([]);
  const isSavingRef = useRef(false);

  // Sauvegarder immédiatement en local AVANT toute opération
  const saveToLocalImmediate = (companyName, data) => {
    try {
      const key = `salarize_pending_${companyName}`;
      const payload = {
        timestamp: Date.now(),
        companyName,
        employees: data.employees || [],
        periods: data.periods || [],
        mapping: data.mapping || {},
        logo: data.logo,
        brandColor: data.brandColor,
        website: data.website,
        id: data.id
      };
      localStorage.setItem(key, JSON.stringify(payload));
      console.log(`[Salarize] ✓ Sauvegarde locale immédiate: ${companyName} (${payload.employees.length} employés)`);
      return true;
    } catch (e) {
      console.error('[Salarize] Erreur sauvegarde locale:', e);
      return false;
    }
  };

  // Récupérer les données en attente (non synchronisées)
  const getPendingLocalData = () => {
    const pending = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('salarize_pending_')) {
          const data = JSON.parse(localStorage.getItem(key));
          pending.push(data);
        }
      }
    } catch (e) {
      console.error('[Salarize] Erreur lecture pending:', e);
    }
    return pending;
  };

  // Marquer comme synchronisé (supprimer le pending)
  const markAsSynced = (companyName) => {
    try {
      localStorage.removeItem(`salarize_pending_${companyName}`);
      console.log(`[Salarize] ✓ Marqué comme synchronisé: ${companyName}`);
    } catch (e) {
      console.error('[Salarize] Erreur suppression pending:', e);
    }
  };

  // Créer un backup local avant toute opération destructive
  const createLocalBackup = (companyName, data) => {
    try {
      const backupKey = `salarize_backup_${companyName}_${Date.now()}`;
      const backup = {
        timestamp: new Date().toISOString(),
        companyName,
        employees: data.employees || [],
        periods: data.periods || [],
        mapping: data.mapping || {},
        employeeCount: data.employees?.length || 0,
        periodCount: data.periods?.length || 0
      };
      localStorage.setItem(backupKey, JSON.stringify(backup));

      // Garder seulement les 10 derniers backups par société
      const allBackups = Object.keys(localStorage)
        .filter(k => k.startsWith(`salarize_backup_${companyName}_`))
        .sort()
        .reverse();

      if (allBackups.length > 10) {
        allBackups.slice(10).forEach(k => localStorage.removeItem(k));
      }

      console.log(`[Salarize] ✓ Backup créé: ${backupKey} (${backup.employeeCount} employés, ${backup.periodCount} périodes)`);
      return backupKey;
    } catch (e) {
      console.error('[Salarize] Erreur création backup:', e);
      return null;
    }
  };

  // Récupérer le dernier backup
  const getLatestBackup = (companyName) => {
    try {
      const allBackups = Object.keys(localStorage)
        .filter(k => k.startsWith(`salarize_backup_${companyName}_`))
        .sort()
        .reverse();

      if (allBackups.length > 0) {
        const backup = JSON.parse(localStorage.getItem(allBackups[0]));
        console.log(`[Salarize] Dernier backup trouvé: ${allBackups[0]}`);
        return backup;
      }
    } catch (e) {
      console.error('[Salarize] Erreur lecture backup:', e);
    }
    return null;
  };

  // Bloquer la fermeture de la page si des données ne sont pas synchronisées
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const pendingData = getPendingLocalData();
      if (pendingData.length > 0 || saveStatus === 'saving' || saveStatus === 'pending') {
        e.preventDefault();
        e.returnValue = 'Des données ne sont pas encore synchronisées. Voulez-vous vraiment quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Vérifier et resynchroniser les données en attente au chargement
  useEffect(() => {
    if (user?.id && !isLoadingData) {
      const pendingData = getPendingLocalData();
      if (pendingData.length > 0) {
        console.log(`[Salarize] ⚠️ ${pendingData.length} société(s) avec données non synchronisées détectées`);
        toast.warning(`${pendingData.length} sauvegarde(s) en attente de synchronisation`);

        // Resynchroniser automatiquement
        pendingData.forEach(data => {
          console.log(`[Salarize] Resynchronisation de ${data.companyName}...`);
          // La sync se fera via saveAll
        });
      }
    }
  }, [user?.id, isLoadingData]);

  // Valider les données avant sauvegarde
  const validateDataBeforeSave = (companyName, newData, existingDbData) => {
    const issues = [];
    const warnings = [];

    // Vérifier que les nouvelles données ne sont pas vides si on avait des données avant
    if (existingDbData && existingDbData.employeeCount > 0) {
      const newEmployeeCount = newData.employees?.length || 0;
      const existingEmployeeCount = existingDbData.employeeCount;

      // Alerte si on perd plus de 50% des employés
      if (newEmployeeCount < existingEmployeeCount * 0.5) {
        issues.push({
          type: 'MAJOR_DATA_LOSS',
          message: `Perte majeure de données détectée: ${existingEmployeeCount} -> ${newEmployeeCount} employés (${Math.round((1 - newEmployeeCount/existingEmployeeCount) * 100)}% de perte)`,
          existingCount: existingEmployeeCount,
          newCount: newEmployeeCount
        });
      }

      // Alerte si on perd des périodes
      const newPeriodCount = [...new Set((newData.employees || []).map(e => e.period).filter(Boolean))].length;
      const existingPeriodCount = existingDbData.periodCount;

      if (newPeriodCount < existingPeriodCount) {
        warnings.push({
          type: 'PERIOD_LOSS',
          message: `Perte de périodes: ${existingPeriodCount} -> ${newPeriodCount} périodes`,
          existingCount: existingPeriodCount,
          newCount: newPeriodCount
        });
      }
    }

    // Vérifier que les données ne sont pas totalement vides pour une société existante
    if (newData.employees?.length === 0 && existingDbData?.employeeCount > 0) {
      issues.push({
        type: 'EMPTY_DATA',
        message: `Tentative de supprimer tous les employés (${existingDbData.employeeCount} -> 0)`,
        existingCount: existingDbData.employeeCount
      });
    }

    return { issues, warnings, isValid: issues.length === 0 };
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * 💾 SAUVEGARDE SUPABASE - Fonction principale de persistence
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * [AI-DOC] Cette fonction sauvegarde TOUTES les données en base de données.
   * Elle est appelée après chaque modification importante (import, assignation, etc.)
   *
   * [DB-DEPENDENCY] Tables Supabase requises:
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ TABLE: companies                                                        │
   * │ - id (UUID, PK)                                                        │
   * │ - user_id (UUID, FK → auth.users)                                      │
   * │ - name (TEXT) - Nom de la société                                      │
   * │ - logo (TEXT) - URL du logo (nullable)                                 │
   * │ - brand_color (TEXT) - Couleur de marque hex (nullable)                │
   * │ - website (TEXT) - Site web (nullable)                                 │
   * │ - created_at (TIMESTAMP)                                               │
   * └─────────────────────────────────────────────────────────────────────────┘
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ TABLE: employees                                                        │
   * │ - id (UUID, PK)                                                        │
   * │ - company_id (UUID, FK → companies.id)                                 │
   * │ - name (TEXT) - Nom de l'employé                                       │
   * │ - department (TEXT) - Département (nullable = Non assigné)             │
   * │ - function (TEXT) - Fonction/poste (nullable)                          │
   * │ - period (TEXT) - Format "YYYY-MM"                                     │
   * │ - total_cost (NUMERIC) - Coût salarial total                           │
   * │ - created_at (TIMESTAMP)                                               │
   * └─────────────────────────────────────────────────────────────────────────┘
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ TABLE: department_mappings                                              │
   * │ - id (UUID, PK)                                                        │
   * │ - company_id (UUID, FK → companies.id)                                 │
   * │ - employee_name (TEXT) - Clé de mapping                                │
   * │ - department (TEXT) - Département assigné                              │
   * └─────────────────────────────────────────────────────────────────────────┘
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ TABLE: invitations                                                      │
   * │ - id (UUID, PK)                                                        │
   * │ - company_id (UUID, FK → companies.id)                                 │
   * │ - email (TEXT) - Email de l'invité                                     │
   * │ - role (TEXT) - 'viewer' ou 'editor'                                   │
   * │ - status (TEXT) - 'pending', 'accepted', 'rejected'                    │
   * │ - display_name (TEXT) - Nom personnalisé (OPTIONNEL - doit être ajouté)│
   * │ - invited_by (UUID, FK → auth.users)                                   │
   * │ - created_at (TIMESTAMP)                                               │
   * └─────────────────────────────────────────────────────────────────────────┘
   *
   * [DB-MIGRATION-REQUIRED] Si tu vois une erreur sur une colonne manquante:
   * - display_name dans invitations: ALTER TABLE invitations ADD COLUMN display_name TEXT;
   *
   * @param {Object} newCompanies - Objet { companyName: { employees, mapping, periods, ... } }
   * @param {string} activeCompanyName - Nom de la société active
   */
  const saveToSupabase = async (newCompanies, activeCompanyName) => {
    if (!user?.id) {
      console.log('[Salarize] No user ID, saving to localStorage');
      saveToLocalStorage(newCompanies, activeCompanyName);
      return;
    }

    console.log('[Salarize] ========== DÉBUT SAUVEGARDE SUPABASE ==========');
    console.log('[Salarize] User:', user.id);
    console.log('[Salarize] Timestamp:', new Date().toISOString());
    setIsSyncing(true);
    setSaveStatus('saving');

    try {
      const latestCompanies = companiesRef.current;

      for (const [companyName, companyData] of Object.entries(latestCompanies)) {
        // Skip shared companies (viewer can't modify)
        if (companyData.isShared && companyData.sharedRole === 'viewer') {
          console.log(`[Salarize] Skipping shared company (viewer): ${companyName}`);
          continue;
        }

        let companyId = companyData.id;
        console.log(`[Salarize] --- Processing: ${companyName} ---`);
        console.log(`[Salarize] Company ID: ${companyId}`);
        console.log(`[Salarize] Employees in memory: ${companyData.employees?.length || 0}`);

        // Create or update company
        if (!companyId) {
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

          if (companiesRef.current[companyName]) {
            companiesRef.current[companyName].id = companyId;
          }
        } else {
          console.log(`[Salarize] Updating company metadata: ${companyName}`);
          await supabase
            .from('companies')
            .update({
              name: companyName,
              logo: companyData.logo || null,
              brand_color: companyData.brandColor || null,
              website: companyData.website || null
            })
            .eq('id', companyId);
        }

        // Récupérer l'état actuel de la DB AVANT modification
        // Note: Supabase limite par défaut à 1000 lignes
        const { data: currentDbEmployees } = await supabase
          .from('employees')
          .select('id, name, period, total_cost')
          .eq('company_id', companyId)
          .limit(10000);

        const dbState = {
          employeeCount: currentDbEmployees?.length || 0,
          periodCount: [...new Set((currentDbEmployees || []).map(e => e.period))].length,
          periods: [...new Set((currentDbEmployees || []).map(e => e.period))].sort()
        };

        console.log(`[Salarize] État actuel DB: ${dbState.employeeCount} employés, ${dbState.periodCount} périodes`);
        console.log(`[Salarize] Périodes DB: ${dbState.periods.join(', ')}`);

        const latestCompanyData = companiesRef.current[companyName] || companyData;
        const employeeCount = latestCompanyData.employees?.length || 0;
        const periodsInData = [...new Set((latestCompanyData.employees || []).map(e => e.period).filter(Boolean))].sort();

        console.log(`[Salarize] Données à sauvegarder: ${employeeCount} employés, ${periodsInData.length} périodes`);
        console.log(`[Salarize] Périodes à sauvegarder: ${periodsInData.join(', ')}`);

        // VALIDATION - Vérifier si on va perdre des données
        const validation = validateDataBeforeSave(companyName, latestCompanyData, dbState);

        if (validation.warnings.length > 0) {
          validation.warnings.forEach(w => console.warn(`[Salarize] ⚠️ ${w.message}`));
        }

        if (!validation.isValid) {
          console.error('[Salarize] ❌ VALIDATION ÉCHOUÉE - Sauvegarde annulée pour protéger les données');
          validation.issues.forEach(issue => {
            console.error(`[Salarize] Issue: ${issue.message}`);
          });

          // Créer un backup de l'état actuel de la DB au cas où
          if (dbState.employeeCount > 0) {
            const backupData = {
              employees: currentDbEmployees,
              periods: dbState.periods,
              mapping: latestCompanyData.mapping
            };
            createLocalBackup(companyName, backupData);
          }

          toast.error(`Protection des données activée: sauvegarde annulée pour ${companyName}`);
          continue; // Passer à la société suivante
        }

        // CRÉER UN BACKUP AVANT MODIFICATION
        if (dbState.employeeCount > 0) {
          createLocalBackup(companyName, {
            employees: currentDbEmployees,
            periods: dbState.periods,
            mapping: latestCompanyData.mapping
          });
        }

        // SYNCHRONISATION DES EMPLOYÉS
        if (employeeCount > 0) {
          console.log(`[Salarize] Syncing ${employeeCount} employees...`);

          const dbPeriods = dbState.periods;
          const localPeriods = periodsInData;

          // Identifier les périodes à supprimer (seulement si explicitement demandé)
          const periodsToDelete = dbPeriods.filter(p => !localPeriods.includes(p));

          if (periodsToDelete.length > 0) {
            console.log(`[Salarize] ⚠️ Périodes à supprimer: ${periodsToDelete.join(', ')}`);
            // Ne supprimer que si c'est une action explicite (pas un bug)
            for (const period of periodsToDelete) {
              const { error: delErr } = await supabase
                .from('employees')
                .delete()
                .eq('company_id', companyId)
                .eq('period', period);

              if (delErr) {
                console.error(`[Salarize] Erreur suppression période ${period}:`, delErr);
              } else {
                console.log(`[Salarize] ✓ Période ${period} supprimée`);
              }
            }
          }

          // Regrouper par période pour insert/update
          const employeesByPeriod = {};
          latestCompanyData.employees.forEach(e => {
            if (!employeesByPeriod[e.period]) employeesByPeriod[e.period] = [];
            employeesByPeriod[e.period].push(e);
          });

          let totalInserted = 0;
          let totalErrors = 0;

          for (const [period, emps] of Object.entries(employeesByPeriod)) {
            console.log(`[Salarize] Traitement période ${period}: ${emps.length} employés`);

            // Supprimer les employés existants de cette période
            const { error: deleteError } = await supabase
              .from('employees')
              .delete()
              .eq('company_id', companyId)
              .eq('period', period);

            if (deleteError) {
              console.error(`[Salarize] ❌ Erreur suppression période ${period}:`, deleteError);
              totalErrors++;
              continue;
            }

            // Préparer les données à insérer
            const employeesToInsert = emps.map(e => ({
              company_id: companyId,
              name: e.name,
              department: e.department || latestCompanyData.mapping?.[e.name] || null,
              function: e.function || null,
              total_cost: e.totalCost,
              period: e.period
            }));

            // Insert par batch avec retry
            const batchSize = 500;
            for (let i = 0; i < employeesToInsert.length; i += batchSize) {
              const batch = employeesToInsert.slice(i, i + batchSize);
              let retries = 3;
              let success = false;

              while (retries > 0 && !success) {
                const { error: insertError } = await supabase
                  .from('employees')
                  .insert(batch);

                if (insertError) {
                  retries--;
                  console.error(`[Salarize] Erreur insert batch (tentative ${3-retries}/3):`, insertError);
                  if (retries > 0) {
                    await new Promise(r => setTimeout(r, 500));
                  } else {
                    totalErrors++;
                  }
                } else {
                  success = true;
                  totalInserted += batch.length;
                }
              }
            }

            console.log(`[Salarize] ✓ Période ${period}: ${emps.length} employés sauvegardés`);
          }

          console.log(`[Salarize] Résultat: ${totalInserted}/${employeeCount} employés sauvegardés, ${totalErrors} erreurs`);

          if (totalErrors > 0) {
            toast.warning(`Attention: ${totalErrors} erreurs lors de la sauvegarde`);
          }

        } else if (employeeCount === 0 && dbState.employeeCount > 0) {
          // CAS SPÉCIAL: On veut vider tous les employés - BLOQUER PAR DÉFAUT
          console.warn('[Salarize] ⚠️ Tentative de suppression de tous les employés BLOQUÉE');
          console.warn('[Salarize] Pour supprimer tous les employés, utilisez la fonction de suppression explicite');
          // NE PAS supprimer - c'est probablement un bug
        }

        // SYNC MAPPINGS
        const mappingEntries = Object.entries(latestCompanyData.mapping || {});

        if (mappingEntries.length > 0) {
          // Supprimer les anciens mappings
          await supabase
            .from('department_mappings')
            .delete()
            .eq('company_id', companyId);

          const mappingsToInsert = mappingEntries.map(([empName, dept]) => ({
            company_id: companyId,
            employee_name: empName,
            department: dept
          }));

          const { error: mapError } = await supabase
            .from('department_mappings')
            .insert(mappingsToInsert);

          if (mapError) {
            console.error('[Salarize] Erreur insertion mappings:', mapError);
          } else {
            console.log(`[Salarize] ✓ ${mappingsToInsert.length} mappings sauvegardés`);
          }
        }

        // VÉRIFICATION POST-SAUVEGARDE - Utiliser COUNT pour éviter la limite de 1000
        const { count: savedCount, error: verifyError } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId);

        if (verifyError) {
          console.error(`[Salarize] ❌ Erreur vérification post-save:`, verifyError);
        } else {
          const expectedCount = latestCompanyData.employees?.length || 0;

          console.log(`[Salarize] ✓ Vérification COUNT: ${savedCount}/${expectedCount} employés en DB`);

          if (savedCount < expectedCount * 0.9) {
            console.error(`[Salarize] ⚠️ ALERTE: Seulement ${savedCount}/${expectedCount} employés sauvegardés!`);
            toast.error(`Attention: données partiellement sauvegardées (${savedCount}/${expectedCount})`);
          } else {
            // Succès - marquer comme synchronisé
            markAsSynced(companyName);
            setSaveStatus('saved');
          }
        }

        console.log(`[Salarize] --- Fin traitement: ${companyName} ---`);
      }

      console.log('[Salarize] ========== FIN SAUVEGARDE SUPABASE ==========');
      setLastSaved(new Date());
      setSaveStatus('saved');

    } catch (e) {
      console.error('[Salarize] ❌ ERREUR CRITIQUE:', e);
      toast.error('Erreur de sauvegarde - Les données sont protégées en local');
      saveToLocalStorage(companiesRef.current, activeCompanyName);
      setSaveStatus('error');
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
  const saveAll = async (newCompanies, active) => {
    if (user?.id) {
      return await saveToSupabase(newCompanies, active);
    } else {
      saveToLocalStorage(newCompanies, active);
    }
    setLastSaved(new Date());
  };

  // Debounced version for frequent updates (like department changes)
  const debouncedSaveAll = useDebouncedCallback((newCompanies, active) => {
    saveAll(newCompanies, active);
  }, 800);

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
    console.log('[Salarize] Auth success - user_id:', userData?.id, 'provider:', userData?.provider);
    setUser(userData);
    sessionStorage.setItem('salarize_user', JSON.stringify(userData));
    setShowAuthModal(false);

    // Toujours recharger les données après connexion via AuthModal
    // pour s'assurer que les données correspondent au bon user
    if (userData?.id) {
      dataLoadedRef.current = true;
      setIsLoadingData(true);
      loadFromSupabase(userData.id);
    }
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
    setCreatedDepartments(c.createdDepartments || []);
    setSelectedPeriods([]);
    setView('dashboard');
  };

  // Handler pour réorganiser les sociétés dans la sidebar (drag & drop)
  const handleReorderCompanies = async (newOrder) => {
    setCompanyOrder(newOrder);

    // Sauvegarder dans localStorage (backup local)
    if (user?.id) {
      localStorage.setItem(`salarize_company_order_${user.id}`, JSON.stringify(newOrder));
    }

    // Sauvegarder dans Supabase (user_metadata)
    try {
      await supabase.auth.updateUser({
        data: { company_order: newOrder }
      });
    } catch (err) {
      console.error('[Salarize] Error saving company order:', err);
    }
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
            setDebugMsg('Aucune donnée trouvée');
            toast.error('Fichier non reconnu. Vérifiez que votre fichier contient des données salariales (colonnes Nom, Brut, Net, Coût...).');
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

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * 🚀 IMPORT RAPIDE - Importe TOUS les fichiers automatiquement
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * [AI-DOC] Cette fonction permet d'importer TOUS les fichiers Excel rapidement:
   * - Traite le fichier actuel ET tous les fichiers restants dans la queue
   * - Fait confiance à 100% à la période détectée (pas de modal de confirmation)
   * - Les employés sans département reconnu sont assignés à "Non assigné" (null)
   * - Sauvegarde automatiquement en base de données après TOUS les imports
   *
   * [DB-DEPENDENCY] Tables Supabase utilisées:
   * - companies: { id, name, created_by, logo, color, website, employees (JSONB), periods (JSONB), mapping (JSONB) }
   * - Pas de nouvelles colonnes requises pour cette fonctionnalité
   */
  const quickImportFromPending = async () => {
    if (!pendingPeriodSelection || !activeCompany) {
      toast.error('Aucune donnée à importer');
      return;
    }

    // Fermer le modal immédiatement pour feedback utilisateur
    const currentPending = { ...pendingPeriodSelection };
    const currentQueue = [...fileQueue];
    const startIndex = currentFileIndex;

    setPendingPeriodSelection(null);

    // Compteurs pour le résumé final
    let totalEmployees = 0;
    let totalFiles = 0;
    const importedPeriods = new Set();

    // Fonction helper pour parser et importer un fichier
    const parseAndImportFile = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });

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

            // Parser le fichier
            let result = parseAcerta(rows);
            if (!result) result = parseAcertaNL(rows);
            if (!result) result = parseSecurex(rows, file.name);
            if (!result) result = parseGeneric(rows, file.name);

            if (!result || result.employees.length === 0) {
              console.log(`[Salarize] ⚠️ Fichier ignoré (non reconnu): ${file.name}`);
              resolve(null);
              return;
            }

            // Analyser la période
            const periodAnalysis = analyzePeriodSuggestion(rows, file.name);
            const suggestedPeriod = periodAnalysis.period;
            if (result.periods[0] === 'Unknown' && suggestedPeriod) {
              result.employees.forEach(emp => emp.period = suggestedPeriod);
              result.periods = [suggestedPeriod];
            }

            resolve({
              employees: result.employees,
              periods: result.periods,
              suggestedPeriod: result.periods[0] !== 'Unknown' ? result.periods[0] : suggestedPeriod,
              periodConfidence: periodAnalysis.confidence,
              fileName: file.name
            });
          } catch (err) {
            console.error(`[Salarize] Erreur parsing ${file.name}:`, err);
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsArrayBuffer(file);
      });
    };

    console.log(`[Salarize] 🚀 IMPORT RAPIDE: Démarrage pour ${currentQueue.length > 0 ? currentQueue.length - startIndex : 1} fichier(s)`);

    // 1. Importer le fichier actuellement pending
    const { employees, suggestedPeriod, periodConfidence } = currentPending;
    const period = suggestedPeriod && suggestedPeriod !== 'Unknown'
      ? suggestedPeriod
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const updatedEmployees = employees.map(e => ({
      ...e,
      period,
      department: e.department || null
    }));

    importToCompanyDirect(activeCompany, { employees: updatedEmployees, periods: [period] }, true);
    totalEmployees += employees.length;
    totalFiles++;
    importedPeriods.add(period);
    console.log(`[Salarize] ✓ Fichier 1: ${employees.length} employés (${period})`);

    // 2. Traiter tous les fichiers restants dans la queue
    if (currentQueue.length > 0) {
      for (let i = startIndex + 1; i < currentQueue.length; i++) {
        const file = currentQueue[i];
        console.log(`[Salarize] 📄 Traitement fichier ${i + 1}/${currentQueue.length}: ${file.name}`);

        const parsed = await parseAndImportFile(file);
        if (parsed) {
          const filePeriod = parsed.suggestedPeriod && parsed.suggestedPeriod !== 'Unknown'
            ? parsed.suggestedPeriod
            : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

          const fileEmployees = parsed.employees.map(e => ({
            ...e,
            period: filePeriod,
            department: e.department || null
          }));

          // Toujours skipSave sauf pour le dernier fichier
          const isLast = i === currentQueue.length - 1;
          importToCompanyDirect(activeCompany, { employees: fileEmployees, periods: [filePeriod] }, !isLast);

          totalEmployees += parsed.employees.length;
          totalFiles++;
          importedPeriods.add(filePeriod);
          console.log(`[Salarize] ✓ Fichier ${i + 1}: ${parsed.employees.length} employés (${filePeriod})`);
        }
      }
    }

    // 3. Sauvegarder tout à la fin
    console.log('[Salarize] 💾 Sauvegarde finale...');
    await saveAll(companiesRef.current, activeCompany);

    // 4. Nettoyer et afficher le résumé
    setFileQueue([]);
    setCurrentFileIndex(0);

    const periodsStr = [...importedPeriods].map(p => formatPeriod(p)).join(', ');
    toast.success(`⚡ Import rapide terminé: ${totalEmployees} employés (${totalFiles} fichier${totalFiles > 1 ? 's' : ''}) - ${periodsStr}`);
    console.log(`[Salarize] 🎉 Import rapide terminé: ${totalEmployees} employés, ${totalFiles} fichiers, périodes: ${periodsStr}`);
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

  const importToCompanyDirect = (companyName, data, skipSave = false) => {
    if (!data || !companyName) return;

    // ÉTAPE 1: Sauvegarder les données brutes en local IMMÉDIATEMENT avant tout traitement
    // Ceci garantit qu'on ne perd JAMAIS les données importées, même en cas de crash
    setSaveStatus('pending');
    saveToLocalImmediate(companyName, {
      employees: data.employees || [],
      periods: data.periods || [],
      mapping: {},
      rawImport: true,
      importTimestamp: Date.now()
    });
    console.log(`[Salarize] 🛡️ Données brutes sauvegardées en local AVANT traitement`);

    // Utiliser la ref pour avoir les données les plus récentes (important pour imports multiples)
    const currentCompanies = companiesRef.current;
    const existing = currentCompanies[companyName] || { employees: [], mapping: {}, periods: [] };
    const mapping = { ...existing.mapping };
    
    console.log(`[Salarize] Import: existing employees = ${existing.employees?.length || 0}, incoming = ${data.employees?.length || 0}`);
    
    const existingKeys = new Set((existing.employees || []).map(e => `${e.period}-${e.name}`));
    const newEmps = data.employees
      .filter(e => !existingKeys.has(`${e.period}-${e.name}`))
      .map(e => ({ ...e, department: e.department || mapping[e.name] || null }));
    
    const allEmps = [...(existing.employees || []), ...newEmps];
    const allPeriods = [...new Set([...(existing.periods || []), ...data.periods])].sort();
    
    console.log(`[Salarize] Import: new unique employees = ${newEmps.length}, total after merge = ${allEmps.length}, periods = ${allPeriods.length}`);
    
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
    console.log(`[Salarize] Ref updated: companiesRef now has ${companiesRef.current[companyName]?.employees?.length || 0} employees`);
    
    setCompanies(newCompanies);
    setActiveCompany(companyName);
    setEmployees(allEmps);
    setDepartmentMapping(mapping);
    setPeriods(allPeriods);
    
    // Ne sauvegarder que si skipSave est false
    if (!skipSave) {
      console.log(`[Salarize] Saving immediately (skipSave=false)`);
      saveAll(newCompanies, companyName);
    } else {
      console.log(`[Salarize] Skipping save (will save at end of batch)`);
    }
    
    setPendingData(null);
    setShowModal(false);
    setNewCompanyName('');
    setDebugMsg(`✓ ${newEmps.length} nouvelles entrées (total: ${allEmps.length})`);

    // Toujours aller au dashboard (pas de flow d'assignation automatique)
    setView('dashboard');
    
    return newCompanies; // Retourner pour pouvoir sauvegarder à la fin
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

      // Envoyer via EmailJS
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          'template_share', // Créer ce template dans EmailJS
          {
            to_email: shareEmail,
            from_name: senderName,
            company_name: activeCompany,
            total_cost: `€${totalCostValue.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}`,
            employee_count: uniqueEmps,
            periods_count: periodsCount,
            avg_cost: `€${avgCost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}`,
            top_departments: topDepts,
            message: shareMessage || 'Aucun message',
          }
        );
        toast.success(`Rapport envoyé à ${shareEmail}`);
      } catch (e) {
        console.error('EmailJS error:', e);
        // Fallback mailto
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

  // Suppression EXPLICITE des données - contourne la validation car action intentionnelle
  const clearCompanyData = async () => {
    if (!activeCompany) return;

    const companyId = companies[activeCompany]?.id;

    // Créer un backup avant suppression
    if (companies[activeCompany]?.employees?.length > 0) {
      createLocalBackup(activeCompany, {
        employees: companies[activeCompany].employees,
        periods: companies[activeCompany].periods,
        mapping: companies[activeCompany].mapping
      });
      console.log('[Salarize] Backup créé avant clearCompanyData');
    }

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
    companiesRef.current = newCompanies;
    setEmployees([]);
    setPeriods([]);
    setDepartmentMapping({});

    // Suppression DIRECTE dans Supabase (pas via saveAll pour éviter la validation)
    if (user?.id && companyId) {
      try {
        console.log('[Salarize] Suppression explicite des employés pour', activeCompany);
        await supabase.from('employees').delete().eq('company_id', companyId);
        await supabase.from('department_mappings').delete().eq('company_id', companyId);
        toast.success('Données supprimées');
      } catch (e) {
        console.error('[Salarize] Erreur suppression:', e);
        toast.error('Erreur lors de la suppression');
      }
    } else {
      saveToLocalStorage(newCompanies, activeCompany);
    }
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

  // Suppression EXPLICITE d'une période - contourne la validation car action intentionnelle
  const deletePeriod = async (periodToDelete) => {
    if (!activeCompany) return;

    const companyId = companies[activeCompany]?.id;

    // Créer un backup avant suppression
    createLocalBackup(activeCompany, {
      employees: companies[activeCompany].employees,
      periods: companies[activeCompany].periods,
      mapping: companies[activeCompany].mapping
    });
    console.log(`[Salarize] Backup créé avant suppression période ${periodToDelete}`);

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
    companiesRef.current = newCompanies;
    setEmployees(newEmployees);
    setPeriods(newPeriods);

    // Suppression DIRECTE dans Supabase (action explicite)
    if (user?.id && companyId) {
      try {
        console.log(`[Salarize] Suppression explicite période ${periodToDelete}`);
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('company_id', companyId)
          .eq('period', periodToDelete);

        if (error) {
          console.error('[Salarize] Erreur suppression période:', error);
          toast.error('Erreur lors de la suppression');
        } else {
          toast.success(`Période ${formatPeriod(periodToDelete)} supprimée`);
        }
      } catch (e) {
        console.error('[Salarize] Erreur:', e);
        toast.error('Erreur lors de la suppression');
      }
    } else {
      saveToLocalStorage(newCompanies, activeCompany);
      toast.success(`Période ${formatPeriod(periodToDelete)} supprimée`);
    }
  };

  // Vérifier si l'utilisateur est en mode lecture seule (viewer)
  const isViewerOnly = useMemo(() => {
    const company = companies[activeCompany];
    return company?.isShared && company?.sharedRole === 'viewer';
  }, [companies, activeCompany]);

  // Computed values with useMemo for performance
  const filtered = useMemo(() => {
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

    return employees.filter(e => filteredPeriods.includes(e.period));
  }, [employees, periods, selectedPeriods, periodFilter, selectedYear]);
  
  const totalCost = useMemo(() => 
    filtered.reduce((s, e) => s + e.totalCost, 0),
    [filtered]
  );
  
  const uniqueNames = useMemo(() =>
    new Set(filtered.map(e => e.name)).size,
    [filtered]
  );

  // Nombre de périodes dans les données filtrées
  const filteredPeriodsCount = useMemo(() =>
    new Set(filtered.map(e => e.period)).size,
    [filtered]
  );

  // Moyenne d'employés par période
  const avgEmployeesPerPeriod = useMemo(() => {
    if (filteredPeriodsCount === 0) return 0;
    const periodCounts = {};
    filtered.forEach(e => {
      if (!periodCounts[e.period]) periodCounts[e.period] = new Set();
      periodCounts[e.period].add(e.name);
    });
    const totalEmployeesAcrossPeriods = Object.values(periodCounts).reduce((sum, set) => sum + set.size, 0);
    return Math.round(totalEmployeesAcrossPeriods / filteredPeriodsCount);
  }, [filtered, filteredPeriodsCount]);
  
  // Coût moyen mensuel par employé
  const avgMonthlyCostPerEmployee = useMemo(() => {
    if (uniqueNames === 0 || filteredPeriodsCount === 0) return 0;
    return totalCost / uniqueNames / filteredPeriodsCount;
  }, [totalCost, uniqueNames, filteredPeriodsCount]);
  
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
  // Données de comparaison - basées sur le dernier mois importé (toutes périodes confondues)
  const comparisonData = useMemo(() => {
    if (!periods || periods.length === 0 || !employees || employees.length === 0) return null;
    
    // Trier toutes les périodes pour trouver la plus récente
    const sortedAllPeriods = [...periods].sort((a, b) => b.localeCompare(a));
    const latestPeriod = sortedAllPeriods[0];
    
    if (!latestPeriod) return null;
    
    const latestMonth = latestPeriod.substring(5);
    const latestYear = parseInt(latestPeriod.substring(0, 4));
    
    // Calculer le mois précédent
    let prevMonthNum = parseInt(latestMonth) - 1;
    let prevYear = latestYear;
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYear = latestYear - 1;
    }
    const prevMonthPeriod = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
    
    // Même mois année précédente
    const sameMonthLastYearPeriod = `${latestYear - 1}-${latestMonth}`;
    
    // Calculer les totaux pour chaque période
    const calcTotal = (period) => {
      return employees
        .filter(e => e.period === period)
        .reduce((sum, e) => sum + (e.totalCost || 0), 0);
    };
    
    const currentTotal = calcTotal(latestPeriod);
    const prevMonthTotal = periods.includes(prevMonthPeriod) ? calcTotal(prevMonthPeriod) : null;
    const sameMonthLastYearTotal = periods.includes(sameMonthLastYearPeriod) ? calcTotal(sameMonthLastYearPeriod) : null;
    
    // Calculs de variation
    const calcVariation = (current, previous) => {
      if (previous === null || previous === 0) return null;
      return ((current - previous) / previous) * 100;
    };
    
    return {
      current: { period: latestPeriod, total: currentTotal },
      prevMonth: prevMonthTotal !== null ? { period: prevMonthPeriod, total: prevMonthTotal } : null,
      sameMonthLastYear: sameMonthLastYearTotal !== null ? { period: sameMonthLastYearPeriod, total: sameMonthLastYearTotal } : null,
      variationVsPrevMonth: prevMonthTotal !== null ? calcVariation(currentTotal, prevMonthTotal) : null,
      variationVsLastYear: sameMonthLastYearTotal !== null ? calcVariation(currentTotal, sameMonthLastYearTotal) : null,
      diffVsPrevMonth: prevMonthTotal !== null ? currentTotal - prevMonthTotal : null,
      diffVsLastYear: sameMonthLastYearTotal !== null ? currentTotal - sameMonthLastYearTotal : null
    };
  }, [periods, employees]);

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
    
    // Calculer les variations et filtrer les départements vides
    Object.keys(stats).forEach(dept => {
      const s = stats[dept];
      // Supprimer les départements sans coût dans la période actuelle
      if (s.current === 0 && s.prevMonth === 0 && s.sameMonthLastYear === 0) {
        delete stats[dept];
        return;
      }
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
    // Filtrer les départements avec un coût total de 0
    Object.keys(stats).forEach(dept => {
      if (stats[dept].total === 0) delete stats[dept];
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

  // === OPTIMISATIONS GESTIONNAIRE DÉPARTEMENTS ===
  // Liste de tous les départements uniques (memoïsée)
  const allDepartments = useMemo(() => {
    // Get all departments from employees
    const depts = [...new Set(employees.map(e => e.department || departmentMapping[e.name]).filter(Boolean))];

    // Filter out departments with no employees (based on filtered data)
    const deptsWithEmployees = depts.filter(dept => {
      const hasEmployees = filtered.some(e => (e.department || departmentMapping[e.name]) === dept);
      return hasEmployees;
    });

    // Add manually created departments that don't have employees yet
    const allDepts = [...new Set([...deptsWithEmployees, ...createdDepartments])];

    return allDepts.sort();
  }, [employees, departmentMapping, filtered, createdDepartments]);

  // Employés uniques avec leur département actuel (memoïsée) - basé sur TOUS les employés
  // Important: utiliser 'employees' et non 'filtered' pour que le compteur corresponde à la Sidebar
  const uniqueEmployeesWithDept = useMemo(() => {
    const seen = new Map();
    employees.forEach(e => {
      if (!seen.has(e.name)) {
        seen.set(e.name, {
          ...e,
          currentDept: e.department || departmentMapping[e.name] || null
        });
      }
    });
    return [...seen.values()];
  }, [employees, departmentMapping]);

  // Stats du gestionnaire de départements (memoïsées)
  const deptManagerStats = useMemo(() => {
    const total = uniqueEmployeesWithDept.length;
    const unassigned = uniqueEmployeesWithDept.filter(e => !e.currentDept).length;
    const assigned = total - unassigned;
    const deptCount = allDepartments.length;
    return { total, unassigned, assigned, deptCount };
  }, [uniqueEmployeesWithDept, allDepartments]);

  // Employés filtrés pour le gestionnaire (memoïsée avec debounce)
  // Liste complète filtrée (pour le comptage et "tout sélectionner")
  const allFilteredEmployeesForDept = useMemo(() => {
    return uniqueEmployeesWithDept
      .filter(e => {
        if (debouncedDeptSearch && !e.name.toLowerCase().includes(debouncedDeptSearch.toLowerCase())) return false;
        if (deptFilter === 'unassigned') return !e.currentDept;
        if (deptFilter !== 'all') return e.currentDept === deptFilter;
        return true;
      })
      .sort((a, b) => {
        // Non assignés en premier
        if (!a.currentDept && b.currentDept) return -1;
        if (a.currentDept && !b.currentDept) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [uniqueEmployeesWithDept, debouncedDeptSearch, deptFilter]);

  // Liste paginée pour l'affichage (PERF: évite de render 500+ éléments)
  const filteredEmployeesForDept = useMemo(() => {
    const start = deptPage * DEPT_PAGE_SIZE;
    return allFilteredEmployeesForDept.slice(start, start + DEPT_PAGE_SIZE);
  }, [allFilteredEmployeesForDept, deptPage]);

  // Nombre total de pages
  const deptTotalPages = useMemo(() => 
    Math.ceil(allFilteredEmployeesForDept.length / DEPT_PAGE_SIZE),
    [allFilteredEmployeesForDept.length]
  );

  // Reset page quand les filtres changent
  useEffect(() => {
    setDeptPage(0);
  }, [debouncedDeptSearch, deptFilter]);

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

  // ============================================
  // VUE RESET PASSWORD - PRIORITAIRE
  // ============================================
  // Cette vue s'affiche AVANT tout le reste si on est en mode reset password
  if (showResetPasswordModal) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Nouveau mot de passe</h2>
            <p className="text-violet-100 text-sm mt-1">Choisissez votre nouveau mot de passe</p>
          </div>
          
          <div className="p-6">
            {resetPasswordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {resetPasswordError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  placeholder="Minimum 6 caractères"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  placeholder="Répétez le mot de passe"
                />
              </div>
              
              <button
                onClick={handleUpdatePassword}
                disabled={resetPasswordLoading || !newPassword || !confirmPassword}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-fuchsia-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetPasswordLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mise à jour...
                  </>
                ) : (
                  'Mettre à jour le mot de passe'
                )}
              </button>
              
              <p className="text-center text-slate-400 text-xs mt-4">
                Après la mise à jour, vous serez redirigé vers la page de connexion.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading screen
  if (isLoading) {
    return <LoadingSpinner size="lg" text="Salarize" subtext="Chargement de votre espace..." fullScreen />;
  }

  // Loading des données (utilisateur connecté mais données en cours de chargement)
  if (user && isLoadingData) {
    return <LoadingSpinner size="lg" text="Salarize" subtext="Chargement de vos données..." fullScreen />;
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
            <div className="max-w-lg mx-auto">
              {/* Header amélioré */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl mb-4 shadow-lg shadow-violet-500/25">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Bienvenue, {user?.name?.split(' ')[0]} ! 👋
                </h1>
                <p className="text-slate-400 text-lg">
                  Commençons par analyser vos coûts salariaux
                </p>
              </div>
              
              {/* Étapes */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-full">
                  <span className="w-5 h-5 bg-violet-500 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                  <span className="text-violet-300 text-sm font-medium">Importer</span>
                </div>
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full opacity-50">
                  <span className="w-5 h-5 bg-slate-600 text-slate-400 text-xs font-bold rounded-full flex items-center justify-center">2</span>
                  <span className="text-slate-500 text-sm">Analyser</span>
                </div>
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full opacity-50">
                  <span className="w-5 h-5 bg-slate-600 text-slate-400 text-xs font-bold rounded-full flex items-center justify-center">3</span>
                  <span className="text-slate-500 text-sm">Optimiser</span>
                </div>
              </div>
            
              {/* Zone d'upload */}
              <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800 p-8">
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-slate-700 hover:border-violet-500 hover:bg-violet-500/5 rounded-xl p-10 text-center transition-all duration-200 group">
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-all duration-200">
                      <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-white font-semibold text-lg mb-2">Importer un fichier Excel</p>
                    <p className="text-slate-400 text-sm mb-4">Glissez-déposez ou cliquez pour sélectionner</p>
                    <p className="text-slate-600 text-xs">Formats acceptés : .xlsx, .xls</p>
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
              
              {/* Fournisseurs supportés */}
              <div className="mt-6 p-4 bg-slate-900/30 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-3 text-center">Secrétariats sociaux compatibles</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {['Acerta', 'SD Worx', 'Securex', 'Partena', 'Liantis'].map(provider => (
                    <span key={provider} className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full">
                      {provider}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Aide */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => setCurrentPage('demo')}
                  className="inline-flex items-center gap-2 text-slate-400 hover:text-violet-400 text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Voir une démonstration
                </button>
              </div>
            </div>
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
            isViewerOnly={isViewerOnly}
            companyOrder={companyOrder}
            onReorderCompanies={handleReorderCompanies}
            onTimesheetClick={() => setShowTimesheet(true)}
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
          <div className="lg:ml-72 flex-1 flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center shadow-xl">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="font-semibold text-amber-800">🏷️ {pendingAssignments.length} employé(s) sans département</p>
              </div>
              <h3 className="text-2xl font-bold mb-2">{currentAssignment.name}</h3>
              <p className="text-slate-500 mb-6">€{currentAssignment.totalCost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}</p>
              
              {/* Départements existants de l'entreprise */}
              {allDepartments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Départements existants</p>
                  <div className="grid grid-cols-2 gap-2">
                    {allDepartments.map(d => (
                      <button 
                        key={d} 
                        onClick={() => assignDept(d)} 
                        className="p-3 border-2 border-violet-200 bg-violet-50 rounded-xl hover:border-violet-500 hover:bg-violet-100 font-medium transition-all text-violet-800"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Départements suggérés */}
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                  {allDepartments.length > 0 ? 'Ou créer un nouveau' : 'Choisir un département'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_DEPARTMENTS.filter(d => !allDepartments.includes(d)).map(d => (
                    <button 
                      key={d} 
                      onClick={() => assignDept(d)} 
                      className="p-3 border-2 border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 font-medium transition-all"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bouton passer */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => assignDept('Non assigné')} 
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  Passer cet employé →
                </button>
                <button 
                  onClick={() => {
                    // Passer tous les employés restants
                    pendingAssignments.forEach(emp => {
                      if (emp.name !== currentAssignment.name) {
                        // Ne rien faire, laisser sans département
                      }
                    });
                    setPendingAssignments([]);
                    setCurrentAssignment(null);
                    setView('dashboard');
                  }} 
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  Terminer plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Timesheet page
  if (showTimesheet) {
    return (
      <TimesheetPage
        user={user}
        onBack={() => setShowTimesheet(false)}
      />
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
          isViewerOnly={isViewerOnly}
          companyOrder={companyOrder}
          onReorderCompanies={handleReorderCompanies}
          onTimesheetClick={() => { setShowTimesheet(true); setSidebarOpen(false); }}
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
              id="create-company-name"
              name="createCompanyName"
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
      {showImportModal && !isViewerOnly && (
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
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-none sm:m-4">
            {/* Header avec gradient */}
            <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 sm:p-6 text-white relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              </div>
              
              {/* Bouton fermer - positionné en haut à droite */}
              <button 
                onClick={() => {
                  setPendingPeriodSelection(null);
                  setFileQueue([]);
                  setCurrentFileIndex(0);
                }}
                className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="relative pr-10">
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
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base sm:text-lg truncate">
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
            </div>
            
            {/* Contenu */}
            <div className="p-5 sm:p-6">
              {/* Période suggérée */}
              {pendingPeriodSelection.suggestedPeriod && pendingPeriodSelection.suggestedPeriod !== 'Unknown' && (
                <div className={`mb-5 p-4 rounded-2xl flex items-center gap-3 ${
                  pendingPeriodSelection.periodConfidence >= 0.8 
                    ? 'bg-emerald-50 border-2 border-emerald-200' 
                    : 'bg-amber-50 border-2 border-amber-200'
                }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    pendingPeriodSelection.periodConfidence >= 0.8 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base sm:text-lg ${
                      pendingPeriodSelection.periodConfidence >= 0.8 ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {formatPeriod(pendingPeriodSelection.suggestedPeriod)}
                    </p>
                    <p className={`text-xs sm:text-sm ${
                      pendingPeriodSelection.periodConfidence >= 0.8 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {pendingPeriodSelection.periodSource === 'data' ? 'Détectée dans les données' : 
                       pendingPeriodSelection.periodSource === 'filename' ? 'Détectée dans le nom' : 
                       'Suggestion automatique'}
                    </p>
                  </div>
                  {pendingPeriodSelection.periodConfidence >= 0.8 && (
                    <div className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full flex-shrink-0">
                      ✓ Sûr
                    </div>
                  )}
                </div>
              )}

              {/* Sélecteur de période */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {pendingPeriodSelection.suggestedPeriod && pendingPeriodSelection.suggestedPeriod !== 'Unknown' 
                    ? 'Modifier si nécessaire' 
                    : 'Sélectionnez la période'}
                </label>
                <div className="flex gap-2 sm:gap-3">
                  <select 
                    id="period-year"
                    className="flex-1 px-3 sm:px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:bg-white outline-none text-base sm:text-lg font-medium transition-colors"
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
                    className="flex-1 px-3 sm:px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:bg-white outline-none text-sm sm:text-base font-medium transition-colors"
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
              <div className="flex gap-2 sm:gap-3">
                <button 
                  onClick={() => {
                    setPendingPeriodSelection(null);
                    setFileQueue([]);
                    setCurrentFileIndex(0);
                  }}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors text-sm sm:text-base"
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
                    
                    // Déterminer si c'est le dernier fichier du batch
                    const isLastFile = fileQueue.length === 0 || currentFileIndex >= fileQueue.length - 1;
                    const isMultiFileImport = fileQueue.length > 1;
                    
                    if (activeCompany && view === 'dashboard') {
                      // skipSave=true si on est en multi-fichier ET pas le dernier
                      const skipSave = isMultiFileImport && !isLastFile;
                      importToCompanyDirect(activeCompany, result, skipSave);
                      
                      // Si c'est le dernier fichier d'un batch, sauvegarder explicitement
                      if (isMultiFileImport && isLastFile) {
                        console.log('[Salarize] Last file of batch - saving all data now');
                        saveAll(companiesRef.current, activeCompany);
                      }
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
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
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
              
              {/* Bouton Import Rapide en bas - affiché quand confiance haute */}
              {pendingPeriodSelection.periodConfidence >= 0.8 && activeCompany && view === 'dashboard' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowQuickImportModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Import Rapide
                    {fileQueue.length > 1 && (
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        {fileQueue.length} fichiers
                      </span>
                    )}
                  </button>
                  <p className="text-center text-slate-400 text-xs mt-2">
                    Importe tous les fichiers automatiquement
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Rapide - Liste tous les fichiers à importer */}
      {showQuickImportModal && pendingPeriodSelection && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQuickImportModal(false); }}
        >
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-700/50">
            {/* Header avec gradient violet/fuchsia Salarize */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full" />
              </div>
              <div className="relative p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Import Rapide</h3>
                    <p className="text-white/70 text-sm">Importer tous les fichiers en un clic</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Explication */}
            <div className="p-4 bg-violet-500/10 border-b border-violet-500/20">
              <p className="text-violet-300 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong className="text-violet-200">Import automatique:</strong> Les périodes sont détectées automatiquement.
                  Les employés sans département seront placés dans "Non assigné".
                </span>
              </p>
            </div>

            {/* Liste des fichiers */}
            <div className="p-5 max-h-80 overflow-y-auto bg-slate-800/30">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Fichiers à importer ({fileQueue.length > 0 ? fileQueue.length : 1})
              </p>

              <div className="space-y-2">
                {/* Fichier actuel (toujours affiché) */}
                <div className="flex items-center gap-3 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{pendingPeriodSelection.fileName}</p>
                    <p className="text-violet-300 text-sm">
                      {pendingPeriodSelection.employees.length} employés • {formatPeriod(pendingPeriodSelection.suggestedPeriod)}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Prêt
                  </div>
                </div>

                {/* Fichiers restants dans la queue */}
                {fileQueue.slice(currentFileIndex + 1).map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-300 truncate">{file.name}</p>
                      <p className="text-slate-500 text-sm">En attente de traitement</p>
                    </div>
                    <div className="px-2.5 py-1 bg-slate-700 text-slate-400 text-xs font-medium rounded-full">
                      En attente
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 bg-slate-800/80 border-t border-slate-700/50 flex gap-3">
              <button
                onClick={() => setShowQuickImportModal(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowQuickImportModal(false);
                  quickImportFromPending();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Importer {fileQueue.length > 1 ? `${fileQueue.length} fichiers` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Manager Modal */}
      {showDeptManager && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDeptManager(false); setDeptSearchTerm(''); setDeptFilter('all'); }}}
        >
          <div className="min-h-full flex items-start justify-center p-4 pt-8 pb-8">
            <div className="bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-700/50">
              {/* Header avec gradient violet/fuchsia */}
              <div className="relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
                {/* Pattern décoratif */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full" />
                </div>

                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white">Départements</h2>
                      <p className="text-white/70 text-sm mt-1">{activeCompany}</p>
                    </div>
                    <button
                      onClick={() => { setShowDeptManager(false); setDeptSearchTerm(''); setDeptFilter('all'); }}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Stats row - Design moderne */}
                  <div className="flex gap-3 mt-5">
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 flex-1">
                      <p className="text-3xl font-bold text-white">{deptManagerStats.total}</p>
                      <p className="text-xs text-white/70 font-medium">Employés</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 flex-1">
                      <p className="text-3xl font-bold text-white">{deptManagerStats.deptCount}</p>
                      <p className="text-xs text-white/70 font-medium">Départements</p>
                    </div>
                    {deptManagerStats.unassigned > 0 && (
                      <div className="bg-amber-400/20 border border-amber-400/30 backdrop-blur-sm rounded-2xl px-5 py-3 flex-1">
                        <p className="text-3xl font-bold text-amber-300">{deptManagerStats.unassigned}</p>
                        <p className="text-xs text-amber-300/80 font-medium">Non assignés</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Actions & Search */}
              <div className="p-4 bg-slate-800/50 border-b border-slate-700/50">
                {/* Rename department UI */}
                {showRenameDept && (
                  <div className="mb-3 p-4 bg-slate-800 border border-slate-600 rounded-2xl">
                    <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Renommer un département
                    </p>
                    <div className="flex gap-2 mb-3 items-center">
                      <CustomSelect
                        value={renameDeptOld}
                        onChange={setRenameDeptOld}
                        placeholder="Choisir..."
                        className="flex-1"
                        options={[
                          { value: '', label: 'Choisir...' },
                          ...allDepartments.map(dept => ({ value: dept, label: dept }))
                        ]}
                      />
                      <span className="flex items-center text-slate-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        id="rename-dept-new"
                        name="renameDeptNew"
                        placeholder="Nouveau nom..."
                        value={renameDeptNew}
                        onChange={e => setRenameDeptNew(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-violet-500 outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowRenameDept(false); setRenameDeptOld(''); setRenameDeptNew(''); }}
                        className="flex-1 py-2.5 text-sm text-slate-300 hover:bg-slate-700 rounded-xl transition-colors"
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

                          // Mettre à jour createdDepartments si le département renommé y était
                          const updatedCreatedDepts = createdDepartments.map(d => d === renameDeptOld ? renameDeptNew : d);
                          setCreatedDepartments(updatedCreatedDepts);

                          setDepartmentMapping(newMapping);
                          setEmployees(newEmps);

                          const newCompanies = {
                            ...companies,
                            [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping, createdDepartments: updatedCreatedDepts }
                          };
                          setCompanies(newCompanies);
                          saveAll(newCompanies, activeCompany);

                          setShowRenameDept(false);
                          setRenameDeptOld('');
                          setRenameDeptNew('');
                        }}
                        disabled={!renameDeptOld || !renameDeptNew}
                        className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                      >
                        Renommer
                      </button>
                    </div>
                  </div>
                )}

                {/* Merge department UI */}
                {showMergeDept && (
                  <div className="mb-3 p-4 bg-slate-800 border border-purple-500/30 rounded-2xl">
                    <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Fusionner des départements
                    </p>
                    <p className="text-xs text-slate-400 mb-3">Tous les employés du premier département seront déplacés vers le second.</p>
                    <div className="flex gap-2 mb-3 items-center">
                      <CustomSelect
                        value={mergeDeptFrom}
                        onChange={setMergeDeptFrom}
                        placeholder="Fusionner..."
                        className="flex-1"
                        options={[
                          { value: '', label: 'Fusionner...' },
                          ...allDepartments.map(dept => ({ value: dept, label: dept }))
                        ]}
                      />
                      <span className="flex items-center text-slate-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                      <CustomSelect
                        value={mergeDeptTo}
                        onChange={setMergeDeptTo}
                        placeholder="...vers"
                        className="flex-1"
                        options={[
                          { value: '', label: '...vers' },
                          ...allDepartments.filter(d => d !== mergeDeptFrom).map(dept => ({ value: dept, label: dept }))
                        ]}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowMergeDept(false); setMergeDeptFrom(''); setMergeDeptTo(''); }}
                        className="flex-1 py-2.5 text-sm text-slate-300 hover:bg-slate-700 rounded-xl transition-colors"
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

                          // Supprimer le département fusionné de createdDepartments
                          const updatedCreatedDepts = createdDepartments.filter(d => d !== mergeDeptFrom);
                          setCreatedDepartments(updatedCreatedDepts);

                          setDepartmentMapping(newMapping);
                          setEmployees(newEmps);

                          const newCompanies = {
                            ...companies,
                            [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping, createdDepartments: updatedCreatedDepts }
                          };
                          setCompanies(newCompanies);
                          saveAll(newCompanies, activeCompany);

                          setShowMergeDept(false);
                          setMergeDeptFrom('');
                          setMergeDeptTo('');
                        }}
                        disabled={!mergeDeptFrom || !mergeDeptTo}
                        className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Fusionner
                      </button>
                    </div>
                  </div>
                )}

                {!showRenameDept && !showMergeDept && !showCreateDept && !isViewerOnly && (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setShowCreateDept(true)}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Créer
                    </button>

                    <button
                      onClick={() => setShowRenameDept(true)}
                      className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Renommer
                    </button>

                    <button
                      onClick={() => setShowMergeDept(true)}
                      className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Fusionner
                    </button>
                  </div>
                )}

                {/* Message pour les viewers */}
                {isViewerOnly && (
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <p className="text-sm text-amber-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Mode lecture seule - Vous ne pouvez pas modifier les données
                    </p>
                  </div>
                )}

                {/* Create department UI */}
                {showCreateDept && (
                  <div className="mb-3 p-4 bg-slate-800 border border-emerald-500/30 rounded-2xl">
                    <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Créer un nouveau département
                    </p>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        id="new-dept-name"
                        name="newDeptName"
                        placeholder="Nom du département..."
                        value={newDeptName}
                        onChange={e => setNewDeptName(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:border-emerald-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowCreateDept(false); setNewDeptName(''); }}
                        className="flex-1 py-2.5 text-sm text-slate-300 hover:bg-slate-700 rounded-xl transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => {
                          if (!newDeptName.trim()) return;

                          // Ajouter le département à la liste des départements créés manuellement
                          const deptName = newDeptName.trim();
                          if (!createdDepartments.includes(deptName) && !allDepartments.includes(deptName)) {
                            const newCreatedDepts = [...createdDepartments, deptName];
                            setCreatedDepartments(newCreatedDepts);

                            // Sauvegarder dans la société
                            const newCompanies = {
                              ...companies,
                              [activeCompany]: { ...companies[activeCompany], createdDepartments: newCreatedDepts }
                            };
                            setCompanies(newCompanies);
                            saveAll(newCompanies, activeCompany);
                          }
                          toast.success(`Département "${deptName}" créé et disponible pour assignation`);

                          setShowCreateDept(false);
                          setNewDeptName('');
                        }}
                        disabled={!newDeptName.trim()}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                      >
                        Créer
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Le département sera immédiatement disponible dans les listes.</p>
                  </div>
                )}
                
                {/* Bulk assign bar */}
                {selectedEmployees.size > 0 && (
                  <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-violet-300">
                        {selectedEmployees.size} employé{selectedEmployees.size > 1 ? 's' : ''} sélectionné{selectedEmployees.size > 1 ? 's' : ''}
                      </span>
                    </div>
                    <CustomSelect
                      value={bulkAssignDept}
                      onChange={setBulkAssignDept}
                      placeholder="Assigner à..."
                      className="w-44"
                      options={[
                        { value: '', label: 'Assigner à...' },
                        ...allDepartments.map(dept => ({ value: dept, label: dept }))
                      ]}
                    />
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

                        // Retirer le département des createdDepartments s'il y est (il a maintenant des employés)
                        const updatedCreatedDepts = createdDepartments.filter(d => d !== bulkAssignDept);
                        setCreatedDepartments(updatedCreatedDepts);

                        const newCompanies = {
                          ...companies,
                          [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping, createdDepartments: updatedCreatedDepts }
                        };
                        setCompanies(newCompanies);
                        companiesRef.current = newCompanies; // Update ref immediately
                        saveAll(newCompanies, activeCompany);

                        toast.success(`${selectedEmployees.size} employé(s) assigné(s) à ${bulkAssignDept}`);
                        setSelectedEmployees(new Set());
                        setBulkAssignDept('');
                      }}
                      disabled={!bulkAssignDept}
                      className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      Appliquer
                    </button>
                    <button
                      onClick={() => { setSelectedEmployees(new Set()); setBulkAssignDept(''); }}
                      className="p-2 text-violet-400 hover:bg-slate-700 rounded-xl transition-colors"
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
                      id="dept-search"
                      name="deptSearch"
                      placeholder="Rechercher un employé..."
                      value={deptSearchTerm}
                      onChange={e => setDeptSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-violet-500 outline-none transition-all"
                    />
                  </div>

                  <CustomSelect
                    value={deptFilter === 'unassigned' ? 'unassigned' : deptFilter}
                    onChange={setDeptFilter}
                    placeholder="Tous les dép."
                    className="w-44"
                    options={[
                      { value: 'all', label: 'Tous les dép.' },
                      { value: 'unassigned', label: 'Non assignés' },
                      ...allDepartments.map(dept => ({ value: dept, label: dept }))
                    ]}
                  />
                </div>
              </div>
              
              {/* Employee list - Optimisé avec useMemo */}
              <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto bg-slate-800/30" style={{ willChange: 'scroll-position' }}>
                {filteredEmployeesForDept.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-300 font-medium">Aucun employé trouvé</p>
                    <p className="text-slate-500 text-sm mt-1">Essayez de modifier vos filtres</p>
                  </div>
                ) : (
                  <>
                    {/* Select all header */}
                    <div className="flex items-center gap-4 px-5 py-3 bg-slate-800/80 border-b border-slate-700 sticky top-0 backdrop-blur-sm">
                      <input
                        type="checkbox"
                        id="select-all-employees"
                        name="selectAllEmployees"
                        checked={allFilteredEmployeesForDept.length > 0 && allFilteredEmployeesForDept.every(e => selectedEmployees.has(e.name))}
                        ref={el => {
                          if (el) {
                            const allSelected = allFilteredEmployeesForDept.every(e => selectedEmployees.has(e.name));
                            const someSelected = allFilteredEmployeesForDept.some(e => selectedEmployees.has(e.name));
                            el.indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onChange={e => {
                          if (e.target.checked) {
                            // Sélectionner TOUS les employés filtrés (pas juste la page)
                            setSelectedEmployees(new Set([...selectedEmployees, ...allFilteredEmployeesForDept.map(emp => emp.name)]));
                          } else {
                            const newSet = new Set(selectedEmployees);
                            allFilteredEmployeesForDept.forEach(emp => newSet.delete(emp.name));
                            setSelectedEmployees(newSet);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-400 flex-1">
                        {selectedEmployees.size > 0
                          ? `${selectedEmployees.size} sélectionné${selectedEmployees.size > 1 ? 's' : ''}`
                          : `Tout sélectionner (${allFilteredEmployeesForDept.length})`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {deptPage * DEPT_PAGE_SIZE + 1}-{Math.min((deptPage + 1) * DEPT_PAGE_SIZE, allFilteredEmployeesForDept.length)} sur {allFilteredEmployeesForDept.length}
                      </span>
                    </div>

                    {filteredEmployeesForDept.map((emp) => (
                      <div
                        key={emp.name}
                        className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-700/50 transition-colors ${selectedEmployees.has(emp.name) ? 'bg-violet-500/10' : ''}`}
                        style={{ contain: 'layout style paint' }}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          id={`emp-checkbox-${emp.name.replace(/\s+/g, '-')}`}
                          name={`empCheckbox_${emp.name.replace(/\s+/g, '_')}`}
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
                          className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                        />

                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                          emp.currentDept
                            ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-500/20'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{emp.name}</p>
                        </div>

                        <CustomSelect
                          value={emp.currentDept || ''}
                          disabled={isViewerOnly}
                          placeholder="Non assigné"
                          variant={emp.currentDept ? 'default' : 'warning'}
                          className="w-44"
                          options={[
                            { value: '', label: 'Non assigné' },
                            ...allDepartments.map(dept => ({ value: dept, label: dept }))
                          ]}
                          onChange={(newValue) => {
                            if (isViewerOnly) return;
                            const newDept = newValue || null;
                            if (newDept === emp.currentDept) return;

                            const empCost = filtered
                              .filter(em => em.name === emp.name)
                              .reduce((sum, em) => sum + (em.totalCost || 0), 0);

                            setPendingDeptChange({
                              empName: emp.name,
                              oldDept: emp.currentDept,
                              newDept: newDept,
                              empCost: empCost
                            });
                          }}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
              
              {/* Pagination */}
              {deptTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 bg-slate-800/50 border-t border-slate-700/50">
                  <button
                    onClick={() => setDeptPage(p => Math.max(0, p - 1))}
                    disabled={deptPage === 0}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Précédent
                  </button>
                  <span className="text-sm text-slate-400">
                    Page {deptPage + 1} / {deptTotalPages}
                  </span>
                  <button
                    onClick={() => setDeptPage(p => Math.min(deptTotalPages - 1, p + 1))}
                    disabled={deptPage >= deptTotalPages - 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="p-4 bg-slate-800/80 border-t border-slate-700/50">
                <button
                  onClick={() => { setShowDeptManager(false); setDeptSearchTerm(''); setDeptFilter('all'); setSelectedEmployees(new Set()); setBulkAssignDept(''); setDeptPage(0); }}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25"
                >
                  Terminé
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de changement de département */}
      {pendingDeptChange && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setPendingDeptChange(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Confirmer le transfert</h3>
                  <p className="text-white/70 text-sm">Changement de département</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="text-center mb-4">
                <p className="text-slate-800 font-semibold text-lg">{pendingDeptChange.empName}</p>
              </div>

              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  pendingDeptChange.oldDept
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {pendingDeptChange.oldDept || 'Non assigné'}
                </div>
                <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  pendingDeptChange.newDept
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {pendingDeptChange.newDept || 'Non assigné'}
                </div>
              </div>

              {/* Info sur le coût */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-800 text-sm font-medium">Impact sur les statistiques</p>
                    <p className="text-blue-600 text-xs mt-1">
                      Le coût de <strong>€{pendingDeptChange.empCost.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}</strong> sera transféré
                      {pendingDeptChange.oldDept && ` de "${pendingDeptChange.oldDept}"`} vers "{pendingDeptChange.newDept || 'Non assigné'}".
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-slate-500 text-xs text-center">
                Cette action modifiera les statistiques du dashboard.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-5 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setPendingDeptChange(null)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  const { empName, newDept } = pendingDeptChange;
                  console.log(`[Salarize] === DEPARTMENT CHANGE START ===`);
                  console.log(`[Salarize] Employee: ${empName}, New Dept: ${newDept}`);

                  const newMapping = { ...departmentMapping };
                  if (newDept) {
                    newMapping[empName] = newDept;
                  } else {
                    delete newMapping[empName];
                  }
                  console.log(`[Salarize] New mapping for ${empName}:`, newMapping[empName]);

                  const newEmps = employees.map(em =>
                    em.name === empName ? { ...em, department: newDept } : em
                  );
                  console.log(`[Salarize] Updated ${newEmps.filter(e => e.name === empName).length} employee records`);

                  // Retirer le département des createdDepartments s'il y est
                  const updatedCreatedDepts = newDept ? createdDepartments.filter(d => d !== newDept) : createdDepartments;
                  setCreatedDepartments(updatedCreatedDepts);

                  setDepartmentMapping(newMapping);
                  setEmployees(newEmps);

                  const newCompanies = {
                    ...companies,
                    [activeCompany]: { ...companies[activeCompany], employees: newEmps, mapping: newMapping, createdDepartments: updatedCreatedDepts }
                  };
                  setCompanies(newCompanies);
                  companiesRef.current = newCompanies;

                  console.log(`[Salarize] Companies ref updated, mapping entries:`, Object.keys(newCompanies[activeCompany].mapping || {}).length);
                  console.log(`[Salarize] Mapping value for ${empName}:`, newCompanies[activeCompany].mapping?.[empName]);

                  // Fermer le modal IMMÉDIATEMENT
                  setPendingDeptChange(null);
                  toast.success(`${empName} transféré vers ${newDept || 'Non assigné'}`);

                  // Sauvegarder en arrière-plan
                  saveAll(newCompanies, activeCompany).then(() => {
                    console.log(`[Salarize] === DEPARTMENT CHANGE SAVED ===`);
                  });
                }}
                className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="lg:ml-72 pt-4 lg:pt-6 flex-1 p-4 lg:p-6">
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
                        id="company-logo-upload"
                        name="companyLogo"
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{activeCompany}</h1>
                {/* Badge propriétaire ou partagé */}
                {companies[activeCompany]?.isShared ? (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    companies[activeCompany]?.sharedRole === 'editor'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {companies[activeCompany]?.sharedRole === 'editor' ? 'Editeur' : 'Lecture seule'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Proprietaire
                  </span>
                )}
                {!isViewerOnly && (
                  <button
                    onClick={() => setShowCompanySettings(true)}
                    className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                    title="Parametres societe"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
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
                {/* Indicateur de synchronisation */}
                {(isSyncing || saveStatus !== 'saved') && (
                  <>
                    <span className="text-white/30">•</span>
                    {saveStatus === 'pending' && (
                      <span className="flex items-center gap-1.5 text-amber-400" title="Données en attente de synchronisation">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        En attente...
                      </span>
                    )}
                    {(saveStatus === 'saving' || isSyncing) && saveStatus !== 'pending' && (
                      <span className="flex items-center gap-1.5 text-violet-400" title="Synchronisation en cours">
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sync...
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="flex items-center gap-1.5 text-red-400" title="Erreur de synchronisation - données protégées en local">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Erreur sync
                      </span>
                    )}
                  </>
                )}
                {saveStatus === 'saved' && !isSyncing && lastSaved && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="flex items-center gap-1.5 text-emerald-400" title="Données synchronisées">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Synced
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
              
              {/* Share Button - masqué pour les viewers */}
              {!isViewerOnly && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl transition-all text-sm font-medium text-white border border-white/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden sm:inline">Partager</span>
                </button>
              )}

              {/* Invite CEO Button - masqué pour les viewers */}
              {!isViewerOnly && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-xl transition-all text-sm font-medium text-white shadow-lg shadow-violet-500/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span className="hidden sm:inline">Inviter</span>
                </button>
              )}
              
              {/* Settings Menu */}
              <div className="relative group">
                <button className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl transition-colors text-white border border-white/10">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-1.5">
                    {!isViewerOnly && (
                      <button
                        onClick={openManageAccessModal}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm text-slate-700">Gerer les acces</span>
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
        
        {/* KPI Cards - 3 colonnes */}
        <div className="grid grid-cols-3 gap-4 mb-6">
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
            <p className="text-xs text-slate-400 mt-1">~€{filteredPeriodsCount > 0 ? (totalCost / filteredPeriodsCount).toLocaleString('fr-BE', {minimumFractionDigits: 0, maximumFractionDigits: 0}) : 0} / mois</p>
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
            <p className="text-2xl font-bold text-slate-800">{avgEmployeesPerPeriod}</p>
            <p className="text-xs text-slate-400 mt-1">moyenne / mois</p>
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
          </div>
        </div>

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
                        <details key={year} className="bg-slate-50 rounded-lg">
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
                    id="data-manager-import"
                    name="dataImport"
                    accept=".xlsx,.xls"
                    multiple
                    onChange={(e) => { handleFileChange(e); setShowDataManager(false); }}
                    className="hidden" 
                  />
                </label>
                
                {/* Section Sauvegardes */}
                {(() => {
                  const backups = Object.keys(localStorage)
                    .filter(k => k.startsWith(`salarize_backup_${activeCompany}_`))
                    .sort()
                    .reverse()
                    .slice(0, 5);

                  if (backups.length === 0) return null;

                  return (
                    <details className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <summary className="p-3 cursor-pointer flex items-center gap-2 text-emerald-700 font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6" />
                        </svg>
                        Sauvegardes disponibles ({backups.length})
                      </summary>
                      <div className="p-3 pt-0 space-y-2">
                        <p className="text-xs text-slate-500 mb-2">
                          Ces sauvegardes sont créées automatiquement avant chaque modification importante.
                        </p>
                        {backups.map(key => {
                          const backup = JSON.parse(localStorage.getItem(key));
                          const date = new Date(backup?.timestamp || parseInt(key.split('_').pop()));
                          return (
                            <div key={key} className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100">
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {backup?.employeeCount || 0} employés • {backup?.periodCount || 0} périodes
                                </p>
                              </div>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Restaurer cette sauvegarde ? Les données actuelles seront remplacées.`)) return;

                                  const companyId = companies[activeCompany]?.id;

                                  // Restaurer les données
                                  const restoredEmployees = backup.employees.map(e => ({
                                    name: e.name,
                                    department: e.department,
                                    function: e.function,
                                    totalCost: parseFloat(e.total_cost || e.totalCost) || 0,
                                    period: e.period
                                  }));

                                  const restoredPeriods = [...new Set(restoredEmployees.map(e => e.period).filter(Boolean))].sort();

                                  const newCompanies = {
                                    ...companies,
                                    [activeCompany]: {
                                      ...companies[activeCompany],
                                      employees: restoredEmployees,
                                      periods: restoredPeriods,
                                      mapping: backup.mapping || {}
                                    }
                                  };

                                  setCompanies(newCompanies);
                                  companiesRef.current = newCompanies;
                                  setEmployees(restoredEmployees);
                                  setPeriods(restoredPeriods);
                                  setDepartmentMapping(backup.mapping || {});

                                  // Sauvegarder dans Supabase
                                  if (user?.id && companyId) {
                                    try {
                                      // Supprimer les anciens employés
                                      await supabase.from('employees').delete().eq('company_id', companyId);

                                      // Insérer les employés restaurés
                                      if (restoredEmployees.length > 0) {
                                        const employeesToInsert = restoredEmployees.map(e => ({
                                          company_id: companyId,
                                          name: e.name,
                                          department: e.department,
                                          function: e.function,
                                          total_cost: e.totalCost,
                                          period: e.period
                                        }));

                                        const batchSize = 500;
                                        for (let i = 0; i < employeesToInsert.length; i += batchSize) {
                                          await supabase.from('employees').insert(employeesToInsert.slice(i, i + batchSize));
                                        }
                                      }

                                      toast.success(`Sauvegarde restaurée: ${restoredEmployees.length} employés`);
                                    } catch (e) {
                                      console.error('[Salarize] Erreur restauration:', e);
                                      toast.error('Erreur lors de la restauration');
                                    }
                                  } else {
                                    saveToLocalStorage(newCompanies, activeCompany);
                                    toast.success(`Sauvegarde restaurée: ${restoredEmployees.length} employés`);
                                  }

                                  setShowDataManager(false);
                                }}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Restaurer
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })()}

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
                </div>
              </div>
              
              {comparisonData.prevMonth ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">{formatPeriod(comparisonData.current.period)}</span>
                    <span className="font-bold">€{comparisonData.current?.total?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">{formatPeriod(comparisonData.prevMonth.period)}</span>
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
                </div>
              </div>
              
              {comparisonData.sameMonthLastYear ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-violet-200">{formatPeriod(comparisonData.current.period)}</span>
                    <span className="font-bold">€{comparisonData.current?.total?.toLocaleString('fr-BE', { minimumFractionDigits: 2 }) || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-violet-200">{formatPeriod(comparisonData.sameMonthLastYear.period)}</span>
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
            
            {/* Graphique Standard */}
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
          </div>
        )}

        {/* Departments - Version Simple sans scroll */}
        {visibleKpis.deptBreakdown && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">📊 Répartition par Département</h2>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Filtre de période */}
              {periods.length > 1 && (
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="px-2 sm:px-3 py-1 border border-slate-200 rounded-lg bg-white text-xs sm:text-sm"
                >
                  <option value="all">Toutes</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              <span className="text-xs text-slate-400">{sortedDepts.length} dép.</span>
            </div>
          </div>
          
          {/* Header de colonnes */}
          <div className="hidden sm:flex items-center gap-3 py-2 mb-2 border-b border-slate-100 text-xs font-medium text-slate-400">
            <div className="w-32 sm:w-40 flex-shrink-0">Département</div>
            <div className="flex-1">Répartition</div>
            <div className="w-12 text-right">%</div>
            <div className="w-14 text-right">Var.</div>
            <div className="w-24 text-right">Montant</div>
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
        
        {/* Modal Invitation CEO */}
        {showInviteModal && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Inviter un collaborateur</h2>
                      <p className="text-emerald-200 text-sm">Accès au dashboard</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowInviteModal(false)}
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
                  Invitez un CEO ou collaborateur à visualiser les données salariales de <strong>{activeCompany}</strong>. 
                  L'invité doit avoir un compte Salarize pour accéder aux données.
                </p>
                
                {/* Existing invites */}
                {pendingInvites.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">Invitations en attente</p>
                    <div className="space-y-2">
                      {pendingInvites.map((invite, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{invite.email}</p>
                              <p className="text-xs text-slate-500">{invite.role === 'viewer' ? 'Lecteur' : 'Éditeur'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setPendingInvites(pendingInvites.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Email du collaborateur *
                    </label>
                    <input
                      type="email"
                      id="invite-email"
                      name="inviteEmail"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ceo@entreprise.com"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Niveau d'accès
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setInviteRole('viewer')}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          inviteRole === 'viewer' 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <svg className={`w-4 h-4 ${inviteRole === 'viewer' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className={`font-medium ${inviteRole === 'viewer' ? 'text-emerald-700' : 'text-slate-700'}`}>Lecteur</span>
                        </div>
                        <p className="text-xs text-slate-500">Peut visualiser les données</p>
                      </button>
                      <button
                        onClick={() => setInviteRole('editor')}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          inviteRole === 'editor' 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <svg className={`w-4 h-4 ${inviteRole === 'editor' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className={`font-medium ${inviteRole === 'editor' ? 'text-emerald-700' : 'text-slate-700'}`}>Éditeur</span>
                        </div>
                        <p className="text-xs text-slate-500">Peut modifier les données</p>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700">
                      L'invité recevra un email avec un lien pour accéder au dashboard. 
                      Il devra créer un compte ou se connecter pour voir les données.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={sendInvitation}
                  disabled={!inviteEmail || sendingInvite}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingInvite ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Envoyer l'invitation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Gestion des Accès */}
        {showManageAccessModal && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) { cancelPendingChanges(); setShowManageAccessModal(false); } }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Gestion des acces</h2>
                      <p className="text-violet-200 text-sm">{activeCompany}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { cancelPendingChanges(); setShowManageAccessModal(false); }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Propriétaire */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Proprietaire</h3>
                  <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{user?.name || 'Vous'}</p>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                    <span className="px-3 py-1 bg-violet-500 text-white text-xs font-medium rounded-full">
                      Proprietaire
                    </span>
                  </div>
                </div>

                {/* Collaborateurs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Collaborateurs</h3>
                    <button
                      onClick={() => { cancelPendingChanges(); setShowManageAccessModal(false); setShowInviteModal(true); }}
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Inviter
                    </button>
                  </div>

                  {loadingInvitations ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="w-6 h-6 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : companyInvitations.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl">
                      <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-slate-500 text-sm">Aucun collaborateur invite</p>
                      <button
                        onClick={() => { cancelPendingChanges(); setShowManageAccessModal(false); setShowInviteModal(true); }}
                        className="mt-3 text-violet-600 hover:text-violet-700 text-sm font-medium"
                      >
                        Inviter un collaborateur
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {companyInvitations.map((invitation) => {
                        const currentRole = pendingRoleChanges[invitation.id] || invitation.role;
                        const currentName = inviteDisplayNames[invitation.id] ?? invitation.display_name ?? '';
                        const hasRoleChange = pendingRoleChanges[invitation.id] && pendingRoleChanges[invitation.id] !== invitation.role;
                        const hasNameChange = inviteDisplayNames[invitation.id] !== undefined && inviteDisplayNames[invitation.id] !== (invitation.display_name || '');

                        return (
                          <div key={invitation.id} className={`p-3 rounded-xl transition-all ${
                            hasRoleChange || hasNameChange ? 'bg-amber-50 border-2 border-amber-300' : 'bg-slate-50'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                                invitation.status === 'accepted' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}>
                                {(currentName || invitation.invited_email)?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Champ de nom éditable */}
                                {editingInviteName === invitation.id ? (
                                  <input
                                    type="text"
                                    value={currentName}
                                    onChange={(e) => setInviteDisplayNames(prev => ({ ...prev, [invitation.id]: e.target.value }))}
                                    onBlur={() => setEditingInviteName(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingInviteName(null)}
                                    placeholder="Nom d'affichage..."
                                    className="w-full px-2 py-1 text-sm border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    autoFocus
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-800 truncate">
                                      {currentName || invitation.invited_email}
                                    </p>
                                    <button
                                      onClick={() => setEditingInviteName(invitation.id)}
                                      className="p-1 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded transition-colors"
                                      title="Renommer"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                                <p className="text-xs text-slate-500">
                                  {currentName && <span className="text-slate-400">{invitation.invited_email} • </span>}
                                  {invitation.status === 'accepted' ? (
                                    <span className="text-emerald-600">Acceptee</span>
                                  ) : (
                                    <span className="text-amber-600">En attente</span>
                                  )}
                                  {' • '}
                                  {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>

                              {/* Sélecteur de rôle */}
                              <select
                                value={currentRole}
                                onChange={(e) => stageRoleChange(invitation.id, e.target.value)}
                                disabled={updatingRole === 'all'}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                                  currentRole === 'editor'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-slate-100 border-slate-200 text-slate-700'
                                } ${hasRoleChange ? 'ring-2 ring-amber-400' : ''}`}
                              >
                                <option value="viewer">Lecteur</option>
                                <option value="editor">Editeur</option>
                              </select>

                              {/* Bouton révoquer */}
                              <button
                                onClick={() => revokeInvitation(invitation.id, invitation.invited_email)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Revoquer l'acces"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            {/* Indicateur de modification */}
                            {(hasRoleChange || hasNameChange) && (
                              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                                </svg>
                                Modification en attente
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer avec boutons de confirmation */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                {hasPendingChanges ? (
                  <div className="flex gap-3">
                    <button
                      onClick={cancelPendingChanges}
                      className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={applyPendingChanges}
                      disabled={updatingRole === 'all'}
                      className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {updatingRole === 'all' ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Confirmer les modifications
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowManageAccessModal(false)}
                    className="w-full py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium transition-colors"
                  >
                    Fermer
                  </button>
                )}
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
