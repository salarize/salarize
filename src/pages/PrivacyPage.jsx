import React from 'react';
import Footer from '../components/layout/Footer';

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

        <h1 className="text-4xl font-bold text-white mb-4">Politique de Confidentialite</h1>
        <p className="text-slate-400 mb-8">Derniere mise a jour : {new Date().toLocaleDateString('fr-BE')}</p>

        <div className="space-y-8">
          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">1. Responsable du traitement</h2>
            <p className="text-slate-400 text-sm">
              Mohamed El Abdouni, responsable du projet Salarize, est responsable du traitement de vos donnees personnelles conformement au Reglement General sur la Protection des Donnees (RGPD - Reglement UE 2016/679) et a la loi belge du 30 juillet 2018 relative a la protection des personnes physiques a l'egard des traitements de donnees a caractere personnel.<br /><br />
              Contact : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">2. Donnees collectees</h2>
            <p className="text-slate-400 text-sm mb-4">Nous collectons les donnees suivantes :</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span><strong className="text-slate-300">Donnees d'identification :</strong> nom, prenom, adresse email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span><strong className="text-slate-300">Donnees professionnelles :</strong> nom de societe, donnees salariales importees</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span><strong className="text-slate-300">Donnees techniques :</strong> adresse IP, type de navigateur, donnees de connexion</span>
              </li>
            </ul>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">3. Finalites du traitement</h2>
            <p className="text-slate-400 text-sm mb-4">Vos donnees sont traitees pour :</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>La fourniture et la gestion de nos services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>La creation et la gestion de votre compte utilisateur</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>L'amelioration de nos services et de l'experience utilisateur</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">*</span>
                <span>Le respect de nos obligations legales</span>
              </li>
            </ul>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4. Base legale</h2>
            <p className="text-slate-400 text-sm">
              Le traitement de vos donnees repose sur : l'execution du contrat (fourniture du service), votre consentement (newsletter, cookies), notre interet legitime (amelioration des services), et le respect de nos obligations legales.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">5. Duree de conservation</h2>
            <p className="text-slate-400 text-sm">
              Vos donnees sont conservees pendant la duree de votre utilisation du service, puis pendant une duree de 3 ans apres la cloture de votre compte, sauf obligation legale de conservation plus longue.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">6. Vos droits</h2>
            <p className="text-slate-400 text-sm mb-4">Conformement au RGPD, vous disposez des droits suivants :</p>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">OK</span>
                <span>Droit d'acces a vos donnees personnelles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">OK</span>
                <span>Droit de rectification des donnees inexactes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">OK</span>
                <span>Droit a l'effacement ("droit a l'oubli")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">OK</span>
                <span>Droit a la portabilite de vos donnees</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">OK</span>
                <span>Droit d'opposition et de limitation du traitement</span>
              </li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              Pour exercer vos droits : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">7. Autorite de controle</h2>
            <p className="text-slate-400 text-sm">
              Vous pouvez introduire une reclamation aupres de l'Autorite de Protection des Donnees (APD) :<br /><br />
              <strong className="text-slate-300">Autorite de protection des donnees</strong><br />
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

export default PrivacyPage;
