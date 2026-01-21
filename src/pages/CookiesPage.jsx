import React from 'react';
import Footer from '../components/layout/Footer';

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
        <p className="text-slate-400 mb-8">Derniere mise a jour : {new Date().toLocaleDateString('fr-BE')}</p>

        <div className="space-y-6">
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-slate-400 text-sm">
              Un cookie est un petit fichier texte depose sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site web. Il permet au site de memoriser des informations sur votre visite, comme votre langue preferee et d'autres parametres. Cela peut faciliter votre prochaine visite et rendre le site plus utile pour vous.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">2. Les cookies que nous utilisons</h2>
            <p className="text-slate-400 text-sm mb-4">Salarize utilise les categories de cookies suivantes :</p>

            <div className="space-y-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  Cookies strictement necessaires
                </h3>
                <p className="text-slate-400 text-sm">
                  Ces cookies sont indispensables pour naviguer sur le site et utiliser ses fonctionnalites. Ils permettent notamment de maintenir votre session de connexion active. Sans ces cookies, le site ne peut pas fonctionner correctement.
                </p>
                <p className="text-slate-500 text-xs mt-2">Exemple : cookie de session d'authentification (Supabase)</p>
              </div>

              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Cookies de fonctionnalite
                </h3>
                <p className="text-slate-400 text-sm">
                  Ces cookies permettent de memoriser vos preferences (societe active, affichage du dashboard, filtres selectionnes) pour personnaliser votre experience sur le site.
                </p>
                <p className="text-slate-500 text-xs mt-2">Exemple : preferences d'affichage, tutoriel vu</p>
              </div>

              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  Cookies analytiques (optionnels)
                </h3>
                <p className="text-slate-400 text-sm">
                  Actuellement, Salarize n'utilise pas de cookies analytiques ou de tracking tiers. Nous ne partageons aucune donnee avec des services d'analyse externes.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">3. Duree de conservation</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 text-slate-300">Cookie</th>
                    <th className="text-left py-3 text-slate-300">Finalite</th>
                    <th className="text-left py-3 text-slate-300">Duree</th>
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
                    <td className="py-3">Tutoriel complete</td>
                    <td className="py-3">Permanent</td>
                  </tr>
                  <tr>
                    <td className="py-3">salarize_preferences</td>
                    <td className="py-3">Preferences utilisateur</td>
                    <td className="py-3">1 an</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4. Gestion des cookies</h2>
            <p className="text-slate-400 text-sm mb-4">
              Vous pouvez a tout moment modifier vos preferences en matiere de cookies. La plupart des navigateurs vous permettent de :
            </p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>Voir les cookies stockes et les supprimer individuellement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>Bloquer les cookies tiers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>Bloquer tous les cookies d'un site particulier</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>Supprimer tous les cookies a la fermeture du navigateur</span>
              </li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              <strong className="text-slate-300">Attention :</strong> Si vous desactivez les cookies necessaires, certaines fonctionnalites du site pourraient ne plus etre disponibles (notamment la connexion a votre compte).
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">5. Comment gerer les cookies dans votre navigateur</h2>
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
              Pour toute question relative a notre utilisation des cookies, vous pouvez nous contacter a :<br /><br />
              <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

export default CookiesPage;
