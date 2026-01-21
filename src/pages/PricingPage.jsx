import React, { useState } from 'react';
import { PRICING_PLANS } from '../constants';
import Footer from '../components/layout/Footer';

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
              Choisissez le plan qui correspond a vos besoins. Evoluez quand vous voulez.
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
                    EUR{annual && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                {annual && plan.price > 0 && (
                  <p className="text-emerald-400 text-sm mt-1">
                    Economisez EUR{Math.round(plan.price * 12 * 0.2)}/an
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
            Contactez-nous
          </a>
        </div>
      </div>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

export default PricingPage;
