import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, availableLanguages } from '../i18n/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'mobile' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { language, setLanguage } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = availableLanguages.find((l) => l.code === language) || availableLanguages[0];

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [dropdownOpen]);

  // Mobile drawer variant: displays all language options cleanly and directly
  if (variant === 'mobile') {
    return (
      <div className={`w-full space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>Idioma / Language / Lingua</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {availableLanguages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => setLanguage(lang.code)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="uppercase text-[11px] font-extrabold tracking-wider">{lang.code}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </div>
                <span className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {lang.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop / Header Dropdown matching reference Image 1
  return (
    <div ref={containerRef} className={`relative inline-flex items-center shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
        aria-label="Selecionar idioma"
        className="flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 xl:py-2 bg-slate-100/90 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 rounded-xl text-xs xl:text-sm font-semibold transition-all border border-slate-200/80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs whitespace-nowrap shrink-0"
      >
        <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <span className="text-slate-800 hidden 2xl:inline">{currentLang.name}</span>
        <span className="text-slate-800 2xl:hidden uppercase font-bold text-xs">{currentLang.code}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${
            dropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {dropdownOpen && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Idioma / Language / Lingua
          </div>
          {availableLanguages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(lang.code);
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
