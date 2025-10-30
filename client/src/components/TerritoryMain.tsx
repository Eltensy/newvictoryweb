// client/src/components/TerritoryMain.tsx - ПОЛНАЯ И АДАПТИРОВАННАЯ ВЕРСИЯ

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTerritorySocket } from '@/hooks/useTerritorySocket';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useRoute } from "wouter";
import LoadingScreen from './LoadingScreen';
import { 
  Trophy, Crown, MapPin, Home, User, Settings, Loader2, 
  AlertCircle, Users, CheckCircle, XCircle, AlertTriangle, Info, ZoomIn, 
  ZoomOut, RotateCcw, Lock, Unlock, Copy, ExternalLink, Plus, Trash2, 
  Edit, Save, X, Undo, UserPlus, Upload, Link as LinkIcon, Image as ImageIcon, ChevronDown,
  Wifi, WifiOff
} from 'lucide-react';
import { cn } from "@/lib/utils";

// Interfaces
interface Territory {
  id: string;
  name: string;
  ownerId?: string;
  owner?: { id: string; username: string; displayName: string; };
  claimedAt?: string;
  color: string;
  points: { x: number; y: number }[];
  description?: string;
  isActive: boolean;
  mapId: string;
  maxPlayers: number;
  claims?: Array<{
    userId: string;
    username?: string;
    displayName?: string;
    claimedAt?: string;
  }>;
  claimCount?: number;
}
interface DropMap {
  id: string;
  name: string;
  description?: string;
  mapImageUrl?: string;
  mode: 'tournament' | 'practice';
  isLocked: boolean;
  tournamentId?: string;
  tournament?: { name: string; };
}
interface ExpandedTerritories {
  [territoryId: string]: boolean;
}
interface EligiblePlayer {
  id: string;
  userId: string;
  displayName: string;
  sourceType?: string;
  addedAt: string;
  user?: { username: string; displayName: string; };
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

// Компонент NotificationModal (без изменений)
function NotificationModal({ isOpen, type, title, message, onClose }: any) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  const getStyles = () => {
    switch (type) {
      case 'success': return { border: 'border-green-200 dark:border-green-800', bg: 'bg-green-50 dark:bg-green-950' };
      case 'error': return { border: 'border-red-200 dark:border-red-800', bg: 'bg-red-50 dark:bg-red-950' };
      case 'warning': return { border: 'border-yellow-200 dark:border-yellow-800', bg: 'bg-yellow-50 dark:bg-yellow-950' };
      case 'info': return { border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50 dark:bg-blue-950' };
    }
  };
  const styles = getStyles();

  return (
    <div className={cn("fixed bottom-4 right-4 z-[200] transition-all duration-300 ease-out", isExiting ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0')}>
      <div className={cn("bg-card border rounded-lg shadow-lg p-4 max-w-sm w-full", styles?.border, styles?.bg)}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          </div>
          <button onClick={() => { setIsExiting(true); setTimeout(onClose, 300); }} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const TerritoryPolygon = React.memo(({ territory, isSelected, onClick, onContextMenu, scale }: { territory: Territory; isSelected: boolean; onClick: (e: React.MouseEvent) => void; onContextMenu: (e: React.MouseEvent) => void; scale: number; }) => {
  // Убираем дубликаты по userId - memoized
  const uniqueClaims = useMemo(() =>
    territory.claims ? territory.claims.filter((claim, index, self) =>
      index === self.findIndex(c => c.userId === claim.userId)
    ) : [],
    [territory.claims]
  );

  const hasClaims = uniqueClaims.length > 0;
  const claimCount = uniqueClaims.length;

  // Memoize expensive calculations
  const points = useMemo(() =>
    territory.points.map(p => `${p.x},${p.y}`).join(' '),
    [territory.points]
  );

  const { centerX, centerY } = useMemo(() => ({
    centerX: territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length,
    centerY: territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length
  }), [territory.points]);
  
  // Определяем цвет: красный если 2+ игроков, иначе оригинальный
  const displayColor = claimCount >= 2 ? '#EF4444' : territory.color;
  
  // Функция для расчета позиций текста в зависимости от количества игроков
  const getTextPositions = (count: number) => {
    const offset = 20 / scale;
    
    if (count === 1) {
      return [{ x: centerX, y: centerY }];
    } else if (count === 2) {
      return [
        { x: centerX, y: centerY - offset },
        { x: centerX, y: centerY + offset },
      ];
    } else if (count === 3) {
      return [
        { x: centerX, y: centerY - offset * 1.2 },
        { x: centerX, y: centerY },
        { x: centerX, y: centerY + offset * 1.2 },
      ];
    } else if (count === 4) {
      return [
        { x: centerX, y: centerY - offset * 1.5 },
        { x: centerX, y: centerY - offset * 0.5 },
        { x: centerX, y: centerY + offset * 0.5 },
        { x: centerX, y: centerY + offset * 1.5 },
      ];
    } else {
      const positions = [];
      const totalHeight = offset * 2 * (count - 1);
      const startY = centerY - totalHeight / 2;
      
      for (let i = 0; i < count; i++) {
        positions.push({
          x: centerX,
          y: startY + (totalHeight / (count - 1)) * i
        });
      }
      return positions;
    }
  };
  
  return (
    <g className="territory-group">
      <polygon 
        points={points} 
        fill={displayColor} 
        fillOpacity={hasClaims ? 0.5 : 0.25} 
        stroke={displayColor} 
        strokeWidth={isSelected ? 3 / scale : 2 / scale} 
        className={cn(
          "transition-all duration-200 cursor-pointer", 
          hasClaims ? "hover:fill-opacity-60" : "hover:fill-opacity-35"
        )} 
        onClick={onClick} 
        onContextMenu={onContextMenu} 
      />
      {hasClaims && scale > 0.5 && uniqueClaims.length > 0 && (() => {
        const positions = getTextPositions(uniqueClaims.length);
        
        return uniqueClaims.map((claim, index) => {
          const pos = positions[index];
          if (!pos) return null;
          
          return (
            <text 
              key={`${claim.userId}-${index}`}
              x={pos.x} 
              y={pos.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="pointer-events-none select-none" 
              style={{ 
                fontSize: `${14 / scale}px`, 
                fontWeight: 'bold', 
                fontFamily: 'Montserrat, Inter, system-ui, sans-serif', 
                fill: '#ffffff', 
                paintOrder: 'stroke', 
                stroke: 'rgba(0, 0, 0, 0.9)', 
                strokeWidth: `${3 / scale}px`, 
                strokeLinecap: 'round', 
                strokeLinejoin: 'round' 
              }}
            >
              {claim.displayName || territory.name}
            </text>
          );
        });
      })()}
    </g>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-renders
  return (
    prevProps.territory.id === nextProps.territory.id &&
    prevProps.territory.color === nextProps.territory.color &&
    prevProps.territory.claims?.length === nextProps.territory.claims?.length &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.scale === nextProps.scale
  );
});

function DrawingPoints({ points, color, scale }: { points: { x: number; y: number }[]; color: string; scale: number; }) {
  if (points.length === 0) return null;
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <g className="drawing-group pointer-events-none">
      {points.length >= 3 && (<polygon points={pointsStr} fill={color} fillOpacity={0.25} stroke="none" />)}
      <polyline points={pointsStr} fill="none" stroke={color} strokeWidth={3 / scale} />
      {points.map((point, index) => (
        <g key={index}>
          <circle cx={point.x} cy={point.y} r={6 / scale} fill={color} stroke="#fff" strokeWidth={2 / scale} />
          <text x={point.x} y={point.y - 12 / scale} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: `${14 / scale}px`, fontWeight: 'bold', fill: '#fff', paintOrder: 'stroke', stroke: color, strokeWidth: `${2 / scale}px` }}>
            {index + 1}
          </text>
        </g>
      ))}
    </g>
  );
}
function TerritoryContextMenu({ territory, onEdit, onDelete, onClose, position }: any) {
  return (
    <div className="fixed bg-card border rounded-lg shadow-2xl p-2 z-[150] min-w-[200px]" style={{ left: position.x, top: position.y }}>
      <div className="space-y-1">
        <button onClick={() => { onEdit(territory); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors text-sm">
          <Edit className="h-4 w-4" /> Редактировать локацию
        </button>
        <button onClick={() => { onDelete(territory); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-destructive/10 text-destructive transition-colors text-sm">
          <Trash2 className="h-4 w-4" /> Удалить локацию
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors text-sm">
          <X className="h-4 w-4" /> Отмена
        </button>
      </div>
    </div>
  );
}

export default function TerritoryMain() {
  const { user, isLoggedIn, getAuthToken, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/dropmap/:dropmapId');
  const dropmapIdFromUrl = params?.dropmapId;
  
  const svgRef = useRef<SVGSVGElement>(null);
  const mapImageInputRef = useRef<HTMLInputElement>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [allMaps, setAllMaps] = useState<DropMap[]>([]);
  const [activeMap, setActiveMap] = useState<DropMap | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingMapName, setEditingMapName] = useState('');
  
  const [eligiblePlayers, setEligiblePlayers] = useState<EligiblePlayer[]>([]);
  const [isUserEligible, setIsUserEligible] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  const [expandedTerritories, setExpandedTerritories] = useState<ExpandedTerritories>({});

  const [shouldConnectSocket, setShouldConnectSocket] = useState(false);

  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const SVG_SIZE = 1000;
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ territory: Territory; x: number; y: number } | null>(null);
  
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [newSpotForm, setNewSpotForm] = useState<{ name: string; description: string; maxPlayers: number | string }>({ name: '', description: '', maxPlayers: 999 });
  
  // Dialog states
  const [showCreateMapDialog, setShowCreateMapDialog] = useState(false);
  const [showEditTerritoryDialog, setShowEditTerritoryDialog] = useState(false);
  const [showPlayersDialog, setShowPlayersDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAssignPlayerDialog, setShowAssignPlayerDialog] = useState(false);
  
  // Form states
  const [mapForm, setMapForm] = useState({ sourceMapId: '', name: '', description: '' });
  const [editTerritoryForm, setEditTerritoryForm] = useState<{
  id: string;
  name: string;
  description: string;
  maxPlayers: number | string;
}>({
  id: '',
  name: '',
  description: '',
  maxPlayers: 999
});
const [localSelectedPlayer, setLocalSelectedPlayer] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [inviteForm, setInviteForm] = useState({ displayName: '', expiresInDays: 30 });
  const [importForm, setImportForm] = useState({ tournamentId: '', topN: '', positions: '' });
  const [settingsForm, setSettingsForm] = useState({ isLocked: false, mapImageFile: null as File | null });
  const [assignPlayerForm, setAssignPlayerForm] = useState({ territoryId: '', playerId: '' });
  
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; }>({ isOpen: false, type: 'info', title: '', message: '' });


  const showNotification = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({ isOpen: true, type, title, message });
  }, []);

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setLocation('/');
    }
  }, [isLoggedIn, user, setLocation, authLoading]);

  const getCurrentMapUrl = useCallback(() => {
    if (!activeMap) return '';
    return `${window.location.origin}/dropmap/${activeMap.id}`;
  }, [activeMap]);

  const copyMapLink = useCallback(async () => {
    const url = getCurrentMapUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showNotification('success', 'Ссылка скопирована', 'Ссылка на карту скопирована в буфер обмена');
    } catch (error) {
      showNotification('error', 'Ошибка', 'Не удалось скопировать ссылку');
    }
  }, [getCurrentMapUrl, showNotification]);

  // ===================================================
  // ========== DATA FETCHING (ADAPTED) ==========
  // ===================================================

  const loadAllMaps = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const token = getAuthToken();
      if (!token) return [];
      const response = await fetch('/api/maps', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setAllMaps(data);
        return data;
      }
    } catch (err) {
      console.error('Ошибка загрузки карт:', err);
      showNotification('error', 'Ошибка загрузки', 'Не удалось загрузить список карт');
    }
    return [];
  }, [isLoggedIn, getAuthToken, showNotification]);

 const loadMapData = useCallback(async (mapId: string) => {
  if (!mapId) return;
  
  try {
    const token = getAuthToken();
    if (!token) return;

    // ✅ ОДИН запрос вместо трёх
    const response = await fetch(`/api/maps/${mapId}/full-data`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load map data');
    }

    const data = await response.json();
    
    // ✅ Обновить все данные сразу
    setTerritories(data.territories);
    setEligiblePlayers(data.eligiblePlayers);
    setIsUserEligible(data.isUserEligible);
    if (user?.isAdmin) {
      setInviteCodes(data.inviteCodes);
    }
  } catch (err) {
    console.error('Ошибка загрузки данных карты:', err);
    showNotification('error', 'Ошибка', 'Не удалось загрузить данные карты');
  }
}, [getAuthToken, user, showNotification]);
  
  const fetchTournaments = useCallback(async () => {
    if (!user?.isAdmin) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch('/api/admin/tournaments', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setTournaments(await response.json());
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  }, [getAuthToken, user]);

  const fetchAllUsers = useCallback(async () => {
    if (!user?.isAdmin) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setAllUsers(await response.json());
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [getAuthToken, user]);

 useEffect(() => {
   const init = async () => {
     if (authLoading || !isLoggedIn || !user || isInitialized) {
       return;
     }

     setIsLoading(true);
     setError(null);

     try {
       const token = getAuthToken();
       if (!token) {
         return;
       }

       const mapsResponse = await fetch('/api/maps', {
         headers: { 'Authorization': `Bearer ${token}` }
       });

       if (!mapsResponse.ok) {
         throw new Error('Failed to load maps');
       }

       const maps = await mapsResponse.json();
       setAllMaps(maps);

       let targetMap = null;
       if (dropmapIdFromUrl) {
         targetMap = maps.find((m: DropMap) => m.id === dropmapIdFromUrl);
       }

       if (!targetMap) {
         targetMap = maps.find((m: DropMap) => !m.isLocked) || maps[0];
       }

       if (!targetMap) {
         setIsLoading(false);
         return;
       }

       setLocation(`/dropmap/${targetMap.id}`, { replace: true });
       setActiveMap(targetMap);
       setSettingsForm({
         isLocked: targetMap.isLocked,
         mapImageFile: null,
       });

       const fullDataResponse = await fetch(`/api/maps/${targetMap.id}/full-data`, {
         headers: { 'Authorization': `Bearer ${token}` }
       });

       if (!fullDataResponse.ok) {
         throw new Error('Failed to load map data');
       }

       const fullData = await fullDataResponse.json();

       setTerritories(fullData.territories || []);
       setEligiblePlayers(fullData.eligiblePlayers || []);
       setIsUserEligible(fullData.isUserEligible || false);

       if (user.isAdmin) {
         setInviteCodes(fullData.inviteCodes || []);
       }

       if (user.isAdmin) {
         Promise.all([
           fetch('/api/admin/tournaments', {
             headers: { 'Authorization': `Bearer ${token}` }
           }).then(r => r.ok ? r.json() : []),
           fetch('/api/admin/users', {
             headers: { 'Authorization': `Bearer ${token}` }
           }).then(r => r.ok ? r.json() : [])
         ]).then(([tournaments, users]) => {
           setTournaments(tournaments);
           setAllUsers(users);
         }).catch(() => {});
       }

       setIsInitialized(true);

     } catch (err) {
       setError('Не удалось загрузить данные локаций');
     } finally {
       setIsLoading(false);
     }
   };

   init();
 }, [authLoading, isLoggedIn, user, isInitialized, dropmapIdFromUrl, getAuthToken, setLocation]);
 

const { isConnected } = useTerritorySocket(
  activeMap?.id ?? null,
  useCallback((update: { territoryId: string; territory: any; timestamp: string }) => {
    setTerritories(prev => {
      const updated = prev.map(t =>
        t.id === update.territoryId
          ? { ...t, ...update.territory, claims: update.territory.claims || [] }
          : t
      );
      return updated;
    });
  }, []),
  useCallback((update: { mapId: string; timestamp: string }) => {
    if (activeMap?.id === update.mapId) {
      loadMapData(update.mapId);
    }
  }, [activeMap?.id, loadMapData])
);

  
  // ===================================================
  // ========== EVENT HANDLERS (ADAPTED) ==========
  // ===================================================

  const handleSaveMapName = async (mapId: string) => {
    if (!editingMapName.trim()) {
      showNotification('error', 'Ошибка', 'Название не может быть пустым');
      return;
    }
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingMapName }),
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Название карты обновлено');
        setEditingMapId(null);
        setEditingMapName('');
        await loadAllMaps();
      } else {
        const error = await response.json();
        showNotification('error', 'Ошибка', error.error || 'Не удалось обновить название');
      }
    } catch (error) {
      showNotification('error', 'Ошибка', 'Не удалось подключиться к серверу');
    }
  };

  const handleSelectMap = useCallback(async (mapId: string) => {
  setLocation(`/dropmap/${mapId}`, { replace: true });
  const foundMap = allMaps.find(m => m.id === mapId);
  if (foundMap) {
    // Показываем индикатор загрузки
    setIsMapLoading(true);

    // Загружаем данные карты
    await loadMapData(foundMap.id);

    // После загрузки данных устанавливаем активную карту
    setActiveMap(foundMap);
    setSettingsForm({
      isLocked: foundMap.isLocked,
      mapImageFile: null,
    });

    // Скрываем индикатор загрузки
    setIsMapLoading(false);
  }
}, [allMaps, setLocation, loadMapData]);
  
  const handleClaimTerritory = async (territoryId: string) => {
    if (activeMap?.isLocked && !user?.isAdmin) {
      showNotification('warning', 'Карта заблокирована', 'Администратор запретил изменять метки');
      return;
    }
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error('Требуется авторизация');
      const response = await fetch(`/api/territories/${territoryId}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (response.ok) {
        showNotification('success', 'Локация заклеймлена', 'Вы успешно заклеймили локацию!');
        // WebSocket обновит состояние автоматически
      } else {
        const errorData = await response.json();
        showNotification('error', 'Ошибка клейма', errorData.error || 'Не удалось заклеймить');
      }
    } catch (error: any) {
      showNotification('error', 'Сетевая ошибка', error.message || 'Не удалось подключиться к серверу');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteMap = async (mapId: string, mapName: string) => {
    if (!confirm(`Удалить карту "${mapName}"? Это действие необратимо.`)) return;
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error('Требуется авторизация');
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Карта удалена');
        const updatedMaps = await loadAllMaps();
        if (activeMap?.id === mapId) {
          const firstMap = updatedMaps?.find((m: DropMap) => !m.isLocked) || updatedMaps?.[0];
          if (firstMap) {
            handleSelectMap(firstMap.id);
          } else {
            setLocation('/', { replace: true });
          }
        }
      } else {
        const error = await response.json();
        showNotification('error', 'Ошибка', error.error || 'Не удалось удалить карту');
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось подключиться к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewMap = async () => {
    if (!mapForm.name.trim()) {
      showNotification('error', 'Ошибка', 'Введите название карты');
      return;
    }
    try {
      const token = getAuthToken();
      if (!token) return;
      const body: any = { name: mapForm.name.trim(), description: mapForm.description };
      let response;
      if (mapForm.sourceMapId) {
        response = await fetch(`/api/maps/copy/${mapForm.sourceMapId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch('/api/maps', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (response.ok) {
        showNotification('success', 'Успешно', 'Карта создана');
        setShowCreateMapDialog(false);
        setMapForm({ sourceMapId: '', name: '', description: '' });
        const newMap = await response.json();
        await loadAllMaps();
        handleSelectMap(newMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось создать карту');
    }
  };

  const handleSaveSettings = async () => {
    if (!activeMap) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const formData = new FormData();
      formData.append('isLocked', String(settingsForm.isLocked));
      if (settingsForm.mapImageFile) {
        formData.append('mapImage', settingsForm.mapImageFile);
      }
      const response = await fetch(`/api/maps/${activeMap.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Настройки обновлены');
        setShowSettingsDialog(false);
        const updatedMap = await response.json();
        setActiveMap(updatedMap);
        setAllMaps(prev => prev.map(m => m.id === updatedMap.id ? updatedMap : m));
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось обновить настройки');
    }
  };

  const handleAddPlayers = async () => {
    if (!activeMap || selectedUsers.length === 0) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/maps/${activeMap.id}/players`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers }),
      });
      if (response.ok) {
        const data = await response.json();
        showNotification('success', 'Успешно', `Добавлено игроков: ${data.added}`);
        setShowPlayersDialog(false);
        setSelectedUsers([]);
        await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось добавить игроков');
    }
  };

  const handleRemovePlayer = async (userId: string) => {
    if (!activeMap) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/maps/${activeMap.id}/players/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Игрок удален');
        await loadMapData(activeMap.id);
      } else {
        throw new Error('Не удалось удалить игрока');
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message);
    }
  };

  const handleCreateInvite = async () => {
    if (!activeMap) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/maps/${activeMap.id}/invites`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (response.ok) {
        const data = await response.json();
        const inviteUrl = `${window.location.origin}/dropmap/invite/${data.code}`;
        navigator.clipboard.writeText(inviteUrl);
        showNotification('success', 'Успешно', `Код создан и скопирован: ${data.code}`);
        setShowInviteDialog(false);
        await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось создать код');
    }
  };
  
  const handleDeleteInvite = async (code: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/invites/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Код удален');
        if (activeMap) await loadMapData(activeMap.id);
      } else {
        throw new Error('Не удалось удалить код');
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message);
    }
  };
  
  const handleImportPlayers = async () => {
    if (!activeMap || !importForm.tournamentId) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const body: any = { tournamentId: importForm.tournamentId };
      if (importForm.topN) body.topN = parseInt(importForm.topN);
      else if (importForm.positions) body.positions = importForm.positions.split(',').map((p: string) => parseInt(p.trim())).filter((p: number) => !isNaN(p));
      const response = await fetch(`/api/maps/${activeMap.id}/import-players-from-tournament`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.json();
        showNotification('success', 'Успешно', `Импортировано игроков: ${data.added}`);
        setShowImportDialog(false);
        await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось импортировать игроков');
    }
  };
  
  const handleDeleteTerritory = async (territory: Territory) => {
    if (!confirm(`Удалить локацию "${territory.name}"?`)) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/territories/${territory.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Локация удалена');
        if (activeMap) await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось удалить локацию');
    }
  };
  
  const handleSaveEditTerritory = async () => {
    if (!editTerritoryForm.id) return;
    try {
      const token = getAuthToken();
      if (!token) return;

      // Убеждаемся что maxPlayers - это число
      const maxPlayers = typeof editTerritoryForm.maxPlayers === 'number' ? editTerritoryForm.maxPlayers : (parseInt(editTerritoryForm.maxPlayers) || 999);

      const response = await fetch(`/api/territories/${editTerritoryForm.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTerritoryForm.name, description: editTerritoryForm.description, maxPlayers }),
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Локация обновлена');
        setShowEditTerritoryDialog(false);
        if (activeMap) await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось обновить локацию');
    }
  };
  
  const handleSaveNewSpot = async () => {
    if (!activeMap) return;
    if (currentPoints.length < 3 || !newSpotForm.name.trim()) {
      showNotification('error', 'Ошибка', 'Нужно название и минимум 3 точки');
      return;
    }
    try {
      const token = getAuthToken();
      if (!token) return;

      // Убеждаемся что maxPlayers - это число
      const maxPlayers = typeof newSpotForm.maxPlayers === 'number' ? newSpotForm.maxPlayers : (parseInt(newSpotForm.maxPlayers) || 999);

      const response = await fetch(`/api/maps/${activeMap.id}/territories`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSpotForm, maxPlayers, points: currentPoints }),
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Локация создана');
        setCurrentPoints([]);
        setIsDrawingMode(false);
        setNewSpotForm({ name: '', description: '', maxPlayers: 999 });
        await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось создать локацию');
    }
  };
  
 const handleAssignPlayerToTerritory = async (territoryId: string, playerId: string) => {
  if (!territoryId || !playerId) {
    showNotification('error', 'Ошибка', 'Выберите локацию и игрока');
    return;
  }
  try {
    const token = getAuthToken();
    if (!token) {
      console.error('[Assign Player] No token');
      return;
    }

    // ИСПРАВЛЕНО: playerId уже является userId из селекта
    const response = await fetch(`/api/admin/territories/${territoryId}/assign-player`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: playerId }), // playerId уже содержит userId
    });
    
    if (response.ok) {
      showNotification('success', 'Успешно', 'Игрок назначен');
      setAssignPlayerForm({ territoryId: '', playerId: '' });
      setLocalSelectedPlayer('');
      if (showAssignPlayerDialog) setShowAssignPlayerDialog(false);
      // WebSocket обновит состояние автоматически, но обновим selectedTerritory локально
      if (selectedTerritory && selectedTerritory.id === territoryId) {
        // Найдем игрока
        const player = eligiblePlayers.find(p => p.userId === playerId);
        if (player) {
          const newClaim = {
            userId: player.userId,
            displayName: player.displayName,
            username: player.user?.username || 'unknown'
          };
          setSelectedTerritory({
            ...selectedTerritory,
            claims: [...(selectedTerritory.claims || []), newClaim]
          });
        }
      }
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  } catch (error: any) {
    showNotification('error', 'Ошибка', error.message || 'Не удалось назначить игрока');
  }
};

  const handleRemovePlayerFromTerritory = async (territoryId: string, userId: string) => {
    if (!confirm('Убрать игрока с этой локации?')) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/admin/territories/${territoryId}/remove-player`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Игрок убран с локации');
        // WebSocket обновит состояние автоматически, но обновим selectedTerritory локально
        if (selectedTerritory && selectedTerritory.id === territoryId) {
          setSelectedTerritory({
            ...selectedTerritory,
            claims: (selectedTerritory.claims || []).filter(claim => claim.userId !== userId)
          });
        }
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось убрать игрока');
    }
  };
  
  // ===================================================
  // ========== SVG & INTERACTIVITY HANDLERS  ==========
  // ===================================================

  const handleEditTerritory = (territory: Territory) => {
  setSelectedTerritory(territory);
  setEditTerritoryForm({ 
    id: territory.id, 
    name: territory.name, 
    description: territory.description || '', 
    maxPlayers: territory.maxPlayers || 999
  });
  setLocalSelectedPlayer(''); // Сброс локального состояния
  setShowEditTerritoryDialog(true);
};
  const getSVGPoint = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: Math.round(svgP.x), y: Math.round(svgP.y) };
  }, []);
  const isPointInPolygon = useCallback((point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);
  const handleSVGClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return;
    const point = getSVGPoint(event);
    if (isDrawingMode && isAdminMode) {
      const clampedPoint = { x: Math.max(0, Math.min(SVG_SIZE, point.x)), y: Math.max(0, Math.min(SVG_SIZE, point.y)) };
      setCurrentPoints([...currentPoints, clampedPoint]);
      return;
    }
    const clickedTerritory = territories.find(t => isPointInPolygon(point, t.points));
    setSelectedTerritory(clickedTerritory || null);
  }, [isDragging, isDrawingMode, isAdminMode, currentPoints, territories, getSVGPoint, isPointInPolygon]);
  const handleTerritoryClick = useCallback((territory: Territory, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTerritory(territory);
    if (!isAdminMode) {
      if (activeMap?.isLocked && !user?.isAdmin) {
        showNotification('warning', 'Карта заблокирована', 'Администратор запретил изменять метки на этой карте');
        return;
      }
      if (isUserEligible || user?.isAdmin) {
        handleClaimTerritory(territory.id);
      } else {
        showNotification('warning', 'Доступ ограничен', 'Вы не в списке игроков');
      }
    }
  }, [isAdminMode, activeMap, user, isUserEligible, showNotification]);
  const handleTerritoryContextMenu = useCallback((territory: Territory, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAdminMode || !user?.isAdmin) return;
    setContextMenu({ territory, x: event.clientX, y: event.clientY });
  }, [isAdminMode, user]);
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, MIN_SCALE), MAX_SCALE);
    if (newScale !== scale) {
      const point = getSVGPoint(e);
      const dx = point.x - SVG_SIZE / 2;
      const dy = point.y - SVG_SIZE / 2;
      setPanOffset(prev => ({ x: prev.x + dx * (1 - newScale / scale), y: prev.y + dy * (1 - newScale / scale) }));
      setScale(newScale);
    }
  }, [scale, getSVGPoint]);
  const toggleTerritoryExpanded = (territoryId: string) => { setExpandedTerritories(prev => ({ ...prev, [territoryId]: !prev[territoryId] })); };
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => { if (e.button === 2 || (e.button === 0 && e.shiftKey) || e.button === 1) { e.preventDefault(); setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); } }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => { if (!isDragging) return; const dx = (e.clientX - dragStart.x) / scale; const dy = (e.clientY - dragStart.y) / scale; setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy })); setDragStart({ x: e.clientX, y: e.clientY }); }, [isDragging, dragStart, scale]);
  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);
const resetZoom = useCallback(() => { 
  setScale(1); 
  setPanOffset({ x: 0, y: 0 }); 
  
  // Перезагружаем данные
  if (activeMap?.id) {
    loadMapData(activeMap.id);
  }
}, [activeMap, loadMapData]);
  const viewBox = useMemo(() => { const centerX = SVG_SIZE / 2 - panOffset.x; const centerY = SVG_SIZE / 2 - panOffset.y; const width = SVG_SIZE / scale; const height = SVG_SIZE / scale; const x = centerX - width / 2; const y = centerY - height / 2; return `${x} ${y} ${width} ${height}`; }, [scale, panOffset]);
  const filteredUsers = useMemo(() => { if (!playerSearchQuery.trim()) return allUsers; const query = playerSearchQuery.toLowerCase(); return allUsers.filter(u => u.displayName?.toLowerCase().includes(query) || u.username?.toLowerCase().includes(query)); }, [allUsers, playerSearchQuery]);
  useEffect(() => { const handleClick = () => setContextMenu(null); if (contextMenu) { document.addEventListener('click', handleClick); return () => document.removeEventListener('click', handleClick); } }, [contextMenu]);
  if (authLoading || isLoading) { return <LoadingScreen message="Загрузка локаций..." />; }
  if (error) { return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center space-y-4"><AlertCircle className="h-12 w-12 text-red-500 mx-auto" /><div className="text-red-500 font-semibold">{error}</div><Button onClick={() => window.location.reload()}>Перезагрузить</Button></div></div>); }

  return (
    <div className="min-h-screen bg-background">
      {contextMenu && (
        <TerritoryContextMenu
          territory={contextMenu.territory}
          onEdit={handleEditTerritory}
          onDelete={handleDeleteTerritory}
          onClose={() => setContextMenu(null)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
        />
      )}

      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold">DropMap</span>
            </div>
            
            {activeMap && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {activeMap.name}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyMapLink}
                  className="h-7 px-2"
                  title="Скопировать ссылку на карту"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            
            {activeMap?.isLocked && (
              <Badge variant="destructive">
                <Lock className="h-3 w-3 mr-1" />
                Заблокирована
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 border-r">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground hidden md:inline">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
             <div className="hidden lg:flex items-center gap-1">
              <button onClick={() => setScale(prev => Math.max(prev / 1.2, MIN_SCALE))} className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="px-2 text-xs font-medium min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(prev => Math.min(prev * 1.2, MAX_SCALE))} className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button onClick={resetZoom} className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>

            {user?.isAdmin && (
              <div className="flex items-center gap-2 pl-3 border-l">
                <span className="text-xs text-muted-foreground hidden md:inline">Админ</span>
                <button onClick={() => { setIsAdminMode(!isAdminMode); setIsDrawingMode(false); setCurrentPoints([]); }} className={cn("relative inline-flex h-5 w-8 items-center rounded-full transition-colors", isAdminMode ? 'bg-primary' : 'bg-muted')}>
                  <span className={cn("inline-block h-3 w-3 transform rounded-full bg-white transition-transform", isAdminMode ? 'translate-x-3.5' : 'translate-x-0.5')} />
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
        <aside className="w-64 border-r bg-card/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Карты ({allMaps.length})</h3>
              {user?.isAdmin && isAdminMode && (
                <Button size="sm" variant="ghost" onClick={() => setShowCreateMapDialog(true)} className="h-7 w-7 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
            {allMaps.map((map) => (
              <div key={map.id} className={cn("p-3 rounded-lg border transition-colors group", activeMap?.id === map.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50')}>
                <div className="flex items-start justify-between gap-2">
                  <div onClick={() => !editingMapId && handleSelectMap(map.id)} className={cn("flex-1 cursor-pointer min-w-0", editingMapId === map.id && "cursor-default")}>
                    {editingMapId === map.id ? (
                      <div className="space-y-2 mb-1">
                        <Input value={editingMapName} onChange={(e) => setEditingMapName(e.target.value)} placeholder="Название карты..." autoFocus onClick={(e) => e.stopPropagation()} className="h-7 text-sm" />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveMapName(map.id); }} className="h-6 text-xs flex-1">Сохранить</Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingMapId(null); setEditingMapName(''); }} className="h-6 text-xs flex-1">Отмена</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1 flex-wrap"><span className="font-medium text-sm truncate">{map.name}</span>{map.isLocked && (<Lock className="h-3 w-3 text-red-500 flex-shrink-0" />)}</div>
                        {map.tournament?.name && (<div className="text-xs text-muted-foreground truncate">{map.tournament.name}</div>)}
                      </>
                    )}
                  </div>
                  {isAdminMode && user?.isAdmin && !editingMapId && (
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingMapId(map.id); setEditingMapName(map.name || ''); }} className="h-7 w-7 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all flex-shrink-0" title="Редактировать название"><Edit className="h-4 w-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteMap(map.id, map.name || 'Карта'); }} className="h-7 w-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition-all flex-shrink-0" title="Удалить карту"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 relative bg-background overflow-hidden flex items-center justify-center">
          {isMapLoading ? (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Загрузка карты...</p>
              </div>
            </div>
          ) : (
            <svg ref={svgRef} viewBox={viewBox} width="100%" height="100%" onClick={handleSVGClick} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()} className="max-w-full max-h-full" style={{ cursor: isDragging ? 'grabbing' : isDrawingMode ? 'crosshair' : 'pointer', aspectRatio: '1 / 1' }}>
              {activeMap?.mapImageUrl && (<image href={activeMap.mapImageUrl} x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} preserveAspectRatio="xMidYMid slice" />)}
              {territories.map(territory => (<TerritoryPolygon key={territory.id} territory={territory} isSelected={selectedTerritory?.id === territory.id} onClick={(e) => handleTerritoryClick(territory, e)} onContextMenu={(e) => handleTerritoryContextMenu(territory, e)} scale={scale} />))}
              {isDrawingMode && currentPoints.length > 0 && (<DrawingPoints points={currentPoints} color={"#000000"} scale={scale} />)}
            </svg>
          )}
          
          {isAdminMode && isDrawingMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border rounded-lg p-4 shadow-2xl z-10 min-w-[300px]">
              <h3 className="font-semibold mb-3">Новая локация</h3>
              <div className="space-y-3">
                <div><Label>Название</Label><Input value={newSpotForm.name} onChange={(e) => setNewSpotForm({ ...newSpotForm, name: e.target.value })} placeholder="Введите название..." /></div>
                <div><Label>Макс. игроков</Label><Input value={newSpotForm.maxPlayers} onChange={(e) => { const val = e.target.value; if (val === '') { setNewSpotForm({ ...newSpotForm, maxPlayers: '' }); } else { const num = parseInt(val); if (!isNaN(num) && num > 0) { setNewSpotForm({ ...newSpotForm, maxPlayers: num }); } } }} placeholder="999" /></div>
                <div className="text-xs text-muted-foreground">Точек: {currentPoints.length} (мин. 3)</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNewSpot} disabled={currentPoints.length < 3 || !newSpotForm.name.trim()} className="flex-1"><Save className="h-4 w-4 mr-2" />Сохранить</Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPoints([])} className="flex-1"><Undo className="h-4 w-4 mr-2" />Сброс</Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setIsDrawingMode(false); setCurrentPoints([]); }} className="w-full"><X className="h-4 w-4 mr-2" />Отмена</Button>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border text-sm pointer-events-none">
            <div className="text-muted-foreground">{isDrawingMode ? (<><div className="font-semibold text-primary mb-1">Режим рисования</div><div>Клик: Добавить точку</div><div>Мин. 3 точки</div></>) : (<><div>Скролл: Зум</div><div>ПКМ или Shift + ЛКМ: Двигать картой</div><div>Клик: Выбрать локацию</div>{isAdminMode && <div className="text-primary">ПКМ: Меню (админ)</div>}</>)}</div>
          </div>
          
          {!isUserEligible && !user?.isAdmin && (<div className="absolute top-4 left-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 pointer-events-none"><div className="flex items-center gap-2 text-yellow-600"><AlertTriangle className="h-4 w-4" /><span className="text-sm font-medium">Вы не в списке допущенных игроков</span></div></div>)}
          {activeMap?.isLocked && !user?.isAdmin && (<div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 pointer-events-none"><div className="flex items-center gap-2 text-red-600"><Lock className="h-4 w-4" /><span className="text-sm font-medium">Карта заблокирована администратором</span></div></div>)}
        </main>

        <aside className="w-80 border-l bg-card/30 backdrop-blur-sm overflow-y-auto">
          {isAdminMode && user?.isAdmin && (
            <div className="p-4 border-b bg-primary/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Settings className="h-4 w-4" />Админ-панель</h3>
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { setIsDrawingMode(true); setCurrentPoints([]); }} disabled={isDrawingMode}><Plus className="h-4 w-4 mr-2" />Создать локацию</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowAssignPlayerDialog(true)}><User className="h-4 w-4 mr-2" />Назначить игрока</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowPlayersDialog(true)}><UserPlus className="h-4 w-4 mr-2" />Добавить игроков</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowInviteDialog(true)}><LinkIcon className="h-4 w-4 mr-2" />Создать инвайт</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowImportDialog(true)}><Upload className="h-4 w-4 mr-2" />Импорт из турнира</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowSettingsDialog(true)}><Settings className="h-4 w-4 mr-2" />Настройки карты</Button>
              </div>
            </div>
          )}
          
          <div className="p-4 border-b">
             <h3 className="font-semibold flex items-center gap-2 mb-3">
               <Users className="h-4 w-4" />
               Игроки
               <Badge variant="outline" className="ml-auto">{eligiblePlayers.length}</Badge>
             </h3>
              <div className="space-y-2">
  {(() => {
    if (eligiblePlayers.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Нет игроков на карте</p>
        </div>
      );
    }

    // Для каждого eligible игрока находим его территорию (если есть)
    const playersWithTerritories = eligiblePlayers.map(player => {
      // Находим территорию где этот игрок заклеймил
      const claimedTerritory = territories.find(t =>
        t.claims?.some(c => c.userId === player.userId)
      );

      return {
        player,
        territory: claimedTerritory,
        hasClaim: !!claimedTerritory
      };
    });

    return playersWithTerritories.map(({ player, territory, hasClaim }) => (
      <button
        key={player.userId}
        onClick={() => {
          if (hasClaim && territory) {
            setSelectedTerritory(territory);
            // Зумим на территорию
            const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
            const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;
            setPanOffset({ x: SVG_SIZE / 2 - centerX, y: SVG_SIZE / 2 - centerY });
            setScale(2);
          }
        }}
        className={cn(
          "w-full flex items-center justify-between p-2 bg-background rounded border border-border group transition-colors",
          hasClaim ? "hover:bg-muted/50 cursor-pointer" : "opacity-60 cursor-default"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasClaim && territory ? (
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: territory.color }} />
          ) : (
            <div className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-muted-foreground/30" />
          )}
          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1 text-left">
            <div className="text-xs font-medium truncate">{player.displayName || 'Неизвестный'}</div>
            <div className="text-xs text-muted-foreground truncate">@{player.user?.username || 'unknown'}</div>
          </div>
        </div>
        {hasClaim && territory && isAdminMode && user?.isAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePlayerFromTerritory(territory.id, player.userId);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 rounded bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"
            title="Убрать с локации"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </button>
    ));
  })()}
</div>
              </div>
             {isAdminMode && user?.isAdmin && (
  <div className="p-4 border-b">
    <h3 className="font-semibold flex items-center gap-2 mb-3">
      <LinkIcon className="h-4 w-4" />
      Инвайт-коды
    </h3>
    
    {/* Счетчики */}
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className="px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
        <div className="text-xs text-muted-foreground">Активные</div>
        <div className="text-lg font-semibold text-green-600">
          {inviteCodes.filter(i => !i.isUsed && (!i.expiresAt || new Date(i.expiresAt) >= new Date())).length}
        </div>
      </div>
      <div className="px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="text-xs text-muted-foreground">Использованные</div>
        <div className="text-lg font-semibold text-blue-600">
          {inviteCodes.filter(i => i.isUsed).length}
        </div>
      </div>
    </div>

    <div className="space-y-2">
      {inviteCodes.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <LinkIcon className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Нет созданных инвайтов</p>
          <p className="text-xs mt-1">Создайте инвайт для приглашения игроков</p>
        </div>
      ) : (
        inviteCodes.map(invite => {
          const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
          const isActive = !invite.isUsed && !isExpired;
          const inviteUrl = `${window.location.origin}/dropmap/invite/${invite.code}`;
          
          // Определяем статус и цвет
          let statusBadge;
          let colorClass;
          
          if (invite.isUsed) {
            statusBadge = { text: 'Использован', variant: 'default' as const };
            colorClass = 'bg-blue-500';
          } else if (isExpired) {
            statusBadge = { text: 'Истёк', variant: 'destructive' as const };
            colorClass = 'bg-red-500';
          } else {
            statusBadge = { text: 'Активен', variant: 'secondary' as const };
            colorClass = 'bg-green-500';
          }
          
          return (
            <div key={invite.code} className="border rounded-lg overflow-hidden bg-card">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", colorClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {invite.displayName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {invite.code}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isActive && (
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteUrl);
                            showNotification('success', 'Скопировано', 'Ссылка на инвайт скопирована в буфер обмена');
                          } catch (error) {
                            showNotification('error', 'Ошибка', 'Не удалось скопировать ссылку');
                          }
                        }}
                        className="h-7 w-7 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all flex-shrink-0"
                        title="Скопировать ссылку на инвайт"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    {!invite.isUsed && (
                      <button
                        onClick={() => handleDeleteInvite(invite.code)}
                        className="h-7 w-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition-all flex-shrink-0"
                        title="Удалить инвайт"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {/* Статус */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Статус</span>
                    <Badge variant={statusBadge.variant} className="text-xs">
                      {statusBadge.text}
                    </Badge>
                  </div>
                  
                  
                  {/* Использован */}
                  {invite.isUsed && invite.usedAt && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t">
                      <span className="text-muted-foreground">Использован</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {new Date(invite.usedAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  )}
                  
                  {/* На какой территории использован */}
                  {invite.isUsed && invite.territoryId && (() => {
                    const territory = territories.find(t => t.id === invite.territoryId);
                    return territory ? (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground">Локация</span>
                        <span className="text-primary font-medium truncate ml-2">
                          {territory.name}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
)}
          
          
         
        </aside>
      </div>

      {/* Dialogs */}
      <Dialog open={showCreateMapDialog} onOpenChange={setShowCreateMapDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая карта</DialogTitle><DialogDescription>Создайте пустую карту или скопируйте существующую</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Название новой карты</Label><Input value={mapForm.name} onChange={(e) => setMapForm({ ...mapForm, name: e.target.value })} placeholder="Введите название..." /></div>
            
            <div><Label>Скопировать из (опционально)</Label>
              <Select 
  value={mapForm.sourceMapId || 'empty'} 
  onValueChange={(value) => setMapForm({ ...mapForm, sourceMapId: value === 'empty' ? '' : value })}
>
  <SelectTrigger><SelectValue placeholder="Создать пустую карту" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="empty">Создать пустую карту</SelectItem> 
    {allMaps.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
  </SelectContent>
</Select>
            </div>
            <Button onClick={handleCreateNewMap} className="w-full">Создать карту</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showEditTerritoryDialog} onOpenChange={setShowEditTerritoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Редактировать локацию</DialogTitle><DialogDescription>Измените параметры локации и управляйте игроками</DialogDescription></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4 pb-4 border-b">
              <h4 className="font-semibold text-sm">Основные настройки</h4>
              <div><Label>Название</Label><Input value={editTerritoryForm.name} onChange={(e) => setEditTerritoryForm({ ...editTerritoryForm, name: e.target.value })} /></div>
              <div><Label>Макс. игроков</Label><Input value={editTerritoryForm.maxPlayers} onChange={(e) => { const val = e.target.value; if (val === '') { setEditTerritoryForm({ ...editTerritoryForm, maxPlayers: '' }); } else { const num = parseInt(val); if (!isNaN(num) && num > 0) { setEditTerritoryForm({ ...editTerritoryForm, maxPlayers: num }); } } }} placeholder="999" /></div>
              
            </div>
            {user?.isAdmin && isAdminMode && selectedTerritory && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Игроки на локации</h4><Badge variant="outline">
    {selectedTerritory.claims?.length || 0}
    {editTerritoryForm.maxPlayers < 999 && ` / ${editTerritoryForm.maxPlayers}`}
  </Badge></div>
                {(() => {
                  const currentClaims = selectedTerritory.claims || [];
                  return currentClaims.length > 0 ? (
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      {currentClaims.map((claim, index) => (
                        <div key={`${claim.userId}-${index}`} className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><div><div className="text-sm font-medium">{claim.displayName || 'Неизвестный'}</div><div className="text-xs text-muted-foreground">@{claim.username || 'unknown'}</div></div></div>
                          <Button size="sm" variant="ghost" onClick={() => handleRemovePlayerFromTerritory(selectedTerritory.id, claim.userId)} className="h-8 w-8 p-0 hover:bg-destructive/10" title="Убрать с локации"><X className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : (<div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg"><Users className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Нет игроков</p></div>);
                })()}
                {(() => {
                  const currentPlayerCount = selectedTerritory.claims?.length || 0;
                  const canAddMore = currentPlayerCount < editTerritoryForm.maxPlayers;

                  const availablePlayers = eligiblePlayers.filter(p => !selectedTerritory.claims?.some(claim => claim.userId === p.userId));

                return canAddMore ? (
  <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
    <div className="flex items-center gap-2">
      <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <Label className="text-sm font-medium">Добавить игрока</Label>
    </div>
    {availablePlayers.length > 0 ? (
      <>
        <select
  value={localSelectedPlayer}
  onChange={(e) => {
    setLocalSelectedPlayer(e.target.value);
  }}
  className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
>
  <option value="">Выберите игрока...</option>
  {availablePlayers.map((p) => (
    <option key={p.id} value={p.userId}>
      {p.displayName} (@{p.user?.username || 'unknown'})
    </option>
  ))}
</select>
<Button
  size="sm"
  onClick={async () => {
    if (localSelectedPlayer && selectedTerritory) {
      await handleAssignPlayerToTerritory(selectedTerritory.id, localSelectedPlayer);
      setLocalSelectedPlayer('');
    }
  }}
  disabled={!localSelectedPlayer}
  className="w-full"
>
  <UserPlus className="h-4 w-4 mr-2" />
  Добавить
</Button>
      </>
    ) : (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>Все игроки уже на локациях</p>
      </div>
    )}
  </div>
) : (
  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
    <div className="flex items-center gap-2 text-yellow-600 text-sm">
      <AlertTriangle className="h-4 w-4" />
      <div>
        <div className="font-medium">Достигнут лимит игроков</div>
      </div>
    </div>
  </div>
);
                })()}
              </div>
            )}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSaveEditTerritory} className="flex-1"><Save className="h-4 w-4 mr-2" />Сохранить</Button>
              <Button variant="outline" onClick={() => { setShowEditTerritoryDialog(false); setAssignPlayerForm({ territoryId: '', playerId: '' }); }} className="flex-1">Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showPlayersDialog} onOpenChange={(open) => {setShowPlayersDialog(open); if (!open) setPlayerSearchQuery('');}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Добавить игроков</DialogTitle><DialogDescription>Выберите пользователей для доступа к карте</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Поиск игроков</Label><Input value={playerSearchQuery} onChange={(e) => setPlayerSearchQuery(e.target.value)} placeholder="Введите имя или username..." className="w-full" /></div>
            {selectedUsers.length > 0 && (<div className="flex items-center justify-between bg-primary/10 p-2 rounded"><span className="text-sm font-medium">Выбрано: {selectedUsers.length}</span><Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>Очистить</Button></div>)}
            <div className="max-h-96 overflow-y-auto border rounded p-2">
              {filteredUsers.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Ничего не найдено</p></div>) : (
                <div className="space-y-1">
                  {filteredUsers.map(u => { const isSelected = selectedUsers.includes(u.id); const isAlreadyAdded = eligiblePlayers.some(p => p.userId === u.id); return (
                    <label key={u.id} className={cn("flex items-center gap-3 p-2 rounded cursor-pointer transition-colors", isAlreadyAdded ? "opacity-50 cursor-not-allowed" : "hover:bg-muted", isSelected && !isAlreadyAdded && "bg-primary/10")}>
                      <input type="checkbox" checked={isSelected} disabled={isAlreadyAdded} onChange={(e) => { if (e.target.checked) { setSelectedUsers([...selectedUsers, u.id]); } else { setSelectedUsers(selectedUsers.filter(id => id !== u.id)); }}} className="cursor-pointer" />
                      <div className="flex-1"><div className="text-sm font-medium">{u.displayName}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
                      {isAlreadyAdded && (<Badge variant="secondary" className="text-xs">Уже добавлен</Badge>)}
                    </label>
                  );})}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddPlayers} disabled={selectedUsers.length === 0} className="flex-1"><UserPlus className="h-4 w-4 mr-2" />Добавить ({selectedUsers.length})</Button>
              <Button variant="outline" onClick={() => { setShowPlayersDialog(false); setPlayerSearchQuery(''); }} className="flex-1">Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать инвайт-код</DialogTitle><DialogDescription>Создайте код для приглашения игроков</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Отображаемое имя</Label><Input value={inviteForm.displayName} onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })} placeholder="Например: Malibuca" /></div>
            <div><Label>Срок действия (дней)</Label><Input type="number" min="1" max="365" value={inviteForm.expiresInDays} onChange={(e) => setInviteForm({ ...inviteForm, expiresInDays: parseInt(e.target.value) })} /></div>
            <Button onClick={handleCreateInvite} className="w-full">Создать код</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Импорт из турнира</DialogTitle><DialogDescription>Импортируйте игроков из результатов турнира</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Турнир</Label><Select value={importForm.tournamentId} onValueChange={(value) => setImportForm({ ...importForm, tournamentId: value })}><SelectTrigger><SelectValue placeholder="Выберите турнир" /></SelectTrigger><SelectContent>{tournaments.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>
            <div><Label>Топ N игроков</Label><Input type="number" value={importForm.topN} onChange={(e) => setImportForm({ ...importForm, topN: e.target.value, positions: '' })} placeholder="Например: 20" /></div>
            <div className="text-center text-sm text-muted-foreground">или</div>
            <div><Label>Конкретные позиции</Label><Input value={importForm.positions} onChange={(e) => setImportForm({ ...importForm, positions: e.target.value, topN: '' })} placeholder="Например: 1,2,5,10" /></div>
            <Button onClick={handleImportPlayers} disabled={!importForm.tournamentId || (!importForm.topN && !importForm.positions)} className="w-full">Импортировать</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Настройки карты</DialogTitle><DialogDescription>Измените параметры текущей карты</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {activeMap && (<>
              <div className="flex items-center gap-2"><input type="checkbox" id="settingsIsLocked" checked={settingsForm.isLocked} onChange={(e) => setSettingsForm({ ...settingsForm, isLocked: e.target.checked })} /><Label htmlFor="settingsIsLocked">Заблокировать карту</Label></div>
              <div><Label>Изображение карты</Label><div className="space-y-2"><input ref={mapImageInputRef} type="file" accept="image/*" onChange={(e) => setSettingsForm(prev => ({ ...prev, mapImageFile: e.target.files?.[0] || null }))} className="hidden" /><Button type="button" variant="outline" onClick={() => mapImageInputRef.current?.click()} className="w-full"><ImageIcon className="h-4 w-4 mr-2" />{settingsForm.mapImageFile ? settingsForm.mapImageFile.name : 'Выбрать новое изображение'}</Button>{settingsForm.mapImageFile && (<div className="text-xs text-muted-foreground">Размер: {(settingsForm.mapImageFile.size / 1024 / 1024).toFixed(2)} МБ</div>)}{activeMap.mapImageUrl && !settingsForm.mapImageFile && (<div className="text-xs text-muted-foreground">Текущее изображение установлено</div>)}</div></div>
              <Button onClick={handleSaveSettings} className="w-full">Сохранить</Button>
            </>)}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAssignPlayerDialog} onOpenChange={setShowAssignPlayerDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Назначить игрока</DialogTitle><DialogDescription>Выберите локацию и игрока для назначения</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Локация</Label><Select value={assignPlayerForm.territoryId} onValueChange={(value) => setAssignPlayerForm({ ...assignPlayerForm, territoryId: value })}><SelectTrigger><SelectValue placeholder="Выберите локацию" /></SelectTrigger><SelectContent>{territories.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>
           <div><Label>Игрок</Label>
<select
  value={assignPlayerForm.playerId}
  onChange={(e) => setAssignPlayerForm({ ...assignPlayerForm, playerId: e.target.value })}
  className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
>
  <option value="">Выберите игрока</option>
  {eligiblePlayers.map((p) => (
    <option key={p.id} value={p.userId}>  {/* ИСПРАВЛЕНО: используем p.userId */}
      {p.displayName} (@{p.user?.username || 'unknown'})
    </option>
  ))}
</select>
</div>
            <Button onClick={() => handleAssignPlayerToTerritory(assignPlayerForm.territoryId, assignPlayerForm.playerId)} disabled={!assignPlayerForm.territoryId || !assignPlayerForm.playerId} className="w-full">Назначить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <NotificationModal isOpen={notification.isOpen} type={notification.type} title={notification.title} message={notification.message} onClose={closeNotification} />
    </div>
  );
}