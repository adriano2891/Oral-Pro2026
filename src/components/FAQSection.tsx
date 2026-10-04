import React, { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageView } from '../types';

interface FAQSectionProps {
  onOpenBooking: () => void;
  onOpenChat: () => void;
  onNavigate?: (page: PageView) => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onOpenBooking, onOpenChat, onNavigate }) => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-6 sm:py-8 lg:py-10 bg-white border-t border-slate-100 scroll-mt-20 lg:scroll-mt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-5 sm:mb-6 lg:mb-7">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">
            {t.faq.tag}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight text-balance">
            {t.faq.title}
          </h2>
          <p className="text-slate-600 mt-2 sm:mt-2.5 text-sm sm:text-base leading-relaxed">
            {t.faq.subtitle}
          </p>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {t.faq.items.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full py-3.5 px-4 sm:py-4 sm:px-5 text-left flex items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-semibold text-slate-900">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 sm:mt-8 text-center p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-sm font-bold text-slate-900">
              {t.faq.bannerTitle}
            </h4>
            <p className="text-xs text-slate-500">
              {t.faq.bannerSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate('duvidas')}
                className="text-xs font-semibold text-slate-800 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Todas as Dúvidas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpenChat}
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white border border-slate-200 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.faq.chatBtn}
            </button>
            <button
              onClick={onOpenBooking}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.faq.bookBtn}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
