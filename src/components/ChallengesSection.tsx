import React from 'react';
import { PhoneMissed, EyeOff, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ChallengesSectionProps {
  onOpenBooking: () => void;
}

export const ChallengesSection: React.FC<ChallengesSectionProps> = ({ onOpenBooking }) => {
  const { t } = useLanguage();
  const icons = [PhoneMissed, EyeOff, AlertCircle];

  return (
    <section id="desafios" className="py-6 sm:py-8 lg:py-10 bg-slate-50/50 border-t border-slate-100 scroll-mt-20 lg:scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-5 sm:mb-6 lg:mb-7">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">
            {t.challenges.tag}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight text-balance">
            {t.challenges.title}
          </h2>
          <p className="text-slate-600 mt-2 sm:mt-2.5 text-sm sm:text-base leading-relaxed">
            {t.challenges.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {t.challenges.items.map((c, idx) => {
            const Icon = icons[idx] || PhoneMissed;
            return (
              <div
                key={c.title}
                className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3.5 sm:mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
                    {c.subtitle}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 mb-2">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 sm:mt-5 sm:pt-3.5 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500">
                    <strong className="text-blue-700 font-semibold">OralPro:</strong> {c.solution}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 sm:mt-8 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div>
            <h4 className="text-base sm:text-lg font-bold text-slate-900">
              {t.challenges.ctaBannerTitle}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {t.challenges.ctaBannerSubtitle}
            </p>
          </div>
          <button
            onClick={onOpenBooking}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 sm:py-3 rounded-lg shadow-sm whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          >
            <span>{t.challenges.ctaBannerButton}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
