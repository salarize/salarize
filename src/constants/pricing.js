// Plans tarifaires
export const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 0,
    period: 'Gratuit',
    description: 'Pour decouvrir Salarize',
    features: [
      '1 societe',
      '10 employes max',
      '3 mois d\'historique',
      'Export PDF basique',
      'Support email'
    ],
    notIncluded: [
      'Export Excel',
      'Multi-societes',
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
      '5 societes',
      'Employes illimites',
      'Historique illimite',
      'Export PDF & Excel',
      'Logo personnalise',
      'Comparaisons avancees',
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
      'Societes illimitees',
      'Employes illimites',
      'Historique illimite',
      'Export PDF & Excel',
      'Logo personnalise',
      'Comparaisons avancees',
      'API Access',
      'SSO / SAML',
      'Account Manager dedie',
      'Formation incluse'
    ],
    notIncluded: [],
    cta: 'Contacter les ventes',
    popular: false
  }
];
