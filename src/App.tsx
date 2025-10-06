import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

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
import Stores from './components/store/Stores';
import StorePage from './components/store/StorePage';

import AppToaster from './components/ui/AppToaster';
import LoadingScreen from './components/ui/LoadingScreen';

import Team from './components/Dashboard/Team';

const AuthedShell: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'team' | 'store'>('dashboard');

  const navigate = useNavigate();

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
      <LoadingScreen message="Carregando sessão…" />
    );
  }

  // público
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

  // handler para o Sidebar navegar
  const handleTabChange = (tab: 'dashboard' | 'agenda' | 'team' | 'store') => {
    setActiveTab(tab);
    switch (tab) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'agenda':
        navigate('/agenda');
        break;
      case 'team':
        navigate('/team');
        break;
      case 'store':
        navigate('/stores');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(true)} showMenu={true} />

      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* AGORA usamos rotas aqui dentro */}
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              {/* Você pode colocar sua tela de team aqui quando existir */}
              <Route
                path="/team"
                element={<Team />}
              />
              <Route path="/stores" element={<Stores />} />
              <Route path="/stores/:id" element={<StorePage />} />
              {/* fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <AppToaster />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AuthedShell />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
