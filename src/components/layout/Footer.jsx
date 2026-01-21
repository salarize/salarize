import React from 'react';

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
              La solution belge pour analyser et optimiser vos couts salariaux.
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
              <li><button onClick={() => setCurrentPage('features')} className="text-slate-400 hover:text-white text-sm transition-colors">Fonctionnalites</button></li>
              <li><button onClick={() => setCurrentPage('pricing')} className="text-slate-400 hover:text-white text-sm transition-colors">Tarifs</button></li>
              <li><button onClick={() => setCurrentPage('demo')} className="text-slate-400 hover:text-white text-sm transition-colors">Demo</button></li>
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
              <li><button onClick={() => setCurrentPage('demo')} className="text-slate-400 hover:text-white text-sm transition-colors">Guide de demarrage</button></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><button onClick={() => setCurrentPage('privacy')} className="text-slate-400 hover:text-white text-sm transition-colors">Politique de confidentialite</button></li>
              <li><button onClick={() => setCurrentPage('terms')} className="text-slate-400 hover:text-white text-sm transition-colors">Conditions generales</button></li>
              <li><button onClick={() => setCurrentPage('legal')} className="text-slate-400 hover:text-white text-sm transition-colors">Mentions legales</button></li>
              <li><button onClick={() => setCurrentPage('cookies')} className="text-slate-400 hover:text-white text-sm transition-colors">Politique cookies</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Salarize. Tous droits reserves. Made with love in Belgium
          </p>
          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <span>Belgique</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
