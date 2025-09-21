import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';

import Hero from './components/LandingPage/Hero';
import Features from './components/LandingPage/Features';
import Pricing from './components/LandingPage/Pricing';
import FAQ from './components/LandingPage/FAQ';
import Footer from './components/LandingPage/Footer';

import AuthModal from './components/Auth/AuthModal';
import Dashboard from './components/Dashboard/Dashboard';
import Agenda from './components/Dashboard/Agenda';

import AppToaster from './components/ui/AppToaster';

const MainApp: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'team' | 'services' | 'store'>('dashboard');

  const handleGetStarted = (mode: 'login' | 'register' = 'register') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };
  const handleLoginClick = () => handleGetStarted('login');

  useEffect(() => {
    if (isAuthenticated && showAuthModal) setShowAuthModal(false);
  }, [isAuthenticated, showAuthModal]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 grid place-items-center">
        <div className="text-sm text-gray-600 dark:text-gray-300">Carregando…</div>
        <AppToaster />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'agenda':
        return <Agenda />;
      case 'team':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time</h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300">Gestão de equipe em desenvolvimento...</p>
            </div>
          </div>
        );
      case 'services':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Serviços</h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300">Cadastro de serviços em desenvolvimento...</p>
            </div>
          </div>
        );
      case 'store':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Loja</h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300">Personalização da loja em desenvolvimento...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Header onLoginClick={handleLoginClick} showMenu={false} />
        <Hero onGetStarted={handleGetStarted} />
        <Features />
        <Pricing onGetStarted={handleGetStarted} />
        <FAQ />
        <Footer />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
        <AppToaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(true)} showMenu={true} />

      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      <AppToaster />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
