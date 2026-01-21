import React from 'react';
import Footer from '../components/layout/Footer';

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

        <h1 className="text-4xl font-bold text-white mb-4">Mentions Legales</h1>
        <p className="text-slate-400 mb-8">Conformement a la loi belge du 11 mars 2003</p>

        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">1. Editeur du site</h2>
            <p className="text-slate-400 text-sm">
              <strong className="text-slate-300">Salarize</strong><br /><br />
              Responsable de la publication : Mohamed El Abdouni<br />
              Email : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a><br /><br />
              Salarize est un projet personnel developpe en Belgique.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">2. Hebergement</h2>
            <p className="text-slate-400 text-sm">
              <strong className="text-slate-300">Hebergeur du site web :</strong><br />
              Vercel Inc.<br />
              440 N Barranca Ave #4133<br />
              Covina, CA 91723, Etats-Unis<br />
              <a href="https://vercel.com" className="text-violet-400 hover:text-violet-300">https://vercel.com</a><br /><br />

              <strong className="text-slate-300">Hebergeur de la base de donnees :</strong><br />
              Supabase Inc.<br />
              970 Toa Payoh North #07-04<br />
              Singapore 318992<br />
              <a href="https://supabase.com" className="text-violet-400 hover:text-violet-300">https://supabase.com</a>
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">3. Propriete intellectuelle</h2>
            <p className="text-slate-400 text-sm">
              L'ensemble des elements constituant le site Salarize (textes, graphismes, logiciels, photographies, images, videos, sons, plans, noms, logos, marques, creations et oeuvres protegeables diverses, bases de donnees, etc.) ainsi que le site lui-meme, relevent des legislations belges et internationales sur le droit d'auteur et la propriete intellectuelle.<br /><br />

              Ces elements sont la propriete exclusive de Salarize. La reproduction ou representation, integrale ou partielle, des pages, des donnees et de tout autre element constitutif du site, par quelque procede ou support que ce soit, est interdite et constitue, sans autorisation expresse et prealable de Salarize, une contrefacon sanctionnee par les articles XI.293 et suivants du Code de droit economique belge.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">4. Limitation de responsabilite</h2>
            <p className="text-slate-400 text-sm">
              Les informations contenues sur ce site sont aussi precises que possible et le site est periodiquement mis a jour, mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes.<br /><br />

              Salarize ne pourra etre tenu responsable des dommages directs ou indirects resultant de l'acces au site ou de l'utilisation du site et/ou des informations disponibles sur ce site, sauf en cas de faute intentionnelle ou de faute lourde.<br /><br />

              Les donnees importees par l'utilisateur restent sous sa responsabilite exclusive. Salarize n'est pas responsable de l'exactitude des donnees salariales importees.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">5. Droit applicable et juridiction</h2>
            <p className="text-slate-400 text-sm">
              Les presentes mentions legales sont regies par le droit belge. En cas de litige et a defaut d'accord amiable, le litige sera porte devant les tribunaux belges conformement aux regles de competence en vigueur.<br /><br />

              <strong className="text-slate-300">Pour les consommateurs residant dans l'UE :</strong><br />
              Conformement a l'article 14 du Reglement (UE) n524/2013, la Commission Europeenne met a disposition une plateforme de Reglement en Ligne des Litiges :<br />
              <a href="https://ec.europa.eu/consumers/odr" className="text-violet-400 hover:text-violet-300">https://ec.europa.eu/consumers/odr</a>
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">6. Contact</h2>
            <p className="text-slate-400 text-sm">
              Pour toute question relative aux presentes mentions legales ou pour toute demande concernant le site, vous pouvez nous contacter :<br /><br />
              Email : <a href="mailto:elabdounimohamed144@gmail.com" className="text-violet-400 hover:text-violet-300">elabdounimohamed144@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}

export default LegalPage;
