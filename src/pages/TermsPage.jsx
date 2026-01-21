import React from 'react';
import Footer from '../components/layout/Footer';

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

        <h1 className="text-4xl font-bold text-white mb-4">Conditions Generales d'Utilisation</h1>
        <p className="text-slate-400 mb-8">Derniere mise a jour : {new Date().toLocaleDateString('fr-BE')}</p>

        <div className="space-y-8">
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 1 - Objet</h2>
            <p className="text-slate-400 text-sm">
              Les presentes conditions generales d'utilisation (CGU) ont pour objet de definir les modalites d'acces et d'utilisation de la plateforme Salarize, accessible a l'adresse salarize.be, editee par Salarize SPRL.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 2 - Acces au service</h2>
            <p className="text-slate-400 text-sm">
              L'acces au service necessite la creation d'un compte utilisateur. L'utilisateur s'engage a fournir des informations exactes et a les maintenir a jour. Le service est accessible 24h/24, 7j/7, sauf en cas de force majeure ou de maintenance.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 3 - Description du service</h2>
            <p className="text-slate-400 text-sm">
              Salarize est une plateforme d'analyse des couts salariaux permettant aux entreprises d'importer leurs donnees de paie, de les visualiser sous forme de tableaux de bord et de generer des rapports. Le service est fourni "tel quel" sans garantie d'adequation a un usage particulier.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 4 - Tarification</h2>
            <p className="text-slate-400 text-sm">
              Les tarifs en vigueur sont disponibles sur la page Tarifs du site. Les prix sont indiques en euros, hors TVA. La TVA belge (21%) sera appliquee. Les tarifs peuvent etre modifies a tout moment, les utilisateurs en seront informes avec un preavis de 30 jours.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 5 - Propriete des donnees</h2>
            <p className="text-slate-400 text-sm">
              L'utilisateur reste proprietaire des donnees qu'il importe sur la plateforme. Salarize s'engage a ne pas utiliser ces donnees a d'autres fins que la fourniture du service. En cas de resiliation, l'utilisateur peut exporter ses donnees pendant une periode de 30 jours.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 6 - Responsabilites</h2>
            <p className="text-slate-400 text-sm">
              L'utilisateur est responsable de l'utilisation qu'il fait du service et des donnees qu'il y importe. Salarize ne saurait etre tenu responsable des dommages indirects resultant de l'utilisation du service. La responsabilite de Salarize est limitee au montant des sommes versees par l'utilisateur au cours des 12 derniers mois.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 7 - Resiliation</h2>
            <p className="text-slate-400 text-sm">
              L'utilisateur peut resilier son compte a tout moment depuis les parametres de son compte. En cas de manquement aux presentes CGU, Salarize se reserve le droit de suspendre ou resilier le compte de l'utilisateur sans preavis.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Article 8 - Droit applicable</h2>
            <p className="text-slate-400 text-sm">
              Les presentes CGU sont soumises au droit belge. Tout litige relatif a l'interpretation ou a l'execution des presentes sera soumis aux tribunaux de Bruxelles.
            </p>
          </section>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

export default TermsPage;
