import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from "wouter";
import LoadingScreen from './LoadingScreen';
import { 
  Trophy,
  Clock,
  Crown, 
  MapPin, 
  Home,
  User, 
  Settings,
  Plus,
  Trash2,
  Save,
  X,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface Territory {
  id: string;
  name: string;
  ownerId?: string;
  owner?: {
    id: string;
    username: string;
    displayName: string;
  };
  owners?: Array<{
    id: string;
    username: string;
    displayName: string;
    claimedAt: string;
  }>;
  claimedAt?: string;
  color: string;
  points: { x: number; y: number }[];
  description?: string;
  isActive: boolean;
  templateId: string;
  queueCount?: number;
  userInQueue?: boolean;
  createdBy?: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface TerritoryTemplate {
  id: string;
  name: string;
  description?: string;
  mapImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  territoryCount?: number;
  claimedCount?: number;
  createdBy?: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface TerritoryStats {
  currentTerritories: number;
  queueEntries: number;
  totalClaims: number;
  territoriesRevoked: number;
}

// Интерфейс для уведомлений
interface NotificationProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

interface AdminLog {
  id: string;
  actionType: 'claim' | 'revoke' | 'create' | 'assign';
  userId: string;
  username?: string;
  user?: {
    displayName: string;
  };
  territoryId?: string;
  territoryName?: string;
  territoryColor?: string;
  previousTerritoryId?: string;
  previousTerritory?: string;
  previousTerritoryColor?: string;
  previousOwner?: string;
  reason?: string;
  createdAt: string;
}

// Компонент уведомления
function NotificationModal({ isOpen, type, title, message, onClose }: NotificationProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/20 bg-green-50/50 dark:bg-green-950/50';
      case 'error':
        return 'border-red-500/20 bg-red-50/50 dark:bg-red-950/50';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/50';
      case 'info':
        return 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/50';
    }
  };

  return (
    <div className="fixed bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
      <div className={cn("bg-card rounded-2xl border shadow-2xl max-w-md w-full", getBorderColor())}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            {getIcon()}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>
              Понятно
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TerritorySystem() {
  const { user, isLoggedIn, getAuthToken, refreshProfile, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Основные состояния
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [templates, setTemplates] = useState<TerritoryTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<TerritoryTemplate | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [territoryStats, setTerritoryStats] = useState<TerritoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapImageLoaded, setIsMapImageLoaded] = useState(false);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [showAdminLogs, setShowAdminLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Zoom and pan states
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  // Состояние для уведомлений
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  // Мемоизация для предотвращения сброса состояния
    const memoizedTerritories = useMemo(() => territories, [territories]);
    const memoizedSelectedTerritory = useMemo(() => selectedTerritory, [selectedTerritory]);

  // Функция для показа уведомлений
  const showNotificationStable = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
  setNotification({ isOpen: true, type, title, message });
}, []);
  const showNotification = showNotificationStable;

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };
  const handleMapImageLoad = useCallback(() => {
  setIsMapImageLoaded(true);
}, []);
const forceCanvasRerender = useCallback(() => {
  setTimeout(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setTerritories(prev => [...prev]);
      }
    }
  }, 100);
}, []);
const handleMapImageError = useCallback(() => {
  console.warn('Не удалось загрузить изображение карты');
  setIsMapImageLoaded(true); // Все равно продолжаем работу
}, []);
  // Админские состояния
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<{ x: number; y: number }[]>([]);
  const [showTerritoryForm, setShowTerritoryForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  
  // Формы
  const [territoryForm, setTerritoryForm] = useState({
    name: '',
    color: '#3B82F6',
    description: ''
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    file: null as File | null
  });
  // Replace your loadAdminLogs function with this improved version:

const loadAdminLogs = useCallback(async () => {
  console.log('loadAdminLogs called', { 
    isAdmin: user?.isAdmin, 
    isAdminMode, 
    hasToken: !!getAuthToken() 
  });
  
  if (!user?.isAdmin) {
    console.log('User is not admin, skipping logs load');
    setAdminLogs([]);
    return;
  }
  
  try {
    setLogsLoading(true);
    const token = getAuthToken();
    if (!token) {
      console.log('No auth token available');
      showNotification('error', 'Ошибка авторизации', 'Отсутствует токен авторизации');
      return;
    }

    console.log('Loading admin logs...');
    const response = await fetch('/api/territory/admin/logs', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Raw response data:', data);
      
      // Handle both array and object responses
      const logs = Array.isArray(data) ? data : (data.logs || []);
      console.log('Processed logs:', logs);
      
      setAdminLogs(logs);
      
      if (logs.length === 0) {
        console.log('No logs returned from server');
      }
    } else {
      const errorText = await response.text();
      console.error('Error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      if (response.status === 401) {
        showNotification('error', 'Ошибка авторизации', 'Требуется повторная авторизация');
        // Optionally redirect to login or refresh token
      } else if (response.status === 403) {
        showNotification('error', 'Доступ запрещен', 'У вас нет прав администратора');
      } else {
        showNotification('error', 'Ошибка загрузки логов', `Не удалось загрузить логи: ${response.status} ${response.statusText}`);
      }
      
      setAdminLogs([]); // Clear logs on error
    }
  } catch (error) {
    console.error('Network error loading logs:', error);
    
    let errorMessage = 'Не удалось подключиться к серверу для загрузки логов';
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Проблема с сетевым соединением. Проверьте подключение к интернету.';
    }
    
    showNotification('error', 'Сетевая ошибка', errorMessage);
    setAdminLogs([]); // Clear logs on error
  } finally {
    setLogsLoading(false);
  }
}, [user?.isAdmin, getAuthToken, showNotification]); // Remove isAdminMode from dependencies

// Replace the useEffect that was causing the loop:
useEffect(() => {
  if (user?.isAdmin && isAdminMode) {
    console.log('Admin mode enabled, loading logs');
    loadAdminLogs();
  } else {
    console.log('Admin mode disabled or user not admin');
    setAdminLogs([]);
  }
}, [user?.isAdmin, isAdminMode]);

// Make sure to call loadAdminLogs when admin mode is enabled:
useEffect(() => {
  if (user?.isAdmin && isAdminMode) {
    console.log('Admin mode enabled, loading logs');
    loadAdminLogs();
  } else {
    console.log('Admin mode disabled or user not admin');
  }
}, [user?.isAdmin, isAdminMode, loadAdminLogs]);
  // Transform coordinates based on zoom and pan
  const transformPoint = useCallback((point: { x: number; y: number }) => {
    return {
      x: (point.x + panOffset.x) * scale,
      y: (point.y + panOffset.y) * scale
    };
  }, [scale, panOffset]);

  // Inverse transform for converting screen coordinates to map coordinates
  const inverseTransformPoint = useCallback((point: { x: number; y: number }) => {
    return {
      x: point.x / scale - panOffset.x,
      y: point.y / scale - panOffset.y
    };
  }, [scale, panOffset]);

  // Проверка аутентификации
  useEffect(() => {
    if (authLoading) return;
    
    if (!isLoggedIn) {
      setLocation('/');
      return;
    }
    
    if (user?.subscriptionScreenshotStatus !== 'approved') {
      setLocation('/');
      return;
    }
  }, [isLoggedIn, user, setLocation, authLoading]);

  // Загрузка данных
  const loadTemplates = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/territory/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const templatesData = await response.json();
        setTemplates(templatesData);
        
        const active = templatesData.find((t: TerritoryTemplate) => t.isActive);
        setActiveTemplate(active || null);
      } else if (response.status === 401) {
        await refreshProfile();
      }
    } catch (err) {
      console.error('Ошибка загрузки карт:', err);
    }
  }, [isLoggedIn, getAuthToken, refreshProfile]);

  const loadTerritories = useCallback(async () => {
    if (!isLoggedIn || !activeTemplate) return;
    
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/territory/territories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const territoriesData = await response.json();
        setTerritories(territoriesData);
      }
    } catch (err) {
      console.error('Ошибка загрузки локаций:', err);
      setTerritories([]);
    }
  }, [isLoggedIn, getAuthToken, activeTemplate]);

  const loadTerritoryStats = useCallback(async () => {
    if (!user?.id || !isLoggedIn) return;
    
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/territory/stats/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const stats = await response.json();
        setTerritoryStats(stats);
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  }, [user?.id, isLoggedIn, getAuthToken]);

  useEffect(() => {
  console.log('useEffect triggered:', {
    isAdmin: user?.isAdmin,
    isAdminMode,
    shouldLoad: user?.isAdmin && isAdminMode
  });
  
  if (user?.isAdmin && isAdminMode) {
    console.log('Loading admin logs due to mode change');
    loadAdminLogs();
  } else {
    console.log('Clearing admin logs - mode disabled or not admin');
    setAdminLogs([]);
  }
}, [user?.isAdmin, isAdminMode, loadAdminLogs]);
  // Инициализация
  useEffect(() => {
    const initializeData = async () => {
      if (authLoading || !isLoggedIn || !user) {
        setIsLoading(false);
        return;
      }
      
      if (user.subscriptionScreenshotStatus !== 'approved') {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          loadTemplates(),
          loadTerritoryStats()
        ]);
        setIsDataLoaded(true); // Добавить эту строку
      } catch (err) {
        console.error('Ошибка инициализации:', err);
        setError('Не удалось загрузить данные локаций');
        setIsDataLoaded(true); // Добавить и сюда
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [authLoading, isLoggedIn, user, loadTemplates, loadTerritoryStats]);

  // Загрузка локаций после активной карты
  useEffect(() => {
  if (activeTemplate) {
    loadTerritories().then(() => {
      setIsDataLoaded(true);
    });
  }
}, [activeTemplate, loadTerritories]);

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Применяем трансформации только для территорий
  ctx.save();
  ctx.translate(panOffset.x, panOffset.y);
  ctx.scale(scale, scale);

  // Отрисовка территорий
  territories.forEach(territory => {
    if (territory.points.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(territory.points[0].x, territory.points[0].y);
    territory.points.slice(1).forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();

    // Заливка
    const hasOwners = territory.owners && territory.owners.length > 0;
    const alpha = hasOwners ? '80' : '40';
    ctx.fillStyle = `${territory.color}${alpha}`;
    ctx.fill();

    // Обводка
    ctx.strokeStyle = territory.color;
    ctx.lineWidth = (selectedTerritory?.id === territory.id ? 3 : 2) / scale;
    ctx.stroke();
  });

  // Отрисовка текущего пути
  if (isDrawing && drawingPath.length > 0) {
    ctx.beginPath();
    if (drawingPath.length > 1) {
      ctx.moveTo(drawingPath[0].x, drawingPath[0].y);
      drawingPath.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
    }
    
    if (drawingPath.length > 2) {
      ctx.lineTo(drawingPath[0].x, drawingPath[0].y);
    }
    
    ctx.strokeStyle = territoryForm.color;
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([5 / scale, 5 / scale]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Точки
    drawingPath.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, (index === 0 ? 6 : 4) / scale, 0, 2 * Math.PI);
      ctx.fillStyle = index === 0 ? '#ef4444' : territoryForm.color;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
    });
  }

  ctx.restore();

  // Функция для рендеринга текста с обводкой
  const renderTextWithOutline = (text: string, x: number, y: number, fontSize: number, fillColor: string, strokeColor: string = 'white', strokeWidth: number = 3) => {
    ctx.font = `bold ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(text, x, y);
    
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
  };

  // Отрисовка текста
  if (scale > 0.5) {
    territories.forEach(territory => {
      if (territory.points.length < 3) return;

      const worldCenterX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
      const worldCenterY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;
      
      const screenCenterX = worldCenterX * scale + panOffset.x;
      const screenCenterY = worldCenterY * scale + panOffset.y;
      
      if (screenCenterX < -100 || screenCenterX > canvas.width + 100 || 
          screenCenterY < -50 || screenCenterY > canvas.height + 50) {
        return;
      }
      
      if (territory.owners && territory.owners.length > 0) {
        const fontSize = 16;
        
        if (territory.owners.length === 1) {
          renderTextWithOutline(
            territory.owners[0].displayName, 
            screenCenterX, 
            screenCenterY, 
            fontSize, 
            '#1a1a1a',
            'white',
            3
          );
        } else {
          if (territory.owners.length <= 4) {
            territory.owners.forEach((owner, index) => {
              const yOffset = (index - (territory.owners!.length - 1) / 2) * 20;
              renderTextWithOutline(
                owner.displayName, 
                screenCenterX, 
                screenCenterY + yOffset, 
                fontSize, 
                '#1a1a1a',
                'white',
                3
              );
            });
          } else {
            territory.owners.slice(0, 3).forEach((owner, index) => {
              const yOffset = (index - 1) * 18 - 10;
              renderTextWithOutline(
                owner.displayName, 
                screenCenterX, 
                screenCenterY + yOffset, 
                fontSize, 
                '#1a1a1a',
                'white',
                3
              );
            });
            
            renderTextWithOutline(
              `+${territory.owners.length - 3} других`, 
              screenCenterX, 
              screenCenterY + 25, 
              14, 
              '#4a5568',
              'white',
              2.5
            );
          }
        }
      } else if (territory.owner) {
        renderTextWithOutline(
          territory.owner.displayName, 
          screenCenterX, 
          screenCenterY, 
          16, 
          '#1a1a1a',
          'white',
          3
        );
      } else {
        renderTextWithOutline(
          territory.name, 
          screenCenterX, 
          screenCenterY, 
          16, 
          '#6b7280',
          'white',
          3
        );
      }

      if (!territory.owners?.length && !territory.owner && territory.createdBy && scale > 0.8) {
        renderTextWithOutline(
          `Создал: ${territory.createdBy.displayName}`, 
          screenCenterX, 
          screenCenterY + 20, 
          12, 
          '#6b7280',
          'white',
          2
        );
      }

      if (territory.queueCount && territory.queueCount > 0 && scale > 0.7) {
        const hasOwners = territory.owners && territory.owners.length > 0;
        const yOffset = hasOwners ? 
          ((territory.owners?.length || 0) > 3 ? 45 : (territory.owners?.length || 0) * 20 + 15) : 
          30;
        
        renderTextWithOutline(
          `Очередь: ${territory.queueCount}`, 
          screenCenterX, 
          screenCenterY + yOffset, 
          13, 
          '#ea580c',
          'white',
          2.5
        );
      }
    });
  }
  if (territories.length > 0) {
  const canvas = canvasRef.current;
  if (canvas) {
    canvas.style.display = 'none';
    canvas.offsetHeight; // trigger reflow
    canvas.style.display = '';
  }
}
}, [territories, selectedTerritory, isDrawing, drawingPath, territoryForm.color, scale, panOffset, memoizedTerritories]);

  // Утилиты
   const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Получаем координаты относительно canvas
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Нормализуем к размеру canvas (1200x800)
    const normalizedMouseX = (mouseX / rect.width) * 1200;
    const normalizedMouseY = (mouseY / rect.height) * 800;
    
    // Преобразуем обратно в координаты карты с учетом зума и панорамирования
    const mapX = (normalizedMouseX - panOffset.x * scale) / scale;
    const mapY = (normalizedMouseY - panOffset.y * scale) / scale;

    return { x: mapX, y: mapY };
  }, [scale, panOffset]);

  const isPointInTerritory = useCallback((point: { x: number; y: number }, territory: Territory) => {
    if (territory.points.length < 3) return false;

    let inside = false;
    for (let i = 0, j = territory.points.length - 1; i < territory.points.length; j = i++) {
      if (((territory.points[i].y > point.y) !== (territory.points[j].y > point.y)) &&
          (point.x < (territory.points[j].x - territory.points[i].x) * (point.y - territory.points[i].y) / (territory.points[j].y - territory.points[i].y) + territory.points[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  // Zoom and pan handlers
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 2 || (event.button === 0 && event.shiftKey)) {
      setIsDraggingMap(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  }, []);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingMap) return;

    const deltaX = event.clientX - lastPanPoint.x;
    const deltaY = event.clientY - lastPanPoint.y;

    setPanOffset(prev => ({
      x: prev.x + deltaX / scale,
      y: prev.y + deltaY / scale
    }));

    setLastPanPoint({ x: event.clientX, y: event.clientY });
  }, [isDraggingMap, lastPanPoint, scale]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDraggingMap(false);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
  event.preventDefault();
  
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  
  // Координаты курсора относительно canvas в пикселях
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  
  // Нормализуем к размеру canvas (1200x800)
  const canvasX = (mouseX / rect.width) * 1200;
  const canvasY = (mouseY / rect.height) * 800;

  // Текущая точка в мировых координатах (учитывая pan и scale)
  const worldX = (canvasX - panOffset.x * scale) / scale;
  const worldY = (canvasY - panOffset.y * scale) / scale;

  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(Math.max(scale * zoomFactor, MIN_SCALE), MAX_SCALE);

  if (newScale !== scale) {
    // Новое смещение чтобы worldX, worldY остались под курсором
    // canvasX = worldX * newScale + panOffset.x * newScale
    // panOffset.x = (canvasX - worldX * newScale) / newScale
    const newPanX = (canvasX - worldX * newScale) / newScale;
    const newPanY = (canvasY - worldY * newScale) / newScale;

    setScale(newScale);
    setPanOffset({ x: newPanX, y: newPanY });
  }
}, [scale, panOffset]);

  const resetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, MAX_SCALE));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, MIN_SCALE));
  };

  // Обработчики событий
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingMap) return; // Don't process clicks during pan

    const coords = getCanvasCoordinates(event);

    // Если админ рисует новую территорию
    if (isDrawing && user?.isAdmin && isAdminMode) {
      if (drawingPath.length > 2) {
        const firstPoint = drawingPath[0];
        const distance = Math.sqrt(Math.pow(coords.x - firstPoint.x, 2) + Math.pow(coords.y - firstPoint.y, 2));
        if (distance < 15) {
          handleCreateTerritory();
          return;
        }
      }
      
      setDrawingPath(prev => [...prev, coords]);
      return;
    }

    const clickedTerritory = territories.find(territory => 
      isPointInTerritory(coords, territory)
    );

    if (clickedTerritory) {
      setSelectedTerritory(clickedTerritory);
      
      // Автоматически клеймим локацию при клике (для всех пользователей, включая админов в обычном режиме)
      if (!user?.isAdmin || (user?.isAdmin && !isAdminMode)) {
        handleClaimTerritory(clickedTerritory.id);
      }
    } else {
      setSelectedTerritory(null);
    }
  }, [isDraggingMap, isDrawing, territories, user, isAdminMode, getCanvasCoordinates, isPointInTerritory, drawingPath]);

  // Disable context menu on canvas
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };
  const focusOnTerritory = useCallback((territory: Territory) => {
  if (territory.points.length < 3) return;

  // Вычисляем центр территории
  const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
  const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;

  // Устанавливаем больший зум
  const targetScale = 2.0;
  
  // Используем flushSync для синхронного обновления (если доступен в вашей версии React)
  // Или просто делаем последовательные setState
  setSelectedTerritory(territory);
  
  setTimeout(() => {
    setScale(targetScale);
    setPanOffset({
      x: 600 - centerX * targetScale,
      y: 400 - centerY * targetScale
    });
  }, 0);
}, []);
  // API функции
  const handleClaimTerritory = async (territoryId: string) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        showNotification('error', 'Ошибка авторизации', 'Требуется авторизация для клейма локации');
        return;
      }

      const response = await fetch('/api/territory/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          territoryId,
          priority: 5,
          reason: 'Клейм локации с карты',
          allowMultiple: false, // Запрещаем множественное владение
          replaceExisting: true // Заменем предыдущий клейм новым
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Сохраняем состояние перед обновлением
        const savedScale = scale;
        const savedPanOffset = panOffset;
        const savedSelectedTerritory = selectedTerritory;
        if (result.immediate) {
          if (result.previousTerritory) {
            showNotification('success', 'Локация переклеймлена', `Вы успешно переклеймили локацию! Предыдущая локация "${result.previousTerritory}" освобождена.`);
          } else {
            showNotification('success', 'Локация заклеймлена', 'Вы успешно заклеймили локацию!');
            forceCanvasRerender();
          }
          
          // Reload logs if admin mode is active
          if (user?.isAdmin && isAdminMode) {
            setTimeout(() => {
              loadAdminLogs();
            }, 500); // Small delay to ensure database is updated
          }
        }
        const currentScale = scale;
        const currentPanOffset = panOffset;

        await Promise.all([loadTerritories(), loadTerritoryStats()]);

        setTimeout(() => {
          setScale(savedScale);
          setPanOffset(savedPanOffset);
          if (savedSelectedTerritory) {
            setSelectedTerritory(savedSelectedTerritory);
          }
        }, 50);
      } else {
        const errorData = await response.json();
        // Показываем ошибки только если это не повторный клейм той же локации
        if (errorData.error && !errorData.error.includes('уже заклеймлена') && !errorData.error.includes('already claimed')) {
          showNotification('error', 'Ошибка клейма', errorData.error || 'Произошла ошибка при клейме локации');
          forceCanvasRerender();
        } else if (errorData.error && errorData.error.includes('уже заклеймлена')) {
          showNotification('info', 'Уже заклеймлена', 'Вы уже заклеймили эту локацию');
          forceCanvasRerender();
        }
      }
    } catch (error) {
      console.error('Ошибка клейма локации:', error);
      showNotification('error', 'Сетевая ошибка', 'Не удалось связаться с сервером. Проверьте подключение к интернету.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTerritory = async () => {
  if (!activeTemplate || drawingPath.length < 3) return;

  try {
    setIsLoading(true);
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch('/api/territory/territories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        templateId: activeTemplate.id,
        name: territoryForm.name || `Локация ${territories.length + 1}`,
        description: territoryForm.description,
        points: drawingPath,
        color: territoryForm.color,
        priority: 1
      })
    });

    if (response.ok) {
      await loadTerritories();
      cancelDrawing();
      showNotification('success', 'Локация создана', 'Новая локация успешно добавлена на карту');
      if (user?.isAdmin && isAdminMode) {
        loadAdminLogs(); // Добавить эту строку
      }
    } else {
      const errorData = await response.json();
      showNotification('error', 'Ошибка создания', errorData.error || 'Не удалось создать локацию');
    }
  } catch (error) {
    console.error('Ошибка создания локации:', error);
    showNotification('error', 'Сетевая ошибка', 'Не удалось создать локацию. Проверьте подключение к интернету.');
  } finally {
    setIsLoading(false);
  }
};

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) return;

    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const formData = new FormData();
      formData.append('name', templateForm.name);
      if (templateForm.description) {
        formData.append('description', templateForm.description);
      }
      if (templateForm.file) {
        formData.append('mapImage', templateForm.file);
      }

      const response = await fetch('/api/territory/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        await loadTemplates();
        setTemplateForm({ name: '', description: '', file: null });
        setShowTemplateForm(false);
        showNotification('success', 'Карта создана', 'Новая карта успешно добавлена в систему');
      } else {
        const errorData = await response.json();
        showNotification('error', 'Ошибка создания карты', errorData.error || 'Не удалось создать карту');
      }
    } catch (error) {
      console.error('Ошибка создания карты:', error);
      showNotification('error', 'Сетевая ошибка', 'Не удалось создать карту. Проверьте подключение к интернету.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateTemplate = async (templateId: string) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/territory/templates/${templateId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        const errorData = await response.json();
        showNotification('error', 'Ошибка активации', errorData.error || 'Не удалось активировать карту');
      }
    } catch (error) {
      console.error('Ошибка активации карты:', error);
      showNotification('error', 'Сетевая ошибка', 'Не удалось активировать карту. Проверьте подключение к интернету.');
    } finally {
      setIsLoading(false);
    }
  };

  // Утилиты UI
  const startDrawing = () => {
    if (!user?.isAdmin || !activeTemplate) return;
    setIsDrawing(true);
    setDrawingPath([]);
    setShowTerritoryForm(true);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPath([]);
    setShowTerritoryForm(false);
    setTerritoryForm({ name: '', color: '#3B82F6', description: '' });
  };

  // Состояния загрузки и ошибок
  if (authLoading || (isLoading && isLoggedIn)) {
    return (
      <LoadingScreen
        message="Загрузка локаций..."
        submessage="Подготавливаем карты и данные для вас"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div className="text-red-500 font-semibold">Ошибка: {error}</div>
          <Button onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </Button>
          <Button variant="outline" onClick={() => setLocation('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            На главную
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !user || user.subscriptionScreenshotStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
          <p className="text-muted-foreground">
            {!isLoggedIn ? 'Требуется авторизация' : 'Требуется подтверждение подписки'}
          </p>
          <Button onClick={() => setLocation('/')}>
            Перейти на главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Современный минималистичный хедер */}
<header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
  <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
    
    {/* Left - Logo & Nav */}
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Trophy className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight hidden sm:inline">ContestGG</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-1">
        <Button
          onClick={() => setLocation('/')}
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5 mr-1.5" />
          Загрузка
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-sm font-medium text-foreground transition-colors"
        >
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          Карты
        </Button>

        <Button
          onClick={() => setLocation('/tournaments')}
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Trophy className="h-3.5 w-3.5 mr-1.5" />
          Турниры
        </Button>
      </nav>

      {/* Active Template Badge */}
      {activeTemplate && (
        <Badge variant="secondary" className="hidden md:flex">
          {activeTemplate.name}
        </Badge>
      )}
    </div>

    {/* Right - Controls */}
    <div className="flex items-center gap-3">
      {/* Zoom Controls - Desktop */}
      <div className="hidden lg:flex items-center gap-1">
        <button
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          title="Уменьшить"
        >
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <div className="px-2 py-1 text-xs font-medium tabular-nums min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          title="Увеличить"
        >
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={resetZoom}
          className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center"
          title="Сброс"
        >
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Territory Stats - Compact */}
      {territoryStats && (
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Crown className="h-3.5 w-3.5 text-yellow-600" />
            <span className="text-xs font-medium tabular-nums">{territoryStats.currentTerritories}</span>
          </div>
          
          {territoryStats.queueEntries > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium tabular-nums text-blue-600">{territoryStats.queueEntries}</span>
            </div>
          )}
        </div>
      )}

      {/* Admin Controls */}
      {user.isAdmin && isAdminMode && (
        <div className="hidden lg:flex items-center gap-2">
          {!isDrawing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateForm(true)}
                className="h-8 px-3"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Карта
              </Button>
              
              {activeTemplate && (
                <Button
                  onClick={startDrawing}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Локация
                </Button>
              )}
            </>
          )}
          
          {isDrawing && (
            <>
              <Button
                onClick={handleCreateTerritory}
                size="sm"
                disabled={drawingPath.length < 3 || isLoading}
                className="h-8 px-3"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Сохранить
              </Button>
              <Button
                onClick={cancelDrawing}
                size="sm"
                variant="outline"
                className="h-8 px-3"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Отмена
              </Button>
            </>
          )}
        </div>
      )}

      {/* Admin Toggle */}
      {user.isAdmin && (
        <div className="flex items-center gap-2 pl-3 border-l border-border/40">
          <span className="text-xs text-muted-foreground hidden md:inline">Admin</span>
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            className={cn(
              "relative inline-flex h-5 w-8 items-center rounded-full transition-colors",
              isAdminMode ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                isAdminMode ? 'translate-x-3.5' : 'translate-x-0.5'
              )}
            />
          </button>
          <Settings className={cn("h-3 w-3", isAdminMode ? 'text-primary' : 'text-muted-foreground')} />
        </div>
      )}

      {/* User Avatar */}
      <button 
        className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 hover:scale-105 transition-transform flex items-center justify-center"
        title={user.displayName}
      >
        <User className="h-4 w-4 text-white" />
      </button>
    </div>
  </div>
</header>

      <div className="flex h-[calc(100vh-80px)]">
  {/* Левая панель с логами (только для админов в админ-режиме) */}
{user?.isAdmin && isAdminMode && (
  <div className="w-80 border-r border-border bg-card/30 backdrop-blur-sm overflow-y-none">
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Логи активности</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{adminLogs.length}</Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadAdminLogs}
            disabled={logsLoading}
            title="Обновить логи"
          >
            {logsLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Settings className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
  {logsLoading ? (
    <div className="text-center text-muted-foreground text-sm py-8">
      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
      Загрузка логов...
    </div>
  ) : adminLogs.length === 0 ? (
    <div className="text-center text-muted-foreground text-sm py-8">
      Нет записей активности
    </div>
  ) : (
    adminLogs.map((log, index) => (
  <div key={`${log.id || index}-${log.createdAt}`} className="p-3 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">
        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + '.' + String(new Date(log.createdAt).getMilliseconds()).padStart(3, '0') : 'Время не указано'}
      </span>
    </div>
    
    <div className="space-y-2 text-sm">
      {/* Основной текст лога */}
      <div className="flex items-start gap-1 flex-wrap">
        <span className="font-medium text-primary">
          {log.user?.displayName || log.username || 'Неизвестный пользователь'}
        </span>
        
        {log.actionType === 'claim' && log.previousTerritory && (
          <>
            <span className="text-muted-foreground">перешел с</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const prevTerritory = territories.find(t => t.id === log.previousTerritoryId);
                if (prevTerritory) {
                  focusOnTerritory(prevTerritory);
                }
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 hover:bg-orange-500/20 transition-colors cursor-pointer"
            >
              <div 
                className="w-2.5 h-2.5 rounded flex-shrink-0"
                style={{ backgroundColor: log.previousTerritoryColor || '#f97316' }}
              />
              <span className="text-orange-600 hover:underline font-medium text-xs">
                {log.previousTerritory}
              </span>
            </button>
            <span className="text-muted-foreground">на</span>
          </>
        )}
        
        {log.actionType === 'claim' && !log.previousTerritory && (
          <span className="text-muted-foreground">заклеймил</span>
        )}
        
        {log.actionType === 'revoke' && (
          <span className="text-muted-foreground">освободил</span>
        )}
        
        {log.actionType === 'create' && (
          <span className="text-muted-foreground">создал</span>
        )}
        
        {log.actionType === 'assign' && (
          <span className="text-muted-foreground">назначил</span>
        )}
        
        {/* Текущая локация */}
        {log.territoryName && (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Button clicked!', {
        territoryId: log.territoryId,
        territoriesCount: territories.length
      });
      
      if (!log.territoryId) {
        console.error('No territoryId in log');
        return;
      }
      
      const territory = territories.find(t => t.id === log.territoryId);
      
      if (!territory) {
        console.error('Territory not found:', log.territoryId);
        console.log('Available territories:', territories.map(t => ({ id: t.id, name: t.name })));
        return;
      }
      
      console.log('Calling focusOnTerritory with:', territory);
      focusOnTerritory(territory);
    }}
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
  >
    <div 
      className="w-2.5 h-2.5 rounded flex-shrink-0"
      style={{ backgroundColor: log.territoryColor || '#3B82F6' }}
    />
    <span className="text-primary hover:underline font-medium text-xs">
      {log.territoryName}
    </span>
  </button>
        )}
      </div>
      
      {/* Причина */}
      {log.reason && (
        <div className="text-xs italic text-muted-foreground p-1.5 bg-background/50 rounded">
          "{log.reason}"
        </div>
      )}
    </div>
  </div>
))
  )}
</div>
    </div>
  </div>
)}
        {/* Область карты */}
        <div className="flex-1 relative flex items-center justify-center bg-background">
         <div className="relative max-w-full max-h-full overflow-hidden">
          <div 
            className="relative"
            style={{
              width: '1200px',
              height: '800px'
            }}
          >
            {/* Фоновое изображение карты */}
            {activeTemplate?.mapImageUrl && (
              <img 
                src={activeTemplate.mapImageUrl}
                alt="Карта локаций"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                  transformOrigin: '0 0'
                }}
              />
            )}
            
            {/* Интерактивный canvas */}
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onWheel={handleWheel}
              onContextMenu={handleContextMenu}
              className={`absolute inset-0 w-full h-full ${
                isDraggingMap ? 'cursor-grabbing' : 
                isDrawing && user?.isAdmin && isAdminMode 
                  ? 'cursor-crosshair' 
                  : 'cursor-grab'
              }`}
            />
          </div>
        </div>
                {(!isDataLoaded || isLoading) && activeTemplate && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 bg-card p-4 rounded-lg border shadow-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm">Загрузка карты...</span>
                    </div>
                  </div>
                  
                )}
          {/* Инструкции по рисованию */}
          {isDrawing && (
            <div className="absolute top-8 left-8 bg-card/90 backdrop-blur-sm p-4 rounded-lg border z-10">
              <h3 className="font-semibold mb-2">Создание локации</h3>
              <p className="text-sm text-muted-foreground mb-1">
                Кликайте на карте, чтобы создать границы локации
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                Минимум 3 точки для создания области
              </p>
              {drawingPath.length > 2 && (
                <p className="text-sm text-green-600 font-medium">
                  Кликните на красную точку для завершения
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Текущих точек: {drawingPath.length}
              </p>
            </div>
          )}

          {/* Zoom instructions */}
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border text-sm">
            <div className="text-muted-foreground">
              <div>Скролл: Зум</div>
              <div>Правая кнопка мыши: Двигать картой</div>
            </div>
          </div>

          {/* Состояние без карты */}
          {!activeTemplate && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Нет активной карты</h2>
                <p className="text-muted-foreground">
                  {user.isAdmin 
                    ? "Создайте карту для начала работы с локациями"
                    : "Администратор должен настроить карту локаций"
                  }
                </p>
              </div>
            </div>
          )}

          {/* Пустая карта */}
          {activeTemplate && territories.length === 0 && !isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Пустая карта</h2>
                <p className="text-muted-foreground">
                  {user.isAdmin 
                    ? "Включите режим администратора для создания локаций"
                    : "Локации пока не созданы"
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Боковая панель */}
        <div className="w-80 border-l border-border bg-card/30 backdrop-blur-sm overflow-y-auto">
          {/* Информация о локации */}
          {selectedTerritory ? (
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{selectedTerritory.name}</h3>
                {user.isAdmin && isAdminMode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTerritory(selectedTerritory.id)}
                    className="text-red-500 hover:text-red-600"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: selectedTerritory.color }}
                  />
                  <span className="text-sm">Цвет локации</span>
                </div>

                {/* Создатель локации */}
                {selectedTerritory.createdBy && (
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground">Создатель:</div>
                    <div className="font-medium text-sm">{selectedTerritory.createdBy.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{selectedTerritory.createdBy.username}</div>
                  </div>
                )}

                {/* Владельцы локации */}
                {selectedTerritory.owners && selectedTerritory.owners.length > 0 ? (
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedTerritory.owners.length === 1 ? (
                        <Crown className="h-4 w-4 text-green-500" />
                      ) : (
                        <Users className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium">
                        {selectedTerritory.owners.length === 1 ? 'Заклеймлена' : `Заклеймлена (${selectedTerritory.owners.length} игроков)`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedTerritory.owners.map((owner, index) => (
                        <div key={owner.id} className="text-sm">
                          <div className="font-medium">{owner.displayName}</div>
                          <div className="text-muted-foreground text-xs">
                            @{owner.username}
                          </div>
                          {owner.claimedAt && (
                            <div className="text-muted-foreground text-xs">
                              Заклеймлена {new Date(owner.claimedAt).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                          {index < selectedTerritory.owners!.length - 1 && (
                            <div className="border-b border-muted/30 my-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedTerritory.ownerId && selectedTerritory.owner ? (
                  // Старый формат для совместимости
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Заклеймлена</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{selectedTerritory.owner.displayName}</div>
                      <div className="text-muted-foreground">
                        @{selectedTerritory.owner.username}
                      </div>
                      {selectedTerritory.claimedAt && (
                        <div className="text-muted-foreground text-xs mt-1">
                          Заклеймлена {new Date(selectedTerritory.claimedAt).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Свободная локация</span>
                    </div>
                    
                    {!user.isAdmin && (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleClaimTerritory(selectedTerritory.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Клеймим...
                          </>
                        ) : (
                          'Заклеймить локацию'
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Кнопка клейма для занятых локаций */}
                {!user.isAdmin && ((selectedTerritory.owners?.length || 0) > 0 || selectedTerritory.ownerId) && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleClaimTerritory(selectedTerritory.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Перезаклеймляем...
                      </>
                    ) : (
                      'Переклеймить сюда'
                    )}
                  </Button>
                )}

            

                {selectedTerritory.description && (
                  <div className="p-2 bg-muted/30 rounded text-sm">
                    {selectedTerritory.description}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-border">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm"><b>Кликните на локацию чтобы заклеймить</b></p>
                <p className="text-xs mt-1">Можно заклеймить только одну локацию, </p>
                <p className="text-xs">новый клейм заменит предыдущий</p>
              </div>
            </div>
          )}

          {/* Список карт */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Карты</h3>
              <Badge variant="outline">{templates.length}</Badge>
            </div>

            <div className="space-y-2">
              {templates.map(template => (
                <div
                  key={template.id}
                  onClick={() => !isLoading && handleActivateTemplate(template.id)}
                  className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                    activeTemplate?.id === template.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {template.isActive && (
                      <Badge variant="default" className="text-xs">
                        Активная
                      </Badge>
                    )}
                    {template.territoryCount !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {template.territoryCount} локаций
                      </span>
                    )}
                  </div>
                  {template.createdBy && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Создал: {template.createdBy.displayName}
                    </div>
                  )}
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {user.isAdmin && isAdminMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTemplateForm(true)}
                className="w-full mt-3"
                disabled={isLoading}
              >
                <Plus className="h-3 w-3 mr-1" />
                Создать карту
              </Button>
            )}
          </div>

          {/* Список всех локаций */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Все локации</h3>
              <Badge variant="outline">{territories.length}</Badge>
            </div>

            <div className="space-y-2">
              {territories.map(territory => (
                <div 
                  key={territory.id}
                  onClick={() => {
                    focusOnTerritory(territory);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTerritory?.id === territory.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: territory.color }}
                      />
                      <span className="font-medium text-sm">{territory.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {territory.owners && territory.owners.length > 0 && (
                        <>
                          {territory.owners.length === 1 ? (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <Users className="h-3 w-3 text-green-500" />
                          )}
                          {territory.owners.length > 1 && (
                            <span className="text-xs text-green-600">{territory.owners.length}</span>
                          )}
                        </>
                      )}
                      {territory.ownerId && !territory.owners && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  
                  {/* Создатель */}
                  {territory.createdBy && (
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      Создал: {territory.createdBy.displayName}
                    </div>
                  )}
                  
                  {/* Владельцы */}
                  {territory.owners && territory.owners.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      {territory.owners.length === 1 
                        ? `Заклеймил: ${territory.owners[0].displayName}`
                        : territory.owners.length <= 2
                          ? `Заклеймили: ${territory.owners.map(o => o.displayName).join(', ')}`
                          : `Заклеймили: ${territory.owners[0].displayName} +${territory.owners.length - 1} других`
                      }
                    </div>
                  )}
                  {territory.owner && !territory.owners && (
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      Заклеймил: {territory.owner.displayName}
                    </div>
                  )}
                  
                  {territory.queueCount && territory.queueCount > 0 && (
                    <div className="text-xs text-orange-600 mt-1 ml-5">
                      Очередь: {territory.queueCount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

</div> {/* Закрывающий тег правой панели */}
        </div>
      

      {/* Форма настройки локации */}
      {showTerritoryForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Настройки локации</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTerritoryForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название</label>
                <input
                  type="text"
                  value={territoryForm.name}
                  onChange={(e) => setTerritoryForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background"
                  placeholder="Название локации"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Цвет</label>
                <input
                  type="color"
                  value={territoryForm.color}
                  onChange={(e) => setTerritoryForm(prev => ({...prev, color: e.target.value}))}
                  className="w-full p-1 mt-1 border rounded bg-background h-10"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Описание</label>
                <textarea
                  value={territoryForm.description}
                  onChange={(e) => setTerritoryForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background h-20"
                  placeholder="Описание локации (необязательно)"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setShowTerritoryForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Закрыть
                </Button>
                <Button
                  onClick={() => setShowTerritoryForm(false)}
                  className="flex-1"
                >
                  Применить настройки
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Форма создания карты */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-[500px] border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Создать карту</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTemplateForm(false);
                  setTemplateForm({ name: '', description: '', file: null });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название карты</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background"
                  placeholder="Например: Cash Cup 27 09 25"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Описание</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background h-20"
                  placeholder="Описание карты (необязательно)"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Изображение карты</label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setTemplateForm(prev => ({...prev, file: e.target.files?.[0] || null}))}
                    className="w-full p-2 border rounded bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Загрузите фоновое изображение для карты (JPEG, PNG, WebP)
                  </p>
                  {templateForm.file && (
                    <div className="mt-2 p-2 border rounded bg-green-50">
                      <p className="text-xs text-green-600">
                        Выбран файл: {templateForm.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Размер: {(templateForm.file.size / 1024 / 1024).toFixed(2)} МБ
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateTemplate}
                  disabled={!templateForm.name.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Создание...
                    </>
                  ) : (
                    'Создать карту'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTemplateForm(false);
                    setTemplateForm({ name: '', description: '', file: null });
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />
    </div>
  );
  const handleDeleteTerritory = async (territoryId: string) => {
  // Показываем диалог подтверждения через уведомление
  if (!window.confirm('Вы уверены, что хотите удалить эту локацию? Это действие нельзя отменить.')) return;
  
  try {
    setIsLoading(true);
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch(`/api/territory/territories/${territoryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      await loadTerritories();
      setSelectedTerritory(null);
      showNotification('success', 'Локация удалена', 'Локация успешно удалена с карты');
    } else {
      const errorData = await response.json();
      showNotification('error', 'Ошибка удаления', errorData.error || 'Не удалось удалить локацию');
    }
  } catch (error) {
    console.error('Ошибка удаления локации:', error);
    showNotification('error', 'Сетевая ошибка', 'Не удалось удалить локацию. Проверьте подключение к интернету.');
  } finally {
    setIsLoading(false);
  }
};
}
