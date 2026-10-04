import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageView } from '../types';

interface SpecialtiesSectionProps {
  onOpenBooking: () => void;
  onNavigate?: (page: PageView) => void;
}

export const SpecialtiesSection: React.FC<SpecialtiesSectionProps> = ({ onOpenBooking, onNavigate }) => {
  const { t } = useLanguage();

  return (
    <section id="areas" className="py-6 sm:py-8 lg:py-10 bg-slate-50/70 border-y border-slate-100 scroll-mt-20 lg:scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-5 sm:mb-6 lg:mb-7">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">
            {t.specialties.tag}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight text-balance">
            {t.specialties.title}
          </h2>
          <p className="text-slate-600 mt-2 sm:mt-2.5 text-sm sm:text-base leading-relaxed">
            {t.specialties.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 lg:gap-6">
          {t.specialties.items.map((spec) => (
            <div
              key={spec.title}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between hover:border-blue-300 hover:shadow-lg transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded">
                    {spec.badge}
                  </span>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
                  {spec.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 sm:mb-5">
                  {spec.description}
                </p>

                <div className="space-y-2 mb-4 sm:mb-5">
                  {spec.benefits.map((b) => (
                    <div key={b} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  {spec.tagline}
                </span>
                <button
                  onClick={onOpenBooking}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  {t.specialties.scheduleBtn}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Areas Page Action */}
        {onNavigate && (
          <div className="mt-6 sm:mt-8 text-center">
            <button
              onClick={() => onNavigate('areas')}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs hover:shadow cursor-pointer"
            >
              <span>Explorar Todas as Áreas Clínicas de Alto Valor</span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
