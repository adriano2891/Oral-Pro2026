import React from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSiteContent } from '../context/SiteContentContext';
import { PageView } from '../types';
import { InstagramGallerySection } from './InstagramGallerySection';

interface AboutPageProps {
  onOpenBooking: () => void;
  onNavigate?: (page: PageView) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onOpenBooking, onNavigate }) => {
  const { t } = useLanguage();
  const { getSlot } = useSiteContent();

  const founderSlot = getSlot(
    'about_founder',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    'Mario Provenzano - OralPro'
  );

  const masterclassSlot = getSlot(
    'about_masterclass',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    'Masterclass with Partnered Clinicians'
  );

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
            <span className="text-slate-900 font-semibold">{t.nav.about}</span>
          </nav>
        )}

        {/* Header */}
        <div className="max-w-3xl mb-6 sm:mb-8">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">
            {t.about.tag}
          </p>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight text-balance">
            {t.about.title}
          </h1>
          <p className="text-slate-600 mt-2.5 sm:mt-3 text-sm sm:text-base leading-relaxed">
            {t.about.p1}
          </p>
        </div>

        {/* Narrative & Visuals */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start mb-8 sm:mb-10">
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t.about.integrityTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              {t.about.p2}
            </p>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>OralPro Core Standards</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.about.integrityText}
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
              <img
                src={founderSlot.imageUrl}
                alt={founderSlot.altText}
                className={`w-full ${
                  founderSlot.aspectRatio === '1:1'
                    ? 'aspect-square'
                    : founderSlot.aspectRatio === '4:3'
                    ? 'aspect-[4/3]'
                    : founderSlot.aspectRatio === '16:9'
                    ? 'aspect-[16/9]'
                    : 'aspect-[16/10]'
                } ${founderSlot.fit === 'contain' ? 'object-contain' : 'object-cover'} ${
                  founderSlot.position === 'top'
                    ? 'object-top'
                    : founderSlot.position === 'bottom'
                    ? 'object-bottom'
                    : 'object-center'
                }`}
                referrerPolicy="no-referrer"
              />
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">{t.about.photoCaption1}</span>
                <span className="text-slate-500">{t.about.photoSub1}</span>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
              <img
                src={masterclassSlot.imageUrl}
                alt={masterclassSlot.altText}
                className={`w-full ${
                  masterclassSlot.aspectRatio === '1:1'
                    ? 'aspect-square'
                    : masterclassSlot.aspectRatio === '4:3'
                    ? 'aspect-[4/3]'
                    : masterclassSlot.aspectRatio === '16:10'
                    ? 'aspect-[16/10]'
                    : 'aspect-[16/9]'
                } ${masterclassSlot.fit === 'contain' ? 'object-contain' : 'object-cover'} ${
                  masterclassSlot.position === 'top'
                    ? 'object-top'
                    : masterclassSlot.position === 'bottom'
                    ? 'object-bottom'
                    : 'object-center'
                }`}
                referrerPolicy="no-referrer"
              />
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">{t.about.photoCaption2}</span>
                <span className="text-slate-500">{t.about.photoSub2}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Photographic Gallery from Instagram @oralpro.italia */}
        <div className="my-8 sm:my-10 -mx-4 sm:-mx-6 lg:-mx-8">
          <InstagramGallerySection />
        </div>

        {/* CTA banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold">
              {t.finalCta.title}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {t.finalCta.footnote}
            </p>
          </div>
          <button
            onClick={onOpenBooking}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            {t.common.scheduleMeeting}
          </button>
        </div>
      </div>
    </div>
  );
};
