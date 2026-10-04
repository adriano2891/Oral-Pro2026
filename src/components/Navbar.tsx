import React, { useState, useEffect, useRef } from 'react';
import { OralProLogo } from './OralProLogo';
import { PageView } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { Calendar, Menu, X, ChevronRight, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onOpenBooking: () => void;
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenBooking,
}) => {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu on Esc key or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (page: PageView) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const navItems: { page: PageView; label: string }[] = [
    { page: 'home', label: t.nav.home },
    { page: 'servicos', label: t.nav.services },
    { page: 'metodo', label: t.nav.method },
    { page: 'areas', label: t.nav.areas },
    { page: 'sobre', label: t.nav.about },
    { page: 'duvidas', label: t.nav.faq },
    { page: 'contactos', label: t.nav.contact },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200/90 shadow-xs transition-colors w-full">
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-4 lg:px-4 xl:px-6 h-20 sm:h-22 lg:h-24 flex items-center justify-between gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-4">
        {/* ========================================================= */}
        {/* AREA 1: LOGÓTIPO À ESQUERDA */}
        {/* ========================================================= */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl p-0.5 transition-opacity hover:opacity-90 cursor-pointer flex items-center shrink-0"
            aria-label="OralPro - Página Inicial"
          >
            <OralProLogo size="header" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* AREA 2: NAVEGAÇÃO PRINCIPAL AO CENTRO (DESKTOP) */}
        {/* ========================================================= */}
        <nav
          className="hidden lg:flex items-center justify-center gap-1 xl:gap-2.5 2xl:gap-3.5 font-medium"
          aria-label="Navegação Principal"
        >
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => handleNavClick(item.page)}
                className={`relative py-2 px-2 xl:px-3 2xl:px-3.5 transition-colors cursor-pointer text-[15px] xl:text-[16.5px] 2xl:text-[18px] tracking-tight whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-700 hover:text-blue-600 font-semibold'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-2 right-2 h-1 bg-blue-600 rounded-full shadow-xs"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ========================================================= */}
        {/* AREA 3: CONTROLOS À DIREITA (ADMIN, IDIOMA & AGENDAMENTO) */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
          {/* Botão Admin Provisório - Visível no topo em tablets/desktop (sm: >= 640px) */}
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`hidden sm:inline-flex animate-orange-pulse items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-all cursor-pointer border shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-xs ${
              currentPage === 'admin'
                ? 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-300'
                : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white border-orange-600 hover:border-orange-700'
            }`}
            title="Botão Admin provisório"
            aria-label="Botão Admin provisório"
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
            <div className="flex flex-col text-left justify-center leading-none">
              <span className="text-[10.5px] sm:text-[11.5px] font-bold text-white tracking-tight whitespace-nowrap">
                Botão Admin
              </span>
              <span className="text-[8px] sm:text-[9px] font-medium text-orange-100 tracking-wider lowercase whitespace-nowrap mt-0.5">
                provisório
              </span>
            </div>
          </button>

          {/* Seletor de Idioma Compacto em Menu (Desktop lg: >= 1024px) */}
          <div className="hidden lg:block shrink-0">
            <LanguageSelector variant="dropdown" />
          </div>

          {/* Botão Principal para Agendar Reunião - 100% visível, nunca cortado */}
          <button
            type="button"
            onClick={onOpenBooking}
            className={`inline-flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-xs xl:text-sm px-2.5 sm:px-3.5 xl:px-4 py-2 xl:py-2.5 rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              currentPage === 'agendamento'
                ? 'bg-blue-700 text-white ring-2 ring-blue-300'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
            }`}
            title={t.common.scheduleMeeting}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">{t.common.scheduleMeeting}</span>
            <span className="sm:hidden">Agendar</span>
          </button>

          {/* Botão de Menu Hambúrguer (Mobile & Tablet < 1024px) */}
          <button
            ref={toggleButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-w-[38px] min-h-[38px] w-9.5 h-9.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer shadow-2xs border border-slate-200/90"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-900" />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE MENU DRAWER / COMPACT SHEET */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer / Panel */}
          <div
            id="mobile-navigation-menu"
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu Principal"
            className="fixed top-0 right-0 bottom-0 w-full max-w-[340px] sm:max-w-[380px] bg-white shadow-2xl flex flex-col z-50 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-250"
          >
            {/* Drawer Top Bar */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <OralProLogo size="xs" />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 active:bg-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Fechar menu de navegação"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain">
              {/* Botão Admin Provisório - 100% completo, sem cortes, com ícone, título, rótulo e animação */}
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                className={`animate-orange-pulse w-full p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between text-left border shadow-xs ${
                  currentPage === 'admin'
                    ? 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-300'
                    : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white border-orange-600'
                }`}
                title="Botão Admin provisório"
                aria-label="Botão Admin provisório"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-white shrink-0" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white tracking-tight leading-tight">
                      Botão Admin
                    </span>
                    <span className="text-[10px] font-medium text-orange-100 tracking-wider lowercase leading-tight">
                      provisório
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/20 text-white border border-white/30 whitespace-nowrap">
                  Acesso Restrito
                </span>
              </button>

              {/* Botão de Agendamento Completo */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBooking();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-sm shadow-blue-600/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{t.common.scheduleMeeting}</span>
              </button>

              {/* Seção de Páginas */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-1">
                  Navegação
                </span>
                <nav className="flex flex-col space-y-0.5" aria-label="Links Móveis">
                  {navItems.map((item) => {
                    const isActive = currentPage === item.page;
                    return (
                      <button
                        key={item.page}
                        type="button"
                        onClick={() => handleNavClick(item.page)}
                        className={`w-full py-3 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-left text-sm font-semibold ${
                          isActive
                            ? 'text-blue-600 bg-blue-50/80 font-bold border border-blue-100'
                            : 'text-slate-800 hover:text-blue-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isActive ? 'text-blue-600 translate-x-1' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Seletor de Idioma Completo no Menu Mobile */}
              <div className="pt-2 border-t border-slate-100">
                <LanguageSelector variant="mobile" />
              </div>
            </div>

            {/* Footer do Menu */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400 shrink-0">
              OralPro · Marketing & Estratégia Odontológica
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
