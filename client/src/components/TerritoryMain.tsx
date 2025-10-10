import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from "wouter";
import LoadingScreen from './LoadingScreen';
import { 
  Trophy, Clock, Crown, MapPin, Home, User, Settings, Plus, Trash2, Save, X, Loader2, 
  ArrowLeft, AlertCircle, Users, CheckCircle, XCircle, AlertTriangle, Info, ZoomIn, 
  ZoomOut, RotateCcw, Lock, Unlock, Download, Upload, Link as LinkIcon
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
}

interface DropMapSettings {
  id: string;
  templateId: string;
  mode: 'tournament' | 'practice';
  maxPlayersPerSpot: number;
  maxContestedSpots: number;
  allowReclaim: boolean;
  isLocked: boolean;
  template?: {
    name: string;
    mapImageUrl?: string;
  };
  tournament?: {
    name: string;
  };
}

interface EligiblePlayer {
  id: string;
  userId: string;
  displayName: string;
  sourceType?: string;
  addedAt: string;
  user?: {
    username: string;
    displayName: string;
  };
}

interface InviteCode {
  id: string;
  code: string;
  displayName: string;
  isUsed: boolean;
  usedAt?: string;
  expiresAt?: string;
  territoryId?: string;
}

interface NotificationProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

function NotificationModal({ isOpen, type, title, message, onClose }: NotificationProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error': return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'info': return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'border-green-500/20 bg-green-50/50 dark:bg-green-950/50';
      case 'error': return 'border-red-500/20 bg-red-50/50 dark:bg-red-950/50';
      case 'warning': return 'border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/50';
      case 'info': return 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
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
            <Button onClick={onClose}>Понятно</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TerritoryMain() {
  const { user, isLoggedIn, getAuthToken, refreshProfile, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [dropMaps, setDropMaps] = useState<DropMapSettings[]>([]);
  const [activeDropMap, setActiveDropMap] = useState<DropMapSettings | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // DropMap specific state
  const [eligiblePlayers, setEligiblePlayers] = useState<EligiblePlayer[]>([]);
  const [isUserEligible, setIsUserEligible] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  
  // Zoom & Pan
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  const MIN_SCALE = 0.8;
  const MAX_SCALE = 2;
  const CANVAS_SIZE = 1000; // Квадратная карта
  
  // Admin state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    displayName: '',
    expiresInDays: 30,
  });
  
  // Notification
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

  const showNotification = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({ isOpen: true, type, title, message });
  }, []);

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Check authentication
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

  // Load data
 const loadDropMaps = useCallback(async () => {
  if (!isLoggedIn) return;
  
  try {
    const token = getAuthToken();
    if (!token) return;

    // ИСПРАВЛЕНО: используем правильный endpoint
    const response = await fetch('/api/dropmaps', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      setDropMaps(data);
      
      const active = data.find((d: DropMapSettings) => !d.isLocked) || data[0] || null;
      setActiveDropMap(active);
    }
  } catch (err) {
    console.error('Ошибка загрузки DropMaps:', err);
  }
}, [isLoggedIn, getAuthToken]);

 const loadDropMapData = useCallback(async (dropMapId: string) => {
  if (!dropMapId) return;
  
  try {
    const token = getAuthToken();
    if (!token) return;

    // ИСПРАВЛЕНО: находим DropMap из уже загруженного массива
    const settings = dropMaps.find(d => d.id === dropMapId);
    if (!settings) return;
    
    setActiveDropMap(settings);
    
    // Load eligible players
    const playersResponse = await fetch(`/api/dropmap/settings/${dropMapId}/players`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (playersResponse.ok) {
      const players = await playersResponse.json();
      setEligiblePlayers(players);
      
      // Check if current user is eligible
      const isEligible = players.some((p: EligiblePlayer) => p.userId === user?.id);
      setIsUserEligible(isEligible);
    }

    // Load invite codes if admin
    if (user?.isAdmin) {
      const invitesResponse = await fetch(`/api/dropmap/settings/${dropMapId}/invites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (invitesResponse.ok) {
        const invites = await invitesResponse.json();
        setInviteCodes(invites);
      }
    }

    // Load territories for this template
    const territoriesResponse = await fetch(`/api/territory/territories?templateId=${settings.templateId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (territoriesResponse.ok) {
      const territoriesData = await territoriesResponse.json();
      console.log('Loaded territories:', territoriesData); // для отладки
      setTerritories(territoriesData);
    }
  } catch (err) {
    console.error('Ошибка загрузки данных DropMap:', err);
  }
}, [getAuthToken, user, dropMaps]); // ДОБАВЛЕНО: dropMaps в зависимости

  // Initialize
  useEffect(() => {
    const init = async () => {
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
        await loadDropMaps();
      } catch (err) {
        console.error('Ошибка инициализации:', err);
        setError('Не удалось загрузить данные локаций');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [authLoading, isLoggedIn, user, loadDropMaps]);

  // Load data when active DropMap changes
  useEffect(() => {
    if (activeDropMap) {
      loadDropMapData(activeDropMap.id);
    }
  }, [activeDropMap, loadDropMapData]);

 // Canvas drawing
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Очищаем весь canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Применяем трансформации для зума и пана
  ctx.translate(panOffset.x, panOffset.y);
  ctx.scale(scale, scale);

  // Рисуем фоновое изображение если есть
  if (activeDropMap?.template?.mapImageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Рисуем фон
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      // Рисуем территории поверх
      drawTerritories(ctx);
    };
    img.src = activeDropMap.template.mapImageUrl;
  } else {
    // Если нет фона, просто рисуем территории
    drawTerritories(ctx);
  }

  function drawTerritories(ctx: CanvasRenderingContext2D) {
    // Рисуем территории
    territories.forEach(territory => {
      if (territory.points.length < 3) return;

      // Полигон
      ctx.beginPath();
      ctx.moveTo(territory.points[0].x, territory.points[0].y);
      territory.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();

      // Заливка
      const hasOwner = !!territory.ownerId;
      const alpha = hasOwner ? '80' : '40';
      ctx.fillStyle = `${territory.color}${alpha}`;
      ctx.fill();

      // Обводка
      ctx.strokeStyle = territory.color;
      ctx.lineWidth = (selectedTerritory?.id === territory.id ? 3 : 2) / scale;
      ctx.stroke();

      // Надпись
      if (scale > 0.5 && territory.points.length >= 3) {
        const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
        const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(1/scale, 1/scale);
        
        ctx.font = 'bold 16px Montserrat, "Inter", system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = territory.owner ? territory.owner.displayName : territory.name;
        
        // Shadow эффект
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, 0, 0);
        
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
        ctx.fillText(text, 0, 0);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText(text, 0, 0);
        
        ctx.restore();
      }
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}, [territories, selectedTerritory, scale, panOffset, activeDropMap]);


  // Handle canvas interaction
 const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  
  // Получаем координаты клика относительно canvas
  const canvasX = (event.clientX - rect.left) / rect.width * CANVAS_SIZE;
  const canvasY = (event.clientY - rect.top) / rect.height * CANVAS_SIZE;
  
  // Применяем обратные трансформации зума и пана
  const worldX = (canvasX - panOffset.x) / scale;
  const worldY = (canvasY - panOffset.y) / scale;

  return { x: worldX, y: worldY };
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

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingMap) return;

    // Check if map is locked
    if (activeDropMap?.isLocked && !user?.isAdmin) {
      showNotification('warning', 'Карта заблокирована', 'Администратор запретил изменять метки');
      return;
    }

    // Check if user is eligible
    if (!isUserEligible && !user?.isAdmin) {
      showNotification('warning', 'Доступ ограничен', 'Вы не в списке игроков, которые могут ставить метки');
      return;
    }

    const coords = getCanvasCoordinates(event);
    
    const clickedTerritory = territories.find(territory => 
      isPointInTerritory(coords, territory)
    );

    if (clickedTerritory) {
      setSelectedTerritory(clickedTerritory);
      
      // Auto-claim for non-admin users
      if (!user?.isAdmin || !isAdminMode) {
        handleClaimTerritory(clickedTerritory.id);
      }
    } else {
      setSelectedTerritory(null);
    }
  }, [isDraggingMap, territories, user, isUserEligible, activeDropMap, getCanvasCoordinates, isPointInTerritory, isAdminMode, showNotification]);

  const handleClaimTerritory = async (territoryId: string) => {
    if (activeDropMap?.isLocked && !user?.isAdmin) {
      showNotification('warning', 'Карта заблокирована', 'Нельзя изменять метки');
      return;
    }

    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        showNotification('error', 'Ошибка авторизации', 'Требуется авторизация');
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
          replaceExisting: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification('success', 'Локация заклеймлена', 'Вы успешно заклеймили локацию!');
        await loadDropMapData(activeDropMap!.id);
      } else {
        const errorData = await response.json();
        if (!errorData.error.includes('уже заклеймлена')) {
          showNotification('error', 'Ошибка клейма', errorData.error || 'Не удалось заклеймить локацию');
        }
      }
    } catch (error) {
      console.error('Ошибка клейма:', error);
      showNotification('error', 'Сетевая ошибка', 'Не удалось подключиться к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  // Zoom & Pan handlers
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
  e.preventDefault();
  
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left) / rect.width * CANVAS_SIZE;
  const canvasY = (e.clientY - rect.top) / rect.height * CANVAS_SIZE;
  const worldX = (canvasX - panOffset.x * scale) / scale;
  const worldY = (canvasY - panOffset.y * scale) / scale;
  
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(Math.max(scale * zoomFactor, MIN_SCALE), MAX_SCALE);
  
  if (newScale !== scale) {
    const newPanX = (canvasX - worldX * newScale) / newScale;
    const newPanY = (canvasY - worldY * newScale) / newScale;
    setScale(newScale);
    setPanOffset({ x: newPanX, y: newPanY });
  }
}, [scale, panOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
      setIsDraggingMap(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingMap) return;
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    setPanOffset(prev => ({ x: prev.x + deltaX / scale, y: prev.y + deltaY / scale }));
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDraggingMap(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Admin functions
  const handleToggleLock = async () => {
    if (!activeDropMap) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/dropmap/settings/${activeDropMap.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isLocked: !activeDropMap.isLocked })
      });

      if (response.ok) {
        showNotification('success', 'Статус изменен', activeDropMap.isLocked ? 'Карта разблокирована' : 'Карта заблокирована');
        await loadDropMapData(activeDropMap.id);
      }
    } catch (error) {
      showNotification('error', 'Ошибка', 'Не удалось изменить статус карты');
    }
  };

  const handleCreateInvite = async () => {
    if (!activeDropMap || !inviteForm.displayName.trim()) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/dropmap/settings/${activeDropMap.id}/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteForm)
      });

      if (response.ok) {
        const data = await response.json();
        const inviteUrl = `${window.location.origin}/dropmap/invite/${data.code}`;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(inviteUrl);
        
        showNotification('success', 'Инвайт создан', `Ссылка скопирована в буфер обмена`);
        setShowInviteDialog(false);
        setInviteForm({ displayName: '', expiresInDays: 30 });
        await loadDropMapData(activeDropMap.id);
      }
    } catch (error) {
      showNotification('error', 'Ошибка', 'Не удалось создать инвайт');
    }
  };

  const handleExportMap = async () => {
    if (!activeDropMap?.template) return;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create a temporary canvas with background
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1200;
      exportCanvas.height = 800;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Draw background image if exists
      if (activeDropMap.template.mapImageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = activeDropMap.template.mapImageUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        ctx.drawImage(img, 0, 0, 1200, 800);
      }

      // Draw territories from main canvas
      ctx.drawImage(canvas, 0, 0);

      // Export as PNG
      exportCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dropmap-${activeDropMap.template?.name}-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          showNotification('success', 'Экспорт завершен', 'Карта сохранена');
        }
      }, 'image/png');
    } catch (error) {
      showNotification('error', 'Ошибка экспорта', 'Не удалось экспортировать карту');
    }
  };

  // Compute player territories
  const playerTerritories = useMemo(() => {
    const map = new Map<string, Territory[]>();
    eligiblePlayers.forEach(player => {
      if (player.userId) {
        const playerTerrs = territories.filter(t => t.ownerId === player.userId);
        if (playerTerrs.length > 0) {
          map.set(player.userId, playerTerrs);
        }
      }
    });
    return map;
  }, [eligiblePlayers, territories]);

  // Loading state
  if (authLoading || isLoading) {
    return <LoadingScreen message="Загрузка локаций..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div className="text-red-500 font-semibold">{error}</div>
          <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold">DropMap</span>
            </div>
            
            {activeDropMap && (
              <Badge variant="secondary">{activeDropMap.template?.name}</Badge>
            )}
            
            {activeDropMap?.isLocked && (
              <Badge variant="destructive">
                <Lock className="h-3 w-3 mr-1" />
                Заблокирована
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Zoom controls */}
            <div className="hidden lg:flex items-center gap-1">
              <button onClick={() => setScale(prev => Math.max(prev / 1.2, MIN_SCALE))} 
                className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-medium min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(prev => Math.min(prev * 1.2, MAX_SCALE))}
                className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button onClick={resetZoom}
                className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Admin controls */}
            {user?.isAdmin && isAdminMode && activeDropMap && (
              <>
                <Button onClick={handleToggleLock} size="sm" variant="outline">
                  {activeDropMap.isLocked ? <Unlock className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
                  {activeDropMap.isLocked ? 'Разблокировать' : 'Заблокировать'}
                </Button>
                <Button onClick={handleExportMap} size="sm" variant="outline">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Экспорт
                </Button>
                <Button onClick={() => setShowInviteDialog(true)} size="sm" variant="outline">
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  Инвайт
                </Button>
              </>
            )}

            {/* Admin toggle */}
            {user?.isAdmin && (
              <div className="flex items-center gap-2 pl-3 border-l">
                <span className="text-xs text-muted-foreground hidden md:inline">Admin</span>
                <button onClick={() => setIsAdminMode(!isAdminMode)}
                  className={cn("relative inline-flex h-5 w-8 items-center rounded-full transition-colors",
                    isAdminMode ? 'bg-primary' : 'bg-muted')}>
                  <span className={cn("inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                    isAdminMode ? 'translate-x-3.5' : 'translate-x-0.5')} />
                </button>
                <Settings className={cn("h-3 w-3", isAdminMode ? 'text-primary' : 'text-muted-foreground')} />
              </div>
            )}
            
            <Button onClick={() => setLocation('/')} variant="ghost" size="sm">
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Sidebar - List of Maps */}
        <div className="w-64 border-r bg-card/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3">Карты ({dropMaps.length})</h3>
            <div className="space-y-2">
              {dropMaps.map((dropMap) => (
                <div 
                  key={dropMap.id}
                  onClick={() => loadDropMapData(dropMap.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    activeDropMap?.id === dropMap.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{dropMap.template?.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant={dropMap.mode === 'tournament' ? 'default' : 'secondary'} className="text-xs">
                        {dropMap.mode}
                      </Badge>
                      {dropMap.isLocked && (
                        <Lock className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                  {dropMap.tournament?.name && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {dropMap.tournament.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

       {/* Map Area */}
<div className="flex-1 relative bg-background overflow-hidden flex items-center justify-center">
  {/* Canvas квадратный */}
  <canvas
    ref={canvasRef}
    width={CANVAS_SIZE}
    height={CANVAS_SIZE}
    onClick={handleCanvasClick}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onWheel={handleWheel}
    onContextMenu={(e) => e.preventDefault()}
    className="max-w-full max-h-full"
    style={{ 
      cursor: isDraggingMap ? 'grabbing' : 'crosshair',
      aspectRatio: '1 / 1'
    }}
  />
  
  {/* Instructions */}
  <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border text-sm pointer-events-none">
    <div className="text-muted-foreground">
      <div>Скролл: Зум</div>
      <div>Shift + ЛКМ: Двигать картой</div>
      <div>Клик: Выбрать локацию</div>
    </div>
  </div>
  
  {/* Status indicators */}
  {!isUserEligible && !user?.isAdmin && (
    <div className="absolute top-4 left-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 pointer-events-none">
      <div className="flex items-center gap-2 text-yellow-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Вы не в списке допущенных игроков</span>
      </div>
    </div>
  )}

  {activeDropMap?.isLocked && !user?.isAdmin && (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 pointer-events-none">
      <div className="flex items-center gap-2 text-red-600">
        <Lock className="h-4 w-4" />
        <span className="text-sm font-medium">Карта заблокирована администратором</span>
      </div>
    </div>
  )}
</div>

        {/* Right Sidebar */}
        <div className="w-80 border-l bg-card/30 backdrop-blur-sm overflow-y-auto">
          {/* DropMap Info */}
          {activeDropMap && (
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-3">Настройки DropMap</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Макс. на локации:</span>
                  <span className="font-medium">{activeDropMap.maxPlayersPerSpot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Макс. контестов:</span>
                  <span className="font-medium">{activeDropMap.maxContestedSpots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Перезаклейм:</span>
                  <Badge variant={activeDropMap.allowReclaim ? 'default' : 'secondary'}>
                    {activeDropMap.allowReclaim ? 'Разрешен' : 'Запрещен'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Статус:</span>
                  <Badge variant={activeDropMap.isLocked ? 'destructive' : 'default'}>
                    {activeDropMap.isLocked ? 'Заблокирована' : 'Активна'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          {/* Eligible Players with Claims */}
          {eligiblePlayers.length > 0 && (
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Игроки и локации ({eligiblePlayers.length})</h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {eligiblePlayers.map(player => {
                  const playerClaims = playerTerritories.get(player.userId || '') || [];
                  return (
                    <div key={player.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{player.displayName}</div>
                            {player.user && (
                              <div className="text-xs text-muted-foreground">@{player.user.username}</div>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{playerClaims.length} локаций</Badge>
                      </div>
                      {playerClaims.length > 0 ? (
                        <div className="space-y-1 ml-6">
                          {playerClaims.map(territory => (
                            <div 
                              key={territory.id}
                              onClick={() => setSelectedTerritory(territory)}
                              className={cn(
                                "text-xs cursor-pointer hover:underline",
                                selectedTerritory?.id === territory.id && 'font-semibold text-primary'
                              )}
                            >
                              • {territory.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground ml-6">Нет заклеймленных локаций</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invite Codes (Admin only) */}
          {user?.isAdmin && isAdminMode && inviteCodes.length > 0 && (
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Инвайт-коды</h3>
                <Badge variant="outline">{inviteCodes.length}</Badge>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {inviteCodes.map(invite => (
                  <div key={invite.id} className="p-2 rounded bg-muted/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{invite.displayName}</span>
                      <Badge variant={invite.isUsed ? 'secondary' : 'default'} className="text-xs">
                        {invite.isUsed ? 'Использован' : 'Активен'}
                      </Badge>
                    </div>
                    <code className="text-xs bg-background px-2 py-1 rounded block">
                      {invite.code}
                    </code>
                    {invite.isUsed && invite.territoryId && (
                      <div className="text-xs text-muted-foreground">
                        Использован на: {territories.find(t => t.id === invite.territoryId)?.name || 'Unknown'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Selected Territory */}
          {selectedTerritory ? (
  <div className="p-4 border-b">
    <h3 className="font-semibold mb-3">{selectedTerritory.name}</h3>
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedTerritory.color }} />
        <span className="text-sm">Цвет локации</span>
      </div>
      
      {/* ИСПРАВЛЕНО: используем owner вместо owners */}
      {selectedTerritory.owner ? (
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-green-500" />
            <span className="font-medium">Заклеймлена</span>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <div className="font-medium">{selectedTerritory.owner.displayName}</div>
              <div className="text-muted-foreground text-xs">@{selectedTerritory.owner.username}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Свободная локация</span>
          </div>
          
          {!activeDropMap?.isLocked && isUserEligible && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleClaimTerritory(selectedTerritory.id)}
              disabled={isLoading}
            >
              {isLoading ? 'Клеймим...' : 'Заклеймить локацию'}
            </Button>
          )}

          {activeDropMap?.isLocked && (
            <div className="text-xs text-muted-foreground text-center">
              Карта заблокирована
            </div>
          )}

          {!isUserEligible && !user?.isAdmin && (
            <div className="text-xs text-yellow-600 text-center">
              Вы не допущены к участию
            </div>
          )}
        </div>
      )}
    </div>
  </div>
) : (
            <div className="p-4 border-b text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">Кликните на локацию</p>
              <p className="text-xs mt-1">Для выбора и клейма</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Code Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Создать инвайт-код</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteForm({ displayName: '', expiresInDays: 30 });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Имя игрока</label>
                <input
                  type="text"
                  value={inviteForm.displayName}
                  onChange={(e) => setInviteForm(prev => ({...prev, displayName: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background"
                  placeholder="Player1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Это имя будет отображаться на карте
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Срок действия (дней)</label>
                <input
                  type="number"
                  value={inviteForm.expiresInDays}
                  onChange={(e) => setInviteForm(prev => ({...prev, expiresInDays: parseInt(e.target.value) || 30}))}
                  className="w-full p-2 mt-1 border rounded bg-background"
                  min="1"
                  max="365"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateInvite}
                  disabled={!inviteForm.displayName.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Создание...
                    </>
                  ) : (
                    'Создать код'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteForm({ displayName: '', expiresInDays: 30 });
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
}