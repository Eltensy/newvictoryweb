import { useState, useEffect } from "react";
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from "wouter";
import HeroSection from './HeroSection';
import SubmissionPage from './SubmissionPage';
import SubscriptionScreenshotModal from './SubscriptionScreenshotModal';
import LoadingScreen from './LoadingScreen';

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
  subscriptionScreenshotStatus?: string;
  subscriptionScreenshotUrl?: string;
  subscriptionScreenshotUploadedAt?: Date;
  subscriptionScreenshotReviewedAt?: Date;
  subscriptionScreenshotRejectionReason?: string;
}

export default function LandingPage() {
  const { user: authUser, isLoggedIn, getAuthToken, login, logout, refreshProfile } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Новое состояние для полной инициализации

  const currentUser = authUser; 
  
  const [location, setLocation] = useLocation();

  // Function to upload subscription screenshot
  const handleUploadSubscriptionScreenshot = async (file: File) => {
    if (!getAuthToken()) {
      throw new Error('Not authenticated');
    }

    setIsUploadingScreenshot(true);
    
    try {
      const formData = new FormData();
      formData.append('screenshot', file);

      const response = await fetch('/api/user/subscription-screenshot', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload screenshot');
      }

      const result = await response.json();
      
      // Force refresh user profile multiple times to ensure update
      await refreshProfile();
      
      // Small delay and refresh again to make sure data is updated
      setTimeout(async () => {
        await refreshProfile();
        
        // Force re-render by updating location
        setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 500);
      }, 1000);
      
    } catch (error) {
      console.error('Screenshot upload failed:', error);
      throw error;
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  // Function to refresh user data
  const handleRefreshUser = async () => {
    if (!isLoggedIn || !getAuthToken()) return;
    
    setIsRefreshing(true);
    try {
      await refreshProfile();
      console.log('User data refreshed successfully');
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

          login(userData, token);

          // Clean up URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (err) {
          console.error('Failed to parse user data:', err);
        }
      }
      
      // Убираем автоматическую установку isLoading в false
      // Теперь это будет контролироваться через isInitializing
    };

    handleEpicCallback();
  }, [login]);

  // Главный эффект для инициализации - контролирует весь процесс загрузки
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Минимальное время загрузки для лучшего UX
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isLoggedIn && getAuthToken()) {
          // Если пользователь авторизован, обновляем его данные
          await handleRefreshUser();
          
          // Ждем минимальное время загрузки
          await minLoadingTime;
          
          // Даем дополнительное время для стабилизации данных
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // Если не авторизован, просто ждем минимальное время
          await minLoadingTime;
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        // Завершаем инициализацию
        setIsInitializing(false);
        setIsLoading(false);
      }
    };

    // Запускаем инициализацию только после первого рендера
    const timer = setTimeout(initializeApp, 100);
    return () => clearTimeout(timer);
  }, [isLoggedIn]); // Зависим только от isLoggedIn

  // Periodic refresh every 30 seconds (optional)
  useEffect(() => {
    if (!isLoggedIn || isInitializing) return;

    const interval = setInterval(async () => {
      await handleRefreshUser();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isLoggedIn, isInitializing]);

  const handleAuthError = (message: string) => {
    console.error('Auth error:', message);
    alert(`Authentication failed: ${message}`);
    
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  };

  const handleEpicLogin = async () => {
    setIsLoading(true);
    setIsInitializing(true);

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
      setIsInitializing(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    console.log("User logged out");
  };

  // Показываем загрузку пока идет инициализация ИЛИ обычная загрузка
  if (isLoading || isInitializing) {
    let message = "Загружаем...";
    let submessage = "Подготавливаем контент для вас...";
    
    if (isLoggedIn && currentUser) {
      message = "Логинимся в систему...";
      submessage = "Проверяем данные авторизации";
    }
    
    return (
      <LoadingScreen 
        message={message}
        submessage={submessage}
      />
    );
  }

  // Теперь все проверки статуса происходят только после полной инициализации
  if (isLoggedIn && currentUser) {
    // const subscriptionStatus = currentUser.subscriptionScreenshotStatus || 'none';
    
    // console.log('Current user data:', {
    //   id: currentUser.id,
    //   username: currentUser.username,
    //   subscriptionScreenshotStatus: currentUser.subscriptionScreenshotStatus,
    //   subscriptionScreenshotUrl: currentUser.subscriptionScreenshotUrl
    // });
    
    // // Show subscription screenshot modal if not approved
    // if (subscriptionStatus === 'none' || subscriptionStatus === 'rejected') {
    //   return (
    //     <SubscriptionScreenshotModal
    //       onUpload={handleUploadSubscriptionScreenshot}
    //       isUploading={isUploadingScreenshot}
    //       user={currentUser}
    //     />
    //   );
    // }
    
    // // Show pending status if screenshot is under review
    // if (subscriptionStatus === 'pending') {
    //   console.log('Showing pending status');
    //   return (
    //     <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
    //       {/* Background Pattern */}
    //       <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5"></div>
    //       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]"></div>
          
    //       <div className="relative max-w-md mx-auto text-center p-8 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
    //         <div className="w-16 h-16 rounded-full bg-gaming-warning/20 flex items-center justify-center mx-auto mb-6">
    //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gaming-warning"></div>
    //         </div>
    //         <h1 className="text-2xl font-bold font-gaming mb-4">Проверяем подписку</h1>
    //         <p className="text-muted-foreground mb-6">
    //           Мы рассматриваем твой скриншот подписки. Это займет несколько минут.
    //         </p>
    //         <button
    //           onClick={handleRefreshUser}
    //           disabled={isRefreshing}
    //           className="text-primary hover:text-primary/80 font-gaming text-sm transition-colors disabled:opacity-50"
    //         >
    //           {isRefreshing ? 'Обновление...' : 'Обновить статус'}
    //         </button>
    //       </div>
    //     </div>
    //   );
    // }
    
    // Show submission page (subscription check temporarily disabled)
    // if (subscriptionStatus === 'approved') {
      console.log('Showing main platform - subscription check disabled');
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
    // }
  }

  // Show hero section for unauthenticated users
  return (
    <HeroSection
      onEpicLogin={handleEpicLogin}
      isLoading={isLoading}
    />
  );
}