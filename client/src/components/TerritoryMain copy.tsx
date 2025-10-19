// client/src/components/TerritoryMain.tsx - ПОЛНАЯ SVG ВЕРСИЯ

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useRoute } from "wouter";
import LoadingScreen from './LoadingScreen';
import { 
  Trophy, Crown, MapPin, Home, User, Settings, Loader2, 
  AlertCircle, Users, CheckCircle, XCircle, AlertTriangle, Info, ZoomIn, 
  ZoomOut, RotateCcw, Lock, Unlock, Copy, ExternalLink, Plus, Trash2, 
  Edit, Save, X, Undo, UserPlus, Upload, Link as LinkIcon, Image as ImageIcon, ChevronDown
} from 'lucide-react';
import { cn } from "@/lib/utils";

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
  templateId: string;
  maxPlayers: number;
  claims?: Array<{
    userId: string;
    username?: string;
    displayName?: string;
    claimedAt?: string;
  }>;
  claimCount?: number;
}
interface DropMapSettings {
  id: string;
  templateId: string;
  tournamentId?: string;
  mode: 'tournament' | 'practice';
  allowReclaim: boolean;
  isLocked: boolean;
  customName?: string;
  template?: { name: string; mapImageUrl?: string; };
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

function NotificationModal({ isOpen, type, title, message, onClose }: any) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Время анимации выхода
    }, 3000); // Уведомление показывается 3 секунды

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
      case 'success': return {
        border: 'border-green-200 dark:border-green-800',
        bg: 'bg-green-50 dark:bg-green-950',
      };
      case 'error': return {
        border: 'border-red-200 dark:border-red-800',
        bg: 'bg-red-50 dark:bg-red-950',
      };
      case 'warning': return {
        border: 'border-yellow-200 dark:border-yellow-800',
        bg: 'bg-yellow-50 dark:bg-yellow-950',
      };
      case 'info': return {
        border: 'border-blue-200 dark:border-blue-800',
        bg: 'bg-blue-50 dark:bg-blue-950',
      };
    }
  };

  const styles = getStyles();

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-[200] transition-all duration-300 ease-out",
      isExiting ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
    )}>
      <div className={cn(
        "bg-card border rounded-lg shadow-lg p-4 max-w-sm w-full",
        styles?.border,
        styles?.bg
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsExiting(true);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// SVG Territory Component
function TerritoryPolygon({ 
  territory, 
  isSelected, 
  onClick, 
  onContextMenu,
  scale 
}: { 
  territory: Territory; 
  isSelected: boolean; 
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  scale: number;
}) {
  const hasOwner = !!territory.ownerId;
  const points = territory.points.map(p => `${p.x},${p.y}`).join(' ');
  
  const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
  const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;

  return (
    <g className="territory-group">
      <polygon
        points={points}
        fill={territory.color}
        fillOpacity={hasOwner ? 0.5 : 0.25}
        stroke={territory.color}
        strokeWidth={isSelected ? 3 / scale : 2 / scale}
        className={cn(
          "transition-all duration-200 cursor-pointer",
          hasOwner ? "hover:fill-opacity-60" : "hover:fill-opacity-35"
        )}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />
      
      {hasOwner && territory.owner && scale > 0.5 && (
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none select-none"
          style={{
            fontSize: `${16 / scale}px`,
            fontWeight: 'bold',
            fontFamily: 'Montserrat, Inter, system-ui, sans-serif',
            fill: '#ffffff',
            paintOrder: 'stroke',
            stroke: 'rgba(0, 0, 0, 0.9)',
            strokeWidth: `${4 / scale}px`,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
        >
          {territory.owner.displayName}
        </text>
      )}
    </g>
  );
}

function DrawingPoints({ 
  points, 
  color,
  scale 
}: { 
  points: { x: number; y: number }[];
  color: string;
  scale: number;
}) {
  if (points.length === 0) return null;

  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <g className="drawing-group pointer-events-none">
      {points.length >= 3 && (
        <polygon
          points={pointsStr}
          fill={color}
          fillOpacity={0.25}
          stroke="none"
        />
      )}
      
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth={3 / scale}
      />
      
      {points.map((point, index) => (
        <g key={index}>
          <circle
            cx={point.x}
            cy={point.y}
            r={6 / scale}
            fill={color}
            stroke="#fff"
            strokeWidth={2 / scale}
          />
          <text
            x={point.x}
            y={point.y - 12 / scale}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: `${14 / scale}px`,
              fontWeight: 'bold',
              fill: '#fff',
              paintOrder: 'stroke',
              stroke: color,
              strokeWidth: `${2 / scale}px`,
            }}
          >
            {index + 1}
          </text>
        </g>
      ))}
    </g>
  );
}

function TerritoryContextMenu({ territory, onEdit, onDelete, onClose, position }: any) {
  return (
    <div 
      className="fixed bg-card border rounded-lg shadow-2xl p-2 z-[150] min-w-[200px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="space-y-1">
        <button
          onClick={() => { onEdit(territory); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors text-sm"
        >
          <Edit className="h-4 w-4" />
          Редактировать локацию
        </button>
        <button
          onClick={() => { onDelete(territory); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-destructive/10 text-destructive transition-colors text-sm"
        >
          <Trash2 className="h-4 w-4" />
          Удалить локацию
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors text-sm"
        >
          <X className="h-4 w-4" />
          Отмена
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapImageInputRef = useRef<HTMLInputElement>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [dropMaps, setDropMaps] = useState<DropMapSettings[]>([]);
  const [activeDropMap, setActiveDropMap] = useState<DropMapSettings | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingMapName, setEditingMapName] = useState('');
  
  const [eligiblePlayers, setEligiblePlayers] = useState<EligiblePlayer[]>([]);
  const [isUserEligible, setIsUserEligible] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  const [expandedTerritories, setExpandedTerritories] = useState<ExpandedTerritories>({});

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
  const [newSpotForm, setNewSpotForm] = useState({ 
    name: '', 
    color: '#3B82F6', 
    description: '',
    maxPlayers: 1 
  });
  
  const [showCreateMapDialog, setShowCreateMapDialog] = useState(false);
  const [showEditTerritoryDialog, setShowEditTerritoryDialog] = useState(false);
  const [showPlayersDialog, setShowPlayersDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAssignPlayerDialog, setShowAssignPlayerDialog] = useState(false);
  
  const [mapForm, setMapForm] = useState({
    templateId: '',
    tournamentId: '',
    allowReclaim: true,
  });
  
  const [editTerritoryForm, setEditTerritoryForm] = useState({
    id: '',
    name: '',
    color: '#3B82F6',
    description: '',
    maxPlayers: 1,
  });
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  
  const [inviteForm, setInviteForm] = useState({
    displayName: '',
    expiresInDays: 30,
  });
  
  const [importForm, setImportForm] = useState({
    tournamentId: '',
    topN: '',
    positions: '',
  });
  
  const [settingsForm, setSettingsForm] = useState({
    allowReclaim: true,
    mapImageFile: null as File | null,
  });
  
  const [assignPlayerForm, setAssignPlayerForm] = useState({
    territoryId: '',
    playerId: '',
  });
  
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'info', title: '', message: '' });

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
      return;
    }
    if (user?.subscriptionScreenshotStatus !== 'approved') {
      setLocation('/');
      return;
    }
  }, [isLoggedIn, user, setLocation, authLoading]);

  const getCurrentMapUrl = useCallback(() => {
    if (!activeDropMap) return '';
    return `${window.location.origin}/dropmap/${activeDropMap.id}`;
  }, [activeDropMap]);

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

  const loadDropMaps = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch('/api/dropmaps', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setDropMaps(data);
        return data;
      }
    } catch (err) {
      console.error('Ошибка загрузки DropMaps:', err);
      showNotification('error', 'Ошибка загрузки', 'Не удалось загрузить список карт');
    }
    return [];
  }, [isLoggedIn, getAuthToken, showNotification]);

const loadDropMapData = useCallback(async (dropMapId: string) => {
  if (!dropMapId) return;
  
  console.log(`🔄 Loading data for dropmap: ${dropMapId}`); // Добавим логирование
  
  try {
    const token = getAuthToken();
    if (!token) return;
    
    // Сначала найдём settings в текущем списке dropMaps
    const settings = dropMaps.find(d => d.id === dropMapId);
    if (!settings) {
      console.error(`❌ Settings not found for dropmap: ${dropMapId}`);
      return;
    }
    
    console.log(`✅ Found settings for template: ${settings.templateId}`);
    
    // Обновляем activeDropMap если это другая карта
    setActiveDropMap(prev => {
      if (prev?.id !== dropMapId) {
        console.log(`📍 Switching from ${prev?.id} to ${dropMapId}`);
        return settings;
      }
      return prev;
    });
    
    const playersResponse = await fetch(`/api/dropmap/settings/${dropMapId}/players`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (playersResponse.ok) {
      const players = await playersResponse.json();
      console.log(`👥 Loaded ${players.length} players`);
      setEligiblePlayers(players);
      setIsUserEligible(players.some((p: EligiblePlayer) => p.userId === user?.id));
    }

    if (user?.isAdmin) {
      const invitesResponse = await fetch(`/api/dropmap/settings/${dropMapId}/invites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (invitesResponse.ok) {
        const invites = await invitesResponse.json();
        console.log(`🎫 Loaded ${invites.length} invites`);
        setInviteCodes(invites);
      }
    }

    const territoriesResponse = await fetch(`/api/territory/territories?templateId=${settings.templateId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (territoriesResponse.ok) {
      const territoriesData = await territoriesResponse.json();
      console.log(`🗺️ Loaded ${territoriesData.length} territories`);
      setTerritories(territoriesData);
    }
  } catch (err) {
    console.error('❌ Ошибка загрузки данных DropMap:', err);
    showNotification('error', 'Ошибка', 'Не удалось загрузить данные карты');
  }
}, [getAuthToken, user, dropMaps, showNotification]);

  const fetchTemplates = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch('/api/territory/templates', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setTemplates(await response.json());
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [getAuthToken]);

  const fetchTournaments = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch('/api/admin/tournaments', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setTournaments(await response.json());
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  }, [getAuthToken]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setAllUsers(await response.json());
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [getAuthToken]);

  useEffect(() => {
    const init = async () => {
      if (authLoading || !isLoggedIn || !user || isInitialized) return;
      if (user.subscriptionScreenshotStatus !== 'approved') {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const maps = await loadDropMaps();
        if (user.isAdmin) {
          await Promise.all([fetchTemplates(), fetchTournaments(), fetchAllUsers()]);
        }
        if (maps && maps.length > 0) {
          if (dropmapIdFromUrl) {
            const foundMap = maps.find((d: DropMapSettings) => d.id === dropmapIdFromUrl);
            if (foundMap) {
              setActiveDropMap(foundMap);
            } else {
              showNotification('error', 'Карта не найдена', 'Запрошенная карта не существует или недоступна');
              const firstMap = maps.find((d: DropMapSettings) => !d.isLocked) || maps[0];
              if (firstMap) {
                setLocation(`/dropmap/${firstMap.id}`, { replace: true });
                setActiveDropMap(firstMap);
              }
            }
          } else {
            const firstMap = maps.find((d: DropMapSettings) => !d.isLocked) || maps[0];
            if (firstMap) {
              setLocation(`/dropmap/${firstMap.id}`, { replace: true });
              setActiveDropMap(firstMap);
            }
          }
        }
        setIsInitialized(true);
      } catch (err) {
        console.error('Ошибка инициализации:', err);
        setError('Не удалось загрузить данные локаций');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [authLoading, isLoggedIn, user]);

  useEffect(() => {
    if (activeDropMap && isInitialized) {
      loadDropMapData(activeDropMap.id);
      setSettingsForm({
        allowReclaim: activeDropMap.allowReclaim,
        mapImageFile: null,
      });
    }
  }, [activeDropMap?.id, isInitialized]);

  const handleSaveMapName = async (dropMapId: string) => {
  if (!editingMapName.trim()) {
    showNotification('error', 'Ошибка', 'Название не может быть пустым');
    return;
  }

  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch(`/api/dropmap/settings/${dropMapId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customName: editingMapName }),
    });

    if (response.ok) {
      showNotification('success', 'Успешно', 'Название карты обновлено');
      setEditingMapId(null);
      setEditingMapName('');
      await loadDropMaps();
    } else {
      const error = await response.json();
      showNotification('error', 'Ошибка', error.error || 'Не удалось обновить название');
    }
  } catch (error) {
    showNotification('error', 'Ошибка', 'Не удалось подключиться к серверу');
  }
};

  const handleSelectDropMap = useCallback((dropMapId: string) => {
  console.log(`🎯 Selecting dropmap: ${dropMapId}`);
  setLocation(`/dropmap/${dropMapId}`, { replace: true });
  const foundMap = dropMaps.find(d => d.id === dropMapId);
  if (foundMap) {
    console.log(`✅ Found map: ${foundMap.customName || foundMap.template?.name}`);
    setActiveDropMap(foundMap);
    // Сразу загружаем данные для новой карты
    loadDropMapData(dropMapId);
  }
}, [dropMaps, setLocation, loadDropMapData]);

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
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  const handleSVGClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return;
    
    const point = getSVGPoint(event);
    
    if (isDrawingMode && isAdminMode) {
      const clampedPoint = {
        x: Math.max(0, Math.min(SVG_SIZE, point.x)),
        y: Math.max(0, Math.min(SVG_SIZE, point.y))
      };
      setCurrentPoints([...currentPoints, clampedPoint]);
      return;
    }
    
    const clickedTerritory = territories.find(t => isPointInPolygon(point, t.points));
    
    if (clickedTerritory) {
      setSelectedTerritory(clickedTerritory);
      return;
    }
    
    setSelectedTerritory(null);
  }, [isDragging, isDrawingMode, isAdminMode, currentPoints, territories, getSVGPoint, isPointInPolygon]);

  const handleTerritoryClick = useCallback((territory: Territory, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTerritory(territory);
    
    if (!isAdminMode) {
      // Проверяем блокировку карты (админы могут клеймить даже на заблокированной карте)
      if (activeDropMap?.isLocked && !user?.isAdmin) {
        showNotification('warning', 'Карта заблокирована', 'Администратор запретил изменять метки на этой карте');
        return;
      }
      
      if (isUserEligible || user?.isAdmin) {
        handleClaimTerritory(territory.id);
      } else {
        showNotification('warning', 'Доступ ограничен', 'Вы не в списке игроков');
      }
    }
  }, [isAdminMode, activeDropMap, user, isUserEligible, showNotification]);

  const handleTerritoryContextMenu = useCallback((territory: Territory, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isAdminMode || !user?.isAdmin) return;
    
    setContextMenu({
      territory,
      x: event.clientX,
      y: event.clientY
    });
  }, [isAdminMode, user]);

  const handleClaimTerritory = async (territoryId: string) => {
    // Строгая проверка блокировки - только админы могут клеймить на заблокированной карте
    if (activeDropMap?.isLocked && !user?.isAdmin) {
      showNotification('warning', 'Карта заблокирована', 'Администратор запретил изменять метки на этой карте');
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

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, MIN_SCALE), MAX_SCALE);
    
    if (newScale !== scale) {
      const point = getSVGPoint(e);
      const dx = point.x - SVG_SIZE / 2;
      const dy = point.y - SVG_SIZE / 2;
      
      setPanOffset(prev => ({
        x: prev.x + dx * (1 - newScale / scale),
        y: prev.y + dy * (1 - newScale / scale)
      }));
      setScale(newScale);
    }
  }, [scale, getSVGPoint]);

const toggleTerritoryExpanded = (territoryId: string) => {
  setExpandedTerritories(prev => ({
    ...prev,
    [territoryId]: !prev[territoryId]
  }));
};

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2 || (e.button === 0 && e.shiftKey) || e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

const handleDeleteDropMap = async (dropMapId: string, dropMapName: string) => {
  if (!confirm(`Удалить карту "${dropMapName}"? Это действие необратимо.`)) return;

  try {
    setIsLoading(true);
    const token = getAuthToken();
    if (!token) {
      showNotification('error', 'Ошибка авторизации', 'Требуется авторизация');
      return;
    }

    const response = await fetch(`/api/dropmap/settings/${dropMapId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.ok) {
      showNotification('success', 'Успешно', 'Карта удалена');
      
      // Обновляем список карт
      const updatedMaps = await loadDropMaps();
      
      // Если удалили активную карту, переходим на первую доступную
      if (activeDropMap?.id === dropMapId) {
        const firstMap = updatedMaps?.find((d: DropMapSettings) => !d.isLocked) || updatedMaps?.[0];
        if (firstMap) {
          setLocation(`/dropmap/${firstMap.id}`, { replace: true });
          setActiveDropMap(firstMap);
        } else {
          setLocation('/', { replace: true });
        }
      }
    } else {
      const error = await response.json();
      showNotification('error', 'Ошибка', error.error || 'Не удалось удалить карту');
    }
  } catch (error) {
    console.error('Ошибка удаления карты:', error);
    showNotification('error', 'Ошибка', 'Не удалось подключиться к серверу');
  } finally {
    setIsLoading(false);
  }
};

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
    
    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const viewBox = useMemo(() => {
    const centerX = SVG_SIZE / 2 - panOffset.x;
    const centerY = SVG_SIZE / 2 - panOffset.y;
    const width = SVG_SIZE / scale;
    const height = SVG_SIZE / scale;
    const x = centerX - width / 2;
    const y = centerY - height / 2;
    return `${x} ${y} ${width} ${height}`;
  }, [scale, panOffset]);

  const handleCreateDropMap = async () => {
    if (!mapForm.templateId) {
      showNotification('error', 'Ошибка', 'Выберите шаблон карты');
      return;
    }
    try {
      const token = getAuthToken();
      if (!token) return;
      const requestBody: any = {
        templateId: mapForm.templateId,
        mode: 'tournament',
        allowReclaim: mapForm.allowReclaim,
      };
      if (mapForm.tournamentId && mapForm.tournamentId !== 'none') requestBody.tournamentId = mapForm.tournamentId;
      const response = await fetch('/api/dropmap/settings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'DropMap создана');
        setShowCreateMapDialog(false);
        await loadDropMaps();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось создать DropMap');
    }
  };

  const handleToggleLock = async () => {
    if (!activeDropMap) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/dropmap/settings/${activeDropMap.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !activeDropMap.isLocked }),
      });
      if (response.ok) {
        const newLockedState = !activeDropMap.isLocked;
        showNotification('success', 'Успешно', newLockedState ? 'Карта заблокирована' : 'Карта разблокирована');
        setActiveDropMap({ ...activeDropMap, isLocked: newLockedState });
        await loadDropMaps();
        await loadDropMapData(activeDropMap.id);
      }
    } catch (error) {
      showNotification('error', 'Ошибка', 'Не удалось изменить статус');
    }
  };

  const handleSaveSettings = async () => {
    if (!activeDropMap) return;
    try {
      const token = getAuthToken();
      if (!token) return;

      const formData = new FormData();
      formData.append('allowReclaim', String(settingsForm.allowReclaim));
      
      if (settingsForm.mapImageFile) {
        formData.append('mapImage', settingsForm.mapImageFile);
      }

      const response = await fetch(`/api/dropmap/settings/${activeDropMap.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        showNotification('success', 'Успешно', 'Настройки обновлены');
        setShowSettingsDialog(false);
        await loadDropMaps();
        await loadDropMapData(activeDropMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось обновить настройки');
    }
  };

  const handleMapImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showNotification('error', 'Ошибка', 'Выберите файл изображения');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showNotification('error', 'Ошибка', 'Размер файла не должен превышать 10 МБ');
        return;
      }
      setSettingsForm({ ...settingsForm, mapImageFile: file });
    }
  };

  // Замените функцию handleAddPlayers в TerritoryMain.tsx

const handleAddPlayers = async () => {
  if (!activeDropMap || selectedUsers.length === 0) return;
  try {
    const token = getAuthToken();
    if (!token) return;
    
    // ИСПРАВЛЕНИЕ: Используем templateId вместо settingsId
    // Этот роут автоматически создаст настройки если их нет
    const response = await fetch(`/api/dropmap/template/${activeDropMap.templateId}/players`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ userIds: selectedUsers }),
    });
    
    if (response.ok) {
      const data = await response.json();
      showNotification('success', 'Успешно', `Добавлено игроков: ${data.added}`);
      setShowPlayersDialog(false);
      setSelectedUsers([]);
      await loadDropMapData(activeDropMap.id);
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  } catch (error: any) {
    showNotification('error', 'Ошибка', error.message || 'Не удалось добавить игроков');
  }
};

const zoomToTerritory = useCallback((territory: Territory) => {
  if (!territory.points || territory.points.length === 0) return;

  // Вычисляем центр территории
  const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
  const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;

  // Вычисляем размер территории для определения зума
  const minX = Math.min(...territory.points.map(p => p.x));
  const maxX = Math.max(...territory.points.map(p => p.x));
  const minY = Math.min(...territory.points.map(p => p.y));
  const maxY = Math.max(...territory.points.map(p => p.y));
  
  const width = maxX - minX;
  const height = maxY - minY;
  const maxSize = Math.max(width, height);
  
  // Устанавливаем зум (больше территория = меньше зум)
  const targetScale = Math.min(Math.max((SVG_SIZE * 0.3) / maxSize, 1.5), MAX_SCALE);
  
  // Устанавливаем панорамирование к центру территории
  setPanOffset({
    x: -(centerX - SVG_SIZE / 2),
    y: -(centerY - SVG_SIZE / 2)
  });
  
  setScale(targetScale);
  setSelectedTerritory(territory);
  
  showNotification('info', 'Переход к локации', `Показываю локацию: ${territory.name}`);
}, [showNotification]);
const handleRemovePlayer = async (userId: string) => {
  if (!activeDropMap) return;
  try {
    const token = getAuthToken();
    if (!token) return;
    
    // Получаем правильный settingsId
    const ensureResponse = await fetch(`/api/dropmap/ensure-settings/${activeDropMap.templateId}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ensureResponse.ok) {
      throw new Error('Не удалось получить настройки');
    }
    
    const { settings } = await ensureResponse.json();
    
    // Удаляем игрока
    const response = await fetch(`/api/dropmap/settings/${settings.id}/players/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (response.ok) {
      showNotification('success', 'Успешно', 'Игрок удален');
      await loadDropMapData(activeDropMap.id);
    }
  } catch (error) {
    showNotification('error', 'Ошибка', 'Не удалось удалить игрока');
  }
};

// Замените функцию handleCreateInvite в TerritoryMain.tsx

const handleCreateInvite = async () => {
  if (!activeDropMap) return;
  try {
    const token = getAuthToken();
    if (!token) return;
    
    // Убедимся что настройки существуют
    const ensureResponse = await fetch(`/api/dropmap/ensure-settings/${activeDropMap.templateId}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ensureResponse.ok) {
      throw new Error('Не удалось создать настройки');
    }
    
    const { settings } = await ensureResponse.json();
    
    // Создаем инвайт с правильным settingsId
    const response = await fetch(`/api/dropmap/settings/${settings.id}/invites`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(inviteForm),
    });
    
    if (response.ok) {
      const data = await response.json();
      const inviteUrl = `${window.location.origin}/dropmap/invite/${data.code}`;
      navigator.clipboard.writeText(inviteUrl);
      showNotification('success', 'Успешно', `Код создан и скопирован: ${data.code}`);
      setShowInviteDialog(false);
      await loadDropMapData(activeDropMap.id);
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
      const response = await fetch(`/api/dropmap/invites/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Код удален');
        if (activeDropMap) await loadDropMapData(activeDropMap.id);
      }
    } catch (error) {
      showNotification('error', 'Ошибка', 'Не удалось удалить код');
    }
  };

 // Замените функцию handleImportPlayers в TerritoryMain.tsx

const handleImportPlayers = async () => {
  if (!activeDropMap) return;
  try {
    const token = getAuthToken();
    if (!token) return;
    
    // Сначала убедимся что настройки существуют
    const ensureResponse = await fetch(`/api/dropmap/ensure-settings/${activeDropMap.templateId}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ensureResponse.ok) {
      throw new Error('Не удалось создать настройки');
    }
    
    const { settings } = await ensureResponse.json();
    
    // Теперь импортируем игроков с правильным settingsId
    const body: any = { tournamentId: importForm.tournamentId };
    if (importForm.topN) body.topN = parseInt(importForm.topN);
    else if (importForm.positions) {
      body.positions = importForm.positions
        .split(',')
        .map((p: string) => parseInt(p.trim()))
        .filter((p: number) => !isNaN(p));
    }
    
    const response = await fetch(`/api/dropmap/settings/${settings.id}/import-players`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(body),
    });
    
    if (response.ok) {
      const data = await response.json();
      showNotification('success', 'Успешно', `Импортировано игроков: ${data.added}`);
      setShowImportDialog(false);
      await loadDropMapData(activeDropMap.id);
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  } catch (error: any) {
    showNotification('error', 'Ошибка', error.message || 'Не удалось импортировать игроков');
  }
};

  const handleDeleteTerritory = async (territory: Territory) => {
    if (!activeDropMap) return;
    if (!confirm(`Удалить локацию "${territory.name}"?`)) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`/api/territory/territories/${territory.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showNotification('success', 'Успешно', 'Локация удалена');
        await loadDropMapData(activeDropMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось удалить локацию');
    }
  };

  const handleEditTerritory = (territory: Territory) => {
  setSelectedTerritory(territory); // Добавьте эту строку, если её нет
  setEditTerritoryForm({
    id: territory.id,
    name: territory.name,
    color: territory.color,
    description: territory.description || '',
    maxPlayers: territory.maxPlayers || 1,
  });
  setAssignPlayerForm({ territoryId: territory.id, playerId: '' }); // Предзаполняем territoryId
  setShowEditTerritoryDialog(true);
};

  const handleSaveEditTerritory = async () => {
    if (!editTerritoryForm.id) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(`/api/territory/territories/${editTerritoryForm.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editTerritoryForm.name,
          color: editTerritoryForm.color,
          description: editTerritoryForm.description,
          maxPlayers: editTerritoryForm.maxPlayers,
        }),
      });

      if (response.ok) {
        showNotification('success', 'Успешно', 'Локация обновлена');
        setShowEditTerritoryDialog(false);
        if (activeDropMap) await loadDropMapData(activeDropMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось обновить локацию');
    }
  };

  const handleSaveNewSpot = async () => {
    if (!activeDropMap) {
      showNotification('error', 'Ошибка', 'Выберите DropMap');
      return;
    }
    if (currentPoints.length < 3) {
      showNotification('error', 'Ошибка', 'Нужно минимум 3 точки для создания локации');
      return;
    }
    if (!newSpotForm.name.trim()) {
      showNotification('error', 'Ошибка', 'Введите название локации');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;
      
      const shapeResponse = await fetch('/api/territory/shapes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSpotForm.name,
          points: currentPoints,
          defaultColor: newSpotForm.color,
          description: newSpotForm.description,
        }),
      });

      if (!shapeResponse.ok) {
        const error = await shapeResponse.json();
        throw new Error(error.error || 'Не удалось создать контур');
      }

      const shape = await shapeResponse.json();

      const template = await fetch(`/api/territory/templates/${activeDropMap.templateId}/add-shape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          shapeId: shape.id,
          maxPlayers: newSpotForm.maxPlayers 
        }),
      });

      if (!template.ok) {
        const error = await template.json();
        throw new Error(error.error || 'Не удалось добавить локацию к шаблону');
      }

      showNotification('success', 'Успешно', 'Локация создана');
      
      setCurrentPoints([]);
      setIsDrawingMode(false);
      setNewSpotForm({ name: '', color: '#3B82F6', description: '', maxPlayers: 1 });
      
      await loadDropMapData(activeDropMap.id);
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось создать локацию');
    }
  };

  const handleAssignPlayerToTerritory = async () => {
    if (!assignPlayerForm.territoryId || !assignPlayerForm.playerId) {
      showNotification('error', 'Ошибка', 'Выберите локацию и игрока');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/territory/admin-assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          territoryId: assignPlayerForm.territoryId,
          userId: assignPlayerForm.playerId,
        }),
      });

      if (response.ok) {
        showNotification('success', 'Успешно', 'Игрок назначен на локацию');
        setShowAssignPlayerDialog(false);
        setAssignPlayerForm({ territoryId: '', playerId: '' });
        if (activeDropMap) await loadDropMapData(activeDropMap.id);
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

      const response = await fetch('/api/territory/admin-remove', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          territoryId,
          userId,
        }),
      });

      if (response.ok) {
        showNotification('success', 'Успешно', 'Игрок убран с локации');
        if (activeDropMap) await loadDropMapData(activeDropMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось убрать игрока');
    }
  };
  const handleAssignPlayerToTerritoryInEdit = async (territoryId: string, playerId: string) => {
  if (!territoryId || !playerId) {
    showNotification('error', 'Ошибка', 'Выберите игрока');
    return;
  }

  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch('/api/territory/admin-assign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        territoryId,
        userId: playerId,
      }),
    });

    if (response.ok) {
      showNotification('success', 'Успешно', 'Игрок добавлен на локацию');
      setAssignPlayerForm({ territoryId: '', playerId: '' });
      
      // Обновляем данные
      if (activeDropMap) {
        await loadDropMapData(activeDropMap.id);
      }
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  } catch (error: any) {
    showNotification('error', 'Ошибка', error.message || 'Не удалось добавить игрока');
  }
};

const playerTerritories = useMemo(() => {
  const map = new Map<string, Territory[]>();
  
  territories.forEach(territory => {
    if (territory.claims && territory.claims.length > 0) {
      territory.claims.forEach(claim => {
        if (claim.userId) {
          const existing = map.get(claim.userId) || [];
          map.set(claim.userId, [...existing, territory]);
        }
      });
    }
  });
  
  return map;
}, [territories]);

  const territoryPlayerCounts = useMemo(() => {
      const counts = new Map<string, number>();
      
      territories.forEach(territory => {
        const playersOnTerritory = eligiblePlayers.filter(player => {
          const playerTerrs = playerTerritories.get(player.userId || '');
          return playerTerrs?.some(t => t.id === territory.id);
        });
        counts.set(territory.id, playersOnTerritory.length);
      });
      
      return counts;
    }, [territories, eligiblePlayers, playerTerritories]);

  const filteredUsers = useMemo(() => {
    if (!playerSearchQuery.trim()) return allUsers;
    const query = playerSearchQuery.toLowerCase();
    return allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query)
    );
  }, [allUsers, playerSearchQuery]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  if (authLoading || isLoading) {
    return <LoadingScreen message="Загрузка локаций..." />;
  }

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
            
            {activeDropMap && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {activeDropMap.customName || activeDropMap.template?.name}
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
            
            {activeDropMap?.isLocked && (
              <Badge variant="destructive">
                <Lock className="h-3 w-3 mr-1" />
                Заблокирована
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
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

            {user?.isAdmin && (
              <div className="flex items-center gap-2 pl-3 border-l">
                <span className="text-xs text-muted-foreground hidden md:inline">Админ</span>
                <button 
                  onClick={() => {
                    setIsAdminMode(!isAdminMode);
                    setIsDrawingMode(false);
                    setCurrentPoints([]);
                  }}
                  className={cn("relative inline-flex h-5 w-8 items-center rounded-full transition-colors",
                    isAdminMode ? 'bg-primary' : 'bg-muted')}
                >
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
        <div className="w-64 border-r bg-card/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Карты ({dropMaps.length})</h3>
              {user?.isAdmin && isAdminMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateMapDialog(true)}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
            {dropMaps.map((dropMap) => (
  <div 
    key={dropMap.id}
    className={cn(
      "p-3 rounded-lg border transition-colors group",
      activeDropMap?.id === dropMap.id 
        ? 'border-primary bg-primary/10' 
        : 'border-border hover:bg-muted/50'
    )}
  >
    <div className="flex items-start justify-between gap-2">
      {/* Левая часть - текст */}
      <div 
        onClick={() => !editingMapId && handleSelectDropMap(dropMap.id)}
        className={cn("flex-1 cursor-pointer min-w-0", editingMapId === dropMap.id && "cursor-default")}
      >
        {editingMapId === dropMap.id ? (
          <div className="space-y-2 mb-1">
            <Input
              value={editingMapName}
              onChange={(e) => setEditingMapName(e.target.value)}
              placeholder="Название карты..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveMapName(dropMap.id);
                }}
                className="h-6 text-xs flex-1"
              >
                Сохранить
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMapId(null);
                  setEditingMapName('');
                }}
                className="h-6 text-xs flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-sm truncate">
                {dropMap.customName || dropMap.template?.name}
              </span>
            
              {dropMap.isLocked && (
                <Lock className="h-3 w-3 text-red-500 flex-shrink-0" />
              )}
            </div>
            
            {dropMap.tournament?.name && (
              <div className="text-xs text-muted-foreground truncate">
                {dropMap.tournament.name}
              </div>
            )}
          </>
        )}
      </div>

      {/* Правая часть - кнопки (только в админ режиме) */}
      {isAdminMode && user?.isAdmin && !editingMapId && (
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingMapId(dropMap.id);
              setEditingMapName(dropMap.customName || dropMap.template?.name || '');
            }}
            className="h-7 w-7 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all flex-shrink-0"
            title="Редактировать название"
          >
            <Edit className="h-4 w-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteDropMap(dropMap.id, dropMap.customName || dropMap.template?.name || 'Карта');
            }}
            className="h-7 w-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition-all flex-shrink-0"
            title="Удалить карту"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  </div>
))}
            </div>
          </div>
        </div>

        <div className="flex-1 relative bg-background overflow-hidden flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            width="100%"
            height="100%"
            onClick={handleSVGClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="max-w-full max-h-full"
            style={{ 
              cursor: isDragging ? 'grabbing' : isDrawingMode ? 'crosshair' : 'pointer',
              aspectRatio: '1 / 1'
            }}
          >
            {activeDropMap?.template?.mapImageUrl && (
              <image
                href={activeDropMap.template.mapImageUrl}
                x="0"
                y="0"
                width={SVG_SIZE}
                height={SVG_SIZE}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
            
            {territories.map(territory => (
              <TerritoryPolygon
                key={territory.id}
                territory={territory}
                isSelected={selectedTerritory?.id === territory.id}
                onClick={(e) => handleTerritoryClick(territory, e)}
                onContextMenu={(e) => handleTerritoryContextMenu(territory, e)}
                scale={scale}
              />
            ))}
            
            {isDrawingMode && currentPoints.length > 0 && (
              <DrawingPoints
                points={currentPoints}
                color={newSpotForm.color}
                scale={scale}
              />
            )}
          </svg>
          
          {isAdminMode && isDrawingMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border rounded-lg p-4 shadow-2xl z-10 min-w-[300px]">
              <h3 className="font-semibold mb-3">Новая локация</h3>
              <div className="space-y-3">
                <div>
                  <Label>Название</Label>
                  <Input
                    value={newSpotForm.name}
                    onChange={(e) => setNewSpotForm({ ...newSpotForm, name: e.target.value })}
                    placeholder="Введите название..."
                  />
                </div>
                <div>
                  <Label>Цвет</Label>
                  <Input
                    type="color"
                    value={newSpotForm.color}
                    onChange={(e) => setNewSpotForm({ ...newSpotForm, color: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Макс. игроков</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newSpotForm.maxPlayers}
                    onChange={(e) => setNewSpotForm({ ...newSpotForm, maxPlayers: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Точек: {currentPoints.length} (мин. 3)
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNewSpot}
                    disabled={currentPoints.length < 3 || !newSpotForm.name.trim()}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPoints([])}
                    className="flex-1"
                  >
                    <Undo className="h-4 w-4 mr-2" />
                    Сброс
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsDrawingMode(false);
                    setCurrentPoints([]);
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border text-sm pointer-events-none">
            <div className="text-muted-foreground">
              {isDrawingMode ? (
                <>
                  <div className="font-semibold text-primary mb-1">Режим рисования</div>
                  <div>Клик: Добавить точку</div>
                  <div>Мин. 3 точки</div>
                </>
              ) : (
                <>
                  <div>Скролл: Зум</div>
                  <div>Shift + ЛКМ: Двигать картой</div>
                  <div>Клик: Выбрать локацию</div>
                  {isAdminMode && <div className="text-primary">ПКМ: Меню (админ)</div>}
                </>
              )}
            </div>
          </div>
          
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

        <div className="w-80 border-l bg-card/30 backdrop-blur-sm overflow-y-auto">
          {isAdminMode && user?.isAdmin && (
            <div className="p-4 border-b bg-primary/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Админ-панель
              </h3>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setIsDrawingMode(true);
                    setCurrentPoints([]);
                  }}
                  disabled={isDrawingMode}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать локацию
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowAssignPlayerDialog(true)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Назначить игрока
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowPlayersDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Добавить игроков
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowInviteDialog(true)}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Создать инвайт
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowImportDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Импорт из турнира
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleToggleLock}
                >
                  {activeDropMap?.isLocked ? (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Разблокировать карту
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Заблокировать карту
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Настройки карты
                </Button>
              </div>
            </div>
          )}
          
          {activeDropMap && (
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-3">Настройки DropMap</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Переклейм:</span>
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
          
         {eligiblePlayers.length > 0 && (
  <div className="p-4 border-b">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Users className="h-4 w-4" />
        Игроки и локации ({territories.length})
      </h3>
    </div>

    <div className="space-y-2 max-h-96 overflow-y-auto">
      {territories.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Нет локаций на этой карте</p>
        </div>
      ) : (
        territories.map(territory => {
          const isExpanded = expandedTerritories[territory.id];
          const territoryClaims = territory.claims || [];
          const playerCount = territoryClaims.length;
          const maxPlayers = territory.maxPlayers || 1;
          const isFull = playerCount >= maxPlayers;

          return (
            <div key={territory.id} className="border rounded-lg overflow-hidden bg-card">
              {/* Заголовок локации */}
              <button
                onClick={() => {
                  toggleTerritoryExpanded(territory.id);
                  setSelectedTerritory(territory);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-muted transition-colors",
                  selectedTerritory?.id === territory.id && 'bg-primary/10'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: territory.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{territory.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Макс: {maxPlayers}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={isFull ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {playerCount}/{maxPlayers}
                    </Badge>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </div>
              </button>

              {/* Список игроков */}
              {isExpanded && (
                <div className="border-t">
                  {territoryClaims.length === 0 ? (
                    <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                      Нет игроков на этой локации
                    </div>
                  ) : (
                    <div className="space-y-1 p-2 bg-muted/30">
                      {territoryClaims.map((claim, index) => {
                        const player = eligiblePlayers.find(p => p.userId === claim.userId);
                        
                        return (
                          <div
                            key={`${claim.userId}-${index}`}
                            className="flex items-center justify-between p-2 bg-background rounded border border-border group hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">
                                  {claim.displayName || player?.displayName || 'Неизвестный'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  @{claim.username || player?.user?.username || 'unknown'}
                                </div>
                              </div>
                            </div>

                            {/* Кнопка удаления (только для админа) */}
                            {isAdminMode && user?.isAdmin && (
                              <button
                                onClick={() => handleRemovePlayerFromTerritory(territory.id, claim.userId)}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 rounded bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"
                                title="Убрать с локации"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Кнопка добавить игрока (только если есть место и админ режим) */}
                  {isAdminMode && user?.isAdmin && playerCount < maxPlayers && (
                    <div className="p-2 border-t bg-blue-50/50 dark:bg-blue-950/20">
                      <button
                        onClick={() => {
                          setAssignPlayerForm({
                            territoryId: territory.id,
                            playerId: ''
                          });
                          setSelectedTerritory(territory);
                        }}
                        className="w-full h-7 text-xs rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 transition-colors font-medium"
                      >
                        <Plus className="h-3 w-3" />
                        Добавить игрока
                      </button>
                      
                      {/* Выпадающий список для выбора игрока */}
                      {assignPlayerForm.territoryId === territory.id && (
                        <div className="mt-2 p-2 bg-background rounded border border-border">
                          <Select
                            value={assignPlayerForm.playerId}
                            onValueChange={(value) => {
                              setAssignPlayerForm({
                                territoryId: territory.id,
                                playerId: value
                              });
                              if (value) {
                                handleAssignPlayerToTerritoryInEdit(territory.id, value);
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Выбрать игрока..." />
                            </SelectTrigger>
                            <SelectContent>
                              {eligiblePlayers
                                .filter(p => !territoryClaims.some(c => c.userId === p.userId))
                                .map(player => (
                                  <SelectItem key={player.id} value={player.userId}>
                                    <div className="flex items-center gap-2">
                                      <span>{player.displayName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        (@{player.user?.username})
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
)}
          
          {selectedTerritory ? (
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-3">{selectedTerritory.name}</h3>
              <div className="space-y-3">
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

                    {activeDropMap?.isLocked && !user?.isAdmin && (
                      <div className="text-xs text-red-600 text-center font-medium">
                        Карта заблокирована администратором
                      </div>
                    )}
                    
                    {activeDropMap?.isLocked && user?.isAdmin && (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleClaimTerritory(selectedTerritory.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Клеймим...' : 'Заклеймить (админ)'}
                      </Button>
                    )}

                    {!isUserEligible && !user?.isAdmin && !activeDropMap?.isLocked && (
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
              <p className="text-xs mt-1">Чтобы заклеймить</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreateMapDialog} onOpenChange={setShowCreateMapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая карта</DialogTitle>
            <DialogDescription>Создайте карту на основе шаблона</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Шаблон карты</Label>
              <Select
                value={mapForm.templateId}
                onValueChange={(value) => setMapForm({ ...mapForm, templateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Турнир (опционально)</Label>
              <Select
                value={mapForm.tournamentId}
                onValueChange={(value) => setMapForm({ ...mapForm, tournamentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите турнир" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без турнира</SelectItem>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="allowReclaim"
                checked={mapForm.allowReclaim}
                onChange={(e) => setMapForm({ ...mapForm, allowReclaim: e.target.checked })}
              />
              <Label htmlFor="allowReclaim">Разрешить переклейм</Label>
            </div>
            <Button onClick={handleCreateDropMap} className="w-full">
              Создать карту
            </Button>
          </div>
        </DialogContent>
      </Dialog>

<Dialog open={showEditTerritoryDialog} onOpenChange={setShowEditTerritoryDialog}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Редактировать локацию</DialogTitle>
      <DialogDescription>
        Измените параметры локации и управляйте игроками
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Основные настройки */}
      <div className="space-y-4 pb-4 border-b">
        <h4 className="font-semibold text-sm">Основные настройки</h4>
        <div>
          <Label>Название</Label>
          <Input
            value={editTerritoryForm.name}
            onChange={(e) => setEditTerritoryForm({ ...editTerritoryForm, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Цвет</Label>
          <Input
            type="color"
            value={editTerritoryForm.color}
            onChange={(e) => setEditTerritoryForm({ ...editTerritoryForm, color: e.target.value })}
          />
        </div>
        <div>
          <Label>Макс. игроков на локации</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={editTerritoryForm.maxPlayers}
            onChange={(e) => setEditTerritoryForm({ ...editTerritoryForm, maxPlayers: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div>
          <Label>Описание</Label>
          <Textarea
            value={editTerritoryForm.description}
            onChange={(e) => setEditTerritoryForm({ ...editTerritoryForm, description: e.target.value })}
          />
        </div>
      </div>

      {/* Управление игроками (только для админов) */}
      {user?.isAdmin && isAdminMode && selectedTerritory && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Игроки на локации</h4>
            <Badge variant="outline">
              {selectedTerritory.claims?.length || 0} / {editTerritoryForm.maxPlayers}
            </Badge>
          </div>

          {/* Список текущих игроков */}
          {(() => {
            const currentClaims = selectedTerritory.claims || [];
            
            return currentClaims.length > 0 ? (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                {currentClaims.map((claim, index) => {
                  const player = eligiblePlayers.find(p => p.userId === claim.userId);
                  
                  return (
                    <div 
                      key={`${claim.userId}-${index}`}
                      className="flex items-center justify-between p-2 bg-background rounded border"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {claim.displayName || player?.displayName || 'Неизвестный игрок'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{claim.username || player?.user?.username || 'unknown'}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemovePlayerFromTerritory(selectedTerritory.id, claim.userId)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        title="Убрать с локации"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет игроков на этой локации</p>
              </div>
            );
          })()}

          {/* Добавление нового игрока */}
          {(() => {
            const currentPlayerCount = selectedTerritory.claims?.length || 0;
            const canAddMore = currentPlayerCount < editTerritoryForm.maxPlayers;
            
            // Получаем всех игроков, которые ЕЩЁ НЕ на этой локации
            const availablePlayers = eligiblePlayers.filter(p => {
              const isOnThisTerritory = selectedTerritory.claims?.some(
                claim => claim.userId === p.userId
              );
              return !isOnThisTerritory;
            });
            
            return canAddMore ? (
              <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label className="text-sm font-medium">Добавить игрока на локацию</Label>
                </div>
                
                {availablePlayers.length > 0 ? (
                  <>
                    <Select
                      value={assignPlayerForm.playerId}
                      onValueChange={(value) => setAssignPlayerForm({ 
                        territoryId: selectedTerritory.id, 
                        playerId: value 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите игрока из списка..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayers.map((p) => (
                          <SelectItem key={p.id} value={p.userId}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.displayName}</span>
                              <span className="text-xs text-muted-foreground">
                                (@{p.user?.username || 'unknown'})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        if (assignPlayerForm.playerId) {
                          handleAssignPlayerToTerritoryInEdit(selectedTerritory.id, assignPlayerForm.playerId);
                        }
                      }}
                      disabled={!assignPlayerForm.playerId}
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Добавить игрока на локацию
                    </Button>
                    
                    <div className="text-xs text-muted-foreground">
                      💡 Доступно игроков для добавления: {availablePlayers.length}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p>Все игроки с карты уже на локациях</p>
                    <p className="text-xs mt-1">
                      Добавьте новых игроков через "Добавить игроков" в админ-панели
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Достигнут лимит игроков на локации</div>
                    <div className="text-xs mt-1">
                      На этой локации уже {currentPlayerCount} из {editTerritoryForm.maxPlayers} игроков.
                      Увеличьте лимит или уберите существующих игроков.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSaveEditTerritory} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Сохранить изменения
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowEditTerritoryDialog(false);
            setAssignPlayerForm({ territoryId: '', playerId: '' });
          }}
          className="flex-1"
        >
          Отмена
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

      <Dialog open={showPlayersDialog} onOpenChange={(open) => {
        setShowPlayersDialog(open);
        if (!open) setPlayerSearchQuery('');
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить игроков</DialogTitle>
            <DialogDescription>Выберите пользователей для доступа к карте</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Поиск игроков</Label>
              <Input
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                placeholder="Введите имя или username..."
                className="w-full"
              />
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex items-center justify-between bg-primary/10 p-2 rounded">
                <span className="text-sm font-medium">Выбрано: {selectedUsers.length}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUsers([])}
                >
                  Очистить
                </Button>
              </div>
            )}
            
            <div className="max-h-96 overflow-y-auto border rounded p-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ничего не найдено</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map(u => {
                    const isSelected = selectedUsers.includes(u.id);
                    const isAlreadyAdded = eligiblePlayers.some(p => p.userId === u.id);
                    
                    return (
                      <label 
                        key={u.id} 
                        className={cn(
                          "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
                          isAlreadyAdded ? "opacity-50 cursor-not-allowed" : "hover:bg-muted",
                          isSelected && !isAlreadyAdded && "bg-primary/10"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAlreadyAdded}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, u.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                            }
                          }}
                          className="cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{u.displayName}</div>
                          <div className="text-xs text-muted-foreground">@{u.username}</div>
                        </div>
                        {isAlreadyAdded && (
                          <Badge variant="secondary" className="text-xs">
                            Уже добавлен
                          </Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleAddPlayers} 
                disabled={selectedUsers.length === 0} 
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Добавить ({selectedUsers.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPlayersDialog(false);
                  setPlayerSearchQuery('');
                }}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать инвайт-код</DialogTitle>
            <DialogDescription>Создайте код для приглашения игроков</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Отображаемое имя</Label>
              <Input
                value={inviteForm.displayName}
                onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })}
                placeholder="Например: Турнир #1"
              />
            </div>
            <div>
              <Label>Срок действия (дней)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={inviteForm.expiresInDays}
                onChange={(e) => setInviteForm({ ...inviteForm, expiresInDays: parseInt(e.target.value) })}
              />
            </div>
            <Button onClick={handleCreateInvite} className="w-full">
              Создать код
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Импорт из турнира</DialogTitle>
            <DialogDescription>Импортируйте игроков из результатов турнира</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Турнир</Label>
              <Select
                value={importForm.tournamentId}
                onValueChange={(value) => setImportForm({ ...importForm, tournamentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите турнир" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Топ N игроков</Label>
              <Input
                type="number"
                value={importForm.topN}
                onChange={(e) => setImportForm({ ...importForm, topN: e.target.value, positions: '' })}
                placeholder="Например: 20"
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">или</div>
            <div>
              <Label>Конкретные позиции</Label>
              <Input
                value={importForm.positions}
                onChange={(e) => setImportForm({ ...importForm, positions: e.target.value, topN: '' })}
                placeholder="Например: 1,2,5,10"
              />
            </div>
            <Button 
              onClick={handleImportPlayers} 
              disabled={!importForm.tournamentId || (!importForm.topN && !importForm.positions)}
              className="w-full"
            >
              Импортировать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки карты</DialogTitle>
            <DialogDescription>Измените параметры текущей карты</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {activeDropMap && (
              <>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="settingsAllowReclaim"
                    checked={settingsForm.allowReclaim}
                    onChange={(e) => setSettingsForm({ ...settingsForm, allowReclaim: e.target.checked })}
                  />
                  <Label htmlFor="settingsAllowReclaim">Разрешить переклейм</Label>
                </div>
                
                <div>
                  <Label>Изображение карты</Label>
                  <div className="space-y-2">
                    <input
                      ref={mapImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleMapImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => mapImageInputRef.current?.click()}
                      className="w-full"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {settingsForm.mapImageFile ? settingsForm.mapImageFile.name : 'Выбрать новое изображение'}
                    </Button>
                    {settingsForm.mapImageFile && (
                      <div className="text-xs text-muted-foreground">
                        Размер: {(settingsForm.mapImageFile.size / 1024 / 1024).toFixed(2)} МБ
                        <br />
                        Изображение будет автоматически масштабировано до 1000x1000
                      </div>
                    )}
                    {activeDropMap.template?.mapImageUrl && !settingsForm.mapImageFile && (
                      <div className="text-xs text-muted-foreground">
                        Текущее изображение установлено
                      </div>
                    )}
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} className="w-full">
                  Сохранить настройки
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignPlayerDialog} onOpenChange={setShowAssignPlayerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить игрока на локацию</DialogTitle>
            <DialogDescription>Выберите локацию и игрока для назначения</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Локация</Label>
              <Select
                value={assignPlayerForm.territoryId}
                onValueChange={(value) => setAssignPlayerForm({ ...assignPlayerForm, territoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите локацию" />
                </SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.owner && `(${t.owner.displayName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Игрок</Label>
              <Select
                value={assignPlayerForm.playerId}
                onValueChange={(value) => setAssignPlayerForm({ ...assignPlayerForm, playerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите игрока" />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePlayers.map((p) => (
                    <SelectItem key={p.id} value={p.userId}>
                      {p.displayName} (@{p.user?.username || 'unknown'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
              <Info className="h-4 w-4 inline mr-1" />
              Это назначит игрока на локацию, добавив его к существующим игрокам (если они есть)
            </div>
            
            <Button 
              onClick={handleAssignPlayerToTerritory} 
              disabled={!assignPlayerForm.territoryId || !assignPlayerForm.playerId}
              className="w-full"
            >
              Назначить игрока
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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