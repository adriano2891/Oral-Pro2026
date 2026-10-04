import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Caught by Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Recarregando a OralPro...</h2>
            <p className="text-sm text-slate-300 mb-6">
              Ocorreu uma pequena instabilidade ao carregar a interface. Clique abaixo para reiniciar a navegação na Home.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Abrir Página Inicial
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
