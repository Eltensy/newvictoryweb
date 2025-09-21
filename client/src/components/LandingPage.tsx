import { useState, useEffect } from "react";
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from "wouter";
import HeroSection from './HeroSection';
import SubmissionPage from './SubmissionPage';

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
}

export default function LandingPage() {
  const { user: authUser, isLoggedIn, getAuthToken, login, logout, refreshProfile } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentUser = authUser; 
  
  const [location, setLocation] = useLocation();

  // Функция для обновления данных пользователя
  const handleRefreshUser = async () => {
    if (!isLoggedIn || !getAuthToken()) return;
    
    setIsRefreshing(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        // Обновляем данные пользователя через хук
        await refreshProfile();
        console.log('User data refreshed successfully');
      } else {
        console.error('Failed to refresh user data');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const handleEpicCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');

      if (authStatus === 'success' && token && userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          console.log('Decoded userData:', userData);

          login(userData, token);

          // Очистка URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (err) {
          console.error('Failed to parse user data:', err);
        }
      }
      setIsLoading(false);
    };

    handleEpicCallback();
  }, [login]);

  // Автоматическое обновление данных пользователя при загрузке страницы
  useEffect(() => {
    const initializeUserData = async () => {
      if (isLoggedIn && getAuthToken() && !isLoading) {
        await handleRefreshUser();
      }
    };

    // Небольшая задержка чтобы дать время на инициализацию
    const timer = setTimeout(initializeUserData, 100);
    return () => clearTimeout(timer);
  }, [isLoggedIn, isLoading]);

  // Автоматическое обновление каждые 30 секунд (опционально)
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(async () => {
      await handleRefreshUser();
    }, 30000); // 30 секунд

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleAuthError = (message: string) => {
    console.error('Auth error:', message);
    alert(`Authentication failed: ${message}`);
    
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  };

  const handleEpicLogin = async () => {
    console.log("Epic Games login triggered");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/epic/login");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Epic login error:', error);
      alert('Failed to initialize Epic Games login. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    console.log("User logged out");
  };

  // Show loading state while processing authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Logging you in...</p>
        </div>
      </div>
    );
  }

  // Show submission page if user is logged in
  if (isLoggedIn && currentUser) {
    return (
      <SubmissionPage 
        user={currentUser} 
        profileOpen={isProfileOpen} 
        setProfileOpen={setIsProfileOpen}
        balanceModalOpen={isBalanceModalOpen}
        setBalanceModalOpen={setIsBalanceModalOpen}
        onLogout={() => {
          setIsProfileOpen(false);
          logout();
        }}
        getAuthToken={getAuthToken}
        onRefreshUser={handleRefreshUser}
        isRefreshing={isRefreshing}
      />
    );
  }

  // Show hero section for unauthenticated users
  return (
    <HeroSection
      onEpicLogin={handleEpicLogin}
      isLoading={isLoading}
    />
  );
}