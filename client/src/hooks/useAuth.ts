// client/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Функция для получения токена
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('authToken');
  }, []);

  // Функция для обновления профиля пользователя
  const refreshProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoggedIn(false);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsLoggedIn(true);
        return userData;
      } else {
        // Токен недействителен
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsLoggedIn(false);
        return null;
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      setUser(null);
      setIsLoggedIn(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  // Функция логина
  const login = useCallback((userData: User, token: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsLoggedIn(true);
    console.log('User logged in:', userData);
  }, []);

  // Функция логаута
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
    console.log('User logged out');
  }, []);

  // Инициализация при загрузке
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Сначала устанавливаем сохраненные данные
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsLoggedIn(true);
          
          // Затем обновляем их с сервера
          await refreshProfile();
        } catch (error) {
          console.error('Failed to parse saved user data:', error);
          // Если данные повреждены, очищаем их и пытаемся получить с сервера
          localStorage.removeItem('user');
          await refreshProfile();
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshProfile, getAuthToken]);

  // Слушаем изменения localStorage (для синхронизации между вкладками)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        if (e.newValue === null) {
          // Токен удален в другой вкладке
          setUser(null);
          setIsLoggedIn(false);
        } else if (e.oldValue === null) {
          // Токен добавлен в другой вкладке
          refreshProfile();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshProfile]);

  // Автоматическое обновление профиля при фокусе окна
  useEffect(() => {
    const handleFocus = () => {
      if (isLoggedIn && !isLoading) {
        refreshProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoggedIn, isLoading, refreshProfile]);

  return {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    getAuthToken,
    refreshProfile // Экспортируем функцию для ручного обновления
  };
}