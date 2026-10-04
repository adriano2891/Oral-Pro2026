import React from 'react';
import { Target, Users, BarChart3, CheckCircle2, Calendar, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSiteContent } from '../context/SiteContentContext';
import { PageView } from '../types';

interface ServicesPageProps {
  onOpenBooking: () => void;
  onOpenChat: () => void;
  onNavigate?: (page: PageView) => void;
}

const SERVICE_SLOT_KEYS = [
  'services_implantologia',
  'services_ortodontia',
  'services_estetica',
];

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenBooking, onOpenChat, onNavigate }) => {
  const { t } = useLanguage();
  const { getSlot } = useSiteContent();
  const icons = [Target, Users, BarChart3];

  return (
    <div className="py-6 sm:py-8 lg:py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        {onNavigate && (
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4 sm:mb-5 font-medium">
            <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {t.nav.home}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">{t.nav.services}</span>
          </nav>
        )}

        {/* Header */}
        <div className="max-w-3xl mb-5 sm:mb-7">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">
            {t.services.tag}
          </p>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight text-balance">
            {t.services.title}
          </h1>
          <p className="text-slate-600 mt-2.5 sm:mt-3 text-sm sm:text-base lg:text-lg leading-relaxed">
            {t.services.subtitle}
          </p>
        </div>

        {/* Detailed Services Sections */}
        <div className="space-y-4 sm:space-y-5">
          {t.services.serviceList.map((service, idx) => {
            const Icon = icons[idx] || Target;
            const isAlternate = idx % 2 !== 0;

            return (
              <div
                key={service.number}
                className={`p-5 sm:p-6 lg:p-7 rounded-2xl border border-slate-200 ${
                  isAlternate ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                <div className="grid lg:grid-cols-12 gap-5 lg:gap-7">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.services.tag} · {service.number}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {service.title}
                    </h2>

                    <p className="text-sm text-slate-700 leading-relaxed">
                      {service.whatItIs}
                    </p>

                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {t.services.routineIntegration}:
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-600">
                        {service.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div
                    className={`lg:col-span-5 p-6 rounded-xl border border-slate-200 flex flex-col justify-between ${
                      isAlternate ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <div>
                      {(() => {
                        const slot = getSlot(SERVICE_SLOT_KEYS[idx] || '');
                        if (!slot.imageUrl) return null;
                        return (
                          <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                            <img
                              src={slot.imageUrl}
                              alt={slot.altText || service.title}
                              className={`w-full ${
                                slot.aspectRatio === '1:1'
                                  ? 'aspect-square'
                                  : slot.aspectRatio === '16:9'
                                  ? 'aspect-[16/9]'
                                  : 'aspect-[4/3]'
                              } ${slot.fit === 'contain' ? 'object-contain' : 'object-cover'} ${
                                slot.position === 'top'
                                  ? 'object-top'
                                  : slot.position === 'bottom'
                                  ? 'object-bottom'
                                  : 'object-center'
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        );
                      })()}

                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                        {t.services.forWhomLabel}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {service.whoIsItFor}
                      </p>

                      <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
                        {t.services.howHelpsLabel}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed mb-4">
                        {service.howItHelps}
                      </p>
                    </div>

                    <button
                      onClick={onOpenBooking}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{t.common.scheduleMeeting}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
