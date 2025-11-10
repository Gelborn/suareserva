import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";

import UnifiedLanding from "./components/LandingPage/UnifiedLanding"; // <— NOVO: single-file LP

// removidos: Hero, Features, Pricing, FAQ, Footer
// import Hero from './components/LandingPage/Hero';
// import Features from './components/LandingPage/Features';
// import Pricing from './components/LandingPage/Pricing';
// import FAQ from './components/LandingPage/FAQ';
// import Footer from './components/LandingPage/Footer';

import AuthModal from "./components/Auth/AuthModal";
import Dashboard from "./components/Dashboard/Dashboard";
import Agenda from "./components/Dashboard/Agenda";
import Stores from "./components/store/Stores";
import StorePage from "./components/store/StorePage";
import Team from "./components/Dashboard/Team";
import PublicStorePage from "./components/public/PublicStorePage";

import AppToaster from "./components/ui/AppToaster";
import LoadingScreen from "./components/ui/LoadingScreen";

type LandingProps = {
  onGetStarted: (mode?: "login" | "register") => void;
  onLoginClick: () => void;
  showAuthModal: boolean;
  onCloseAuthModal: () => void;
  authModalMode: "login" | "register";
};

const LandingExperience: React.FC<LandingProps> = ({
  onGetStarted,
  onLoginClick,
  showAuthModal,
  onCloseAuthModal,
  authModalMode,
}) => (
  <div className="min-h-screen bg-white dark:bg-gray-950">
    <Header onLoginClick={onLoginClick} showMenu={false} />
    <UnifiedLanding onGetStarted={onGetStarted} />
    <AuthModal isOpen={showAuthModal} onClose={onCloseAuthModal} initialMode={authModalMode} />
    <AppToaster />
  </div>
);

type SidebarTab = "dashboard" | "agenda" | "team" | "store";

const tabFromPath = (pathname: string): SidebarTab => {
  if (pathname.startsWith("/agenda")) return "agenda";
  if (pathname.startsWith("/team")) return "team";
  if (pathname.startsWith("/stores")) return "store";
  return "dashboard";
};

const AuthenticatedLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeTab = useMemo<SidebarTab>(() => tabFromPath(location.pathname), [location.pathname]);

  const handleTabChange = (tab: SidebarTab) => {
    switch (tab) {
      case "dashboard":
        navigate("/dashboard");
        break;
      case "agenda":
        navigate("/agenda");
        break;
      case "team":
        navigate("/team");
        break;
      case "store":
        navigate("/stores");
        break;
      default:
        navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(true)} showMenu />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <AppToaster />
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("register");

  const handleGetStarted = (mode: "login" | "register" = "register") => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };
  const handleLoginClick = () => handleGetStarted("login");

  useEffect(() => {
    if (isAuthenticated && showAuthModal) setShowAuthModal(false);
  }, [isAuthenticated, showAuthModal]);

  if (isAuthLoading) {
    return <LoadingScreen message="Carregando sessão…" />;
  }

  return (
    <Routes>
      <Route path="/:slug" element={<PublicStorePage />} />

      {isAuthenticated ? (
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/team" element={<Team />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/stores/:id" element={<StorePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        <Route
          path="*"
          element={
            <LandingExperience
              onGetStarted={handleGetStarted}
              onLoginClick={handleLoginClick}
              showAuthModal={showAuthModal}
              onCloseAuthModal={() => setShowAuthModal(false)}
              authModalMode={authModalMode}
            />
          }
        />
      )}
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
