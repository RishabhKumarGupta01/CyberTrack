import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background flex flex-col select-none overflow-x-hidden relative">
      {/* Indian Tricolor Header Strip */}
      <div className="h-2 w-full flex shrink-0 z-50">
        <div className="flex-1 bg-secondary"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-tertiary"></div>
      </div>

      {/* Official Government Banner */}
      <div className="w-full bg-white border-b border-outline-variant px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-40">
        <img 
          src="/sahyog_banner.png" 
          alt="Sahyog Portal - Ministry of Home Affairs" 
          className="h-14 sm:h-16 md:h-20 object-contain"
        />
        <button
          onClick={() => navigate('/login')}
          className="btn-primary text-sm px-6 py-2.5 rounded-lg font-bold uppercase tracking-wider shadow-md flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">shield_person</span>
          Secure Login
        </button>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Image: Parliament & Flag */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.25] z-0"
          style={{ 
            backgroundImage: 'url("/parliament_bg.jpg")',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover'
          }}
        />

        <div className="relative z-10 w-full max-w-[800px] mx-auto pt-12 pb-24 px-6 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-8 bg-surface-container/90 backdrop-blur-sm p-4 rounded-2xl border border-outline-variant shadow-sm w-max mx-auto">
            <span className="material-symbols-outlined text-[32px] text-primary">gavel</span>
            <h2 className="text-2xl font-bold text-on-surface uppercase tracking-wide">
              Cyber Crime & Crypto Regulations
            </h2>
          </div>

          <div className="space-y-6 w-full mb-12">
            {/* IT Act */}
            <div className="bg-surface/90 backdrop-blur-md p-6 rounded-2xl border border-outline-variant shadow-md hover:border-primary/50 transition-colors">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">policy</span>
                Information Technology Act, 2000
              </h3>
              <ul className="text-sm text-on-surface-variant space-y-3 list-disc list-inside font-medium leading-relaxed">
                <li><strong className="text-on-surface">Section 43:</strong> Penalty and compensation for damage to computer, computer system, etc.</li>
                <li><strong className="text-on-surface">Section 66:</strong> Computer related offenses including cryptocurrency theft and unauthorized access.</li>
                <li><strong className="text-on-surface">Section 66C & 66D:</strong> Punishment for identity theft and cheating by personation using computer resources.</li>
              </ul>
            </div>

            {/* PMLA & CERT-In */}
            <div className="bg-surface/90 backdrop-blur-md p-6 rounded-2xl border border-outline-variant shadow-md hover:border-primary/50 transition-colors">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">account_balance</span>
                Virtual Digital Assets (VDA) Directives
              </h3>
              <ul className="text-sm text-on-surface-variant space-y-3 list-disc list-inside font-medium leading-relaxed">
                <li><strong className="text-on-surface">PMLA, 2002 Compliance:</strong> All crypto exchanges and VDA service providers must adhere to KYC/AML norms and report suspicious transactions to FIU-IND.</li>
                <li><strong className="text-on-surface">CERT-In Directives (April 2022):</strong> Mandatory reporting of severe cyber incidents within 6 hours. VDA service providers must maintain KYC details and financial transaction records for 5 years.</li>
              </ul>
            </div>

            {/* BNS */}
            <div className="bg-surface/90 backdrop-blur-md p-6 rounded-2xl border border-outline-variant shadow-md hover:border-primary/50 transition-colors">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">local_police</span>
                Bharatiya Nyaya Sanhita (BNS)
              </h3>
              <ul className="text-sm text-on-surface-variant space-y-3 list-disc list-inside font-medium leading-relaxed">
                <li>Applicable sections for cheating, fraud, and criminal conspiracy involving digital assets and financial swindling.</li>
              </ul>
            </div>
          </div>

          <p className="mt-4 text-xs text-on-surface-variant font-mono text-center bg-surface-container/80 px-4 py-1.5 rounded-full shadow-sm">
            Authorized Nodal Officers & Law Enforcement Agencies Only
          </p>
        </div>
      </div>
    </div>
  );
};
