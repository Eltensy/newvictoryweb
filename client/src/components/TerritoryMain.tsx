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
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import LoadingScreen from './LoadingScreen';
import {
  Trophy, Crown, MapPin, Home, User, Settings, Loader2,
  AlertCircle, Users, CheckCircle, XCircle, AlertTriangle, Info, ZoomIn,
  ZoomOut, RotateCcw, Lock, Unlock, Copy, Plus, Trash2,
  Edit, Save, X, Undo, UserPlus, Upload, Link as LinkIcon, Image as ImageIcon, ChevronDown,
  Wifi, WifiOff, Download
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
    teamId?: string;
    teamName?: string;
    isTeamLeader?: boolean;
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
  tournament?: { name: string; teamMode?: 'solo' | 'duo' | 'trio' | 'squad'; };
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
  teamInfo?: {
    teamId: string;
    teamName: string;
    isLeader: boolean;
    members: Array<{
      userId: string;
      username: string;
      displayName: string;
      isLeader: boolean;
    }>;
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

// Team Slot Editor Component
function TeamSlotEditor({ slotNumber, slot, allUsers, onChange }: {
  slotNumber: number;
  slot: { type: 'real' | 'virtual' | 'empty'; userId?: string; displayName?: string; username?: string };
  allUsers: any[];
  onChange: (slot: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredUsers = allUsers.filter(u =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
            {slotNumber}
          </div>
          <span className="font-medium">Игрок {slotNumber}</span>
        </div>

        {slot.type !== 'empty' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ type: 'empty' })}
            className="text-red-500 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {slot.type === 'empty' ? (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full"
          >
            <User className="h-4 w-4 mr-2" />
            Игрок с сайта
          </Button>
          <Button
            variant="outline"
            onClick={() => onChange({ type: 'virtual', displayName: '' })}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Виртуальный
          </Button>
          <Button
            variant="outline"
            onClick={() => onChange({ type: 'empty' })}
            className="w-full text-muted-foreground"
            disabled
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Пустой слот
          </Button>
        </div>
      ) : slot.type === 'real' ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-sm font-medium">{slot.displayName}</div>
              <div className="text-xs text-muted-foreground">@{slot.username}</div>
            </div>
          </div>
        </div>
      ) : slot.type === 'virtual' ? (
        <div className="space-y-2">
          <Label>Никнейм виртуального игрока</Label>
          <Input
            value={slot.displayName || ''}
            onChange={(e) => onChange({ ...slot, displayName: e.target.value })}
            placeholder="Например: Player123"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Виртуальный игрок не привязан к аккаунту на сайте
          </p>
        </div>
      ) : null}

      {/* Player selection expanded view */}
      {isExpanded && slot.type === 'empty' && (
        <div className="space-y-2 pt-2 border-t">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Нет доступных игроков
              </div>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    onChange({
                      type: 'real',
                      userId: u.id,
                      displayName: u.displayName,
                      username: u.username
                    });
                    setIsExpanded(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="text-sm font-medium">{u.displayName}</div>
                  <div className="text-xs text-muted-foreground">@{u.username}</div>
                </button>
              ))
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsExpanded(false);
              setSearchQuery('');
            }}
            className="w-full"
          >
            Отмена
          </Button>
        </div>
      )}
    </div>
  );
}

const TerritoryPolygon = React.memo(({ territory, isSelected, onClick, onContextMenu, scale, tournamentTeamMode }: { territory: Territory; isSelected: boolean; onClick: (e: React.MouseEvent) => void; onContextMenu: (e: React.MouseEvent) => void; scale: number; tournamentTeamMode?: 'solo' | 'duo' | 'trio' | 'squad'; }) => {
  // Убираем дубликаты по userId и пустые claims - memoized
  const uniqueClaims = useMemo(() =>
    territory.claims ? territory.claims
      .filter(claim => claim && claim.userId) // Remove null/undefined claims
      .filter((claim, index, self) =>
        index === self.findIndex(c => c.userId === claim.userId)
      ) : [],
    [territory.claims]
  );

  // Group claims by teams if teamId exists
  const groupedClaims = useMemo(() => {
    if (!uniqueClaims.length) return [];

    // Check if this is a team-based map (any claim has teamId)
    const hasTeams = uniqueClaims.some(c => c.teamId);

    if (!hasTeams) {
      // No teams - return claims as individual entries
      return uniqueClaims.map(claim => ({
        displayText: claim.displayName || territory.name,
        isTeamLeader: false,
        teamName: null,
      }));
    }

    // Group by teams
    const teamGroups: Record<string, typeof uniqueClaims> = {};
    uniqueClaims.forEach(claim => {
      const teamId = claim.teamId || 'solo';
      if (!teamGroups[teamId]) {
        teamGroups[teamId] = [];
      }
      teamGroups[teamId].push(claim);
    });

    // Convert to display format - show teams in one line with "+" separator
    const result: Array<{ displayText: string; isTeamLeader: boolean; teamName: string | null }> = [];

    const entries = Object.entries(teamGroups);
    const teamEntries = entries.filter(([teamId]) => teamId !== 'solo');
    const soloEntries = entries.filter(([teamId]) => teamId === 'solo');

    // Process teams - only show if there are actual members
    teamEntries.forEach(([teamId, members]) => {
      if (members.length === 0) return; // Skip empty teams

      const leader = members.find(m => m.isTeamLeader);

      // Get team size from tournament teamMode, or fallback to territory.maxPlayers
      let teamMaxPlayers = territory.maxPlayers || 1;
      if (tournamentTeamMode) {
        const teamSizeMap = { solo: 1, duo: 2, trio: 3, squad: 4 };
        teamMaxPlayers = teamSizeMap[tournamentTeamMode] || teamMaxPlayers;
      }

      const emptySlots = Math.max(0, teamMaxPlayers - members.length);

      // Build team display string: "Player1 + Player2 + ? + ?"
      const memberNames = members.map(m => m.displayName || 'Unknown');

      // Only add "?" if there are actual members
      const emptySlotMarkers = members.length > 0 ? Array(emptySlots).fill('?') : [];
      const allSlots = [...memberNames, ...emptySlotMarkers];
      const displayText = allSlots.join(' + ');

      result.push({
        displayText,
        isTeamLeader: !!leader,
        teamName: members[0]?.teamName || null,
      });
    });

    // Process solo players
    soloEntries.forEach(([teamId, members]) => {
      members.forEach(member => {
        result.push({
          displayText: member.displayName || territory.name,
          isTeamLeader: false,
          teamName: null,
        });
      });
    });

    return result;
  }, [uniqueClaims, territory.name, territory.maxPlayers, tournamentTeamMode]);

  const hasClaims = uniqueClaims.length > 0;
  const claimCount = groupedClaims.length;

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
      {hasClaims && scale > 0.5 && groupedClaims.length > 0 && (() => {
        const positions = getTextPositions(groupedClaims.length);

        return groupedClaims.map((group, index) => {
          const pos = positions[index];
          if (!pos) return null;

          return (
            <text
              key={`claim-${index}`}
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
              {group.displayText}
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
  const { toast } = useToast();
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
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

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

  // Dynamic background color based on map edges
  const [dynamicBgColor, setDynamicBgColor] = useState<string>('rgb(9, 9, 11)');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAssignPlayerDialog, setShowAssignPlayerDialog] = useState(false);
  const [showAddPlayerToTeamDialog, setShowAddPlayerToTeamDialog] = useState(false);

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
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Team building states
  const [addPlayerStep, setAddPlayerStep] = useState<'select_captain' | 'build_team' | 'add_members'>('select_captain');
  const [selectedCaptain, setSelectedCaptain] = useState<string | null>(null);
  const [teamSlots, setTeamSlots] = useState<Array<{
    type: 'real' | 'virtual' | 'empty';
    userId?: string;
    displayName?: string;
    username?: string;
  }>>([]);

  const [inviteForm, setInviteForm] = useState({ displayName: '', expiresInDays: 30, teamMemberNames: '' });
  const [importForm, setImportForm] = useState({ tournamentId: '', topN: '', positions: '' });
  const [settingsForm, setSettingsForm] = useState({ isLocked: false, mapImageFile: null as File | null });
  const [assignPlayerForm, setAssignPlayerForm] = useState({ territoryId: '', playerId: '' });
  const [addPlayerToTeamForm, setAddPlayerToTeamForm] = useState({
    teamId: '',
    teamName: '',
    currentMembers: [] as EligiblePlayer[],
    playerType: '' as 'real' | 'virtual' | '',
    selectedUserId: '',
    virtualPlayerName: '',
    searchQuery: '',
  });
  
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; }>({ isOpen: false, type: 'info', title: '', message: '' });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'default' });

  const showNotification = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({ isOpen: true, type, title, message });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          onConfirm();
          resolve(true);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        },
        variant
      });
    });
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

    console.log('📦 Loaded map data:', {
      territories: data.territories?.length,
      eligiblePlayers: data.eligiblePlayers?.length,
      playersWithTeams: data.eligiblePlayers?.filter((p: any) => p.teamInfo).length,
    });

    // ✅ Обновить все данные сразу
    setTerritories(data.territories);
    setEligiblePlayers(data.eligiblePlayers);
    setIsUserEligible(data.isUserEligible);
    if (user?.isAdmin) {
      setInviteCodes(data.inviteCodes);
    }

    // ✅ Обновить информацию о карте (включая tournament)
    if (data.map) {
      setActiveMap(prev => prev?.id === data.map.id ? data.map : prev);
      // Также обновить в списке всех карт
      setAllMaps(prev => prev.map(m => m.id === data.map.id ? data.map : m));
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

    // Временно устанавливаем карту из allMaps (без tournament)
    setActiveMap(foundMap);

    // Загружаем полные данные карты (включая tournament)
    // loadMapData сам обновит activeMap с правильными данными
    await loadMapData(foundMap.id);

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
    showConfirm(
      'Удалить карту?',
      `Удалить карту "${mapName}"?\n\nЭто действие необратимо.`,
      async () => {
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
      },
      'destructive'
    );
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

  const generateMapPNG = async (): Promise<Blob | null> => {
    if (!activeMap) return null;

    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to create canvas'));
          return;
        }

        // Use full map size for export
        const SVG_SIZE = 1000;
        const exportScale = 2; // 2x resolution (2000x2000) - баланс качества и размера файла

        canvas.width = SVG_SIZE * exportScale;
        canvas.height = SVG_SIZE * exportScale;

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Function to draw territories directly on canvas
        const drawTerritories = () => {
          territories.forEach(territory => {
            // Get unique claims
            const uniqueClaims = territory.claims ? territory.claims
              .filter(claim => claim && claim.userId)
              .filter((claim, index, self) =>
                index === self.findIndex(c => c.userId === claim.userId)
              ) : [];

            const hasClaims = uniqueClaims.length > 0;
            const claimCount = uniqueClaims.length;
            const displayColor = claimCount >= 2 ? '#EF4444' : territory.color;

            // Draw polygon
            ctx.beginPath();
            territory.points.forEach((point, i) => {
              const x = point.x * exportScale;
              const y = point.y * exportScale;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();

            // Fill polygon
            ctx.fillStyle = displayColor;
            ctx.globalAlpha = hasClaims ? 0.5 : 0.25;
            ctx.fill();

            // Stroke polygon
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = displayColor;
            ctx.lineWidth = 2 * exportScale;
            ctx.stroke();

            // Draw text labels if there are claims
            if (hasClaims) {
              const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
              const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;

              // Group claims by teams
              const hasTeams = uniqueClaims.some(c => c.teamId);
              let displayTexts: string[] = [];

              if (!hasTeams) {
                displayTexts = uniqueClaims.map(c => c.displayName || territory.name);
              } else {
                const teamGroups: Record<string, typeof uniqueClaims> = {};
                uniqueClaims.forEach(claim => {
                  const teamId = claim.teamId || 'solo';
                  if (!teamGroups[teamId]) teamGroups[teamId] = [];
                  teamGroups[teamId].push(claim);
                });

                Object.entries(teamGroups).forEach(([teamId, members]) => {
                  if (teamId !== 'solo' && members.length > 0) {
                    const memberNames = members.map(m => m.displayName).join(' + ');
                    displayTexts.push(memberNames);
                  } else {
                    members.forEach(m => displayTexts.push(m.displayName || territory.name));
                  }
                });
              }

              // Calculate text positions
              const offset = 20;
              displayTexts.forEach((text, index) => {
                let yPos = centerY;
                if (displayTexts.length > 1) {
                  const totalHeight = offset * 2 * (displayTexts.length - 1);
                  const startY = centerY - totalHeight / 2;
                  yPos = startY + (totalHeight / (displayTexts.length - 1)) * index;
                }

                const x = centerX * exportScale;
                const y = yPos * exportScale;

                // Set font
                ctx.font = `bold ${14 * exportScale}px Montserrat, Inter, system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw text stroke (outline)
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.lineWidth = 3 * exportScale;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.strokeText(text, x, y);

                // Draw text fill
                ctx.fillStyle = '#ffffff';
                ctx.fillText(text, x, y);
              });
            }
          });

          // Export canvas to PNG
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/png', 0.92); // Качество 0.92 для баланса размера и качества
        };

        // Load and draw background image first
        if (activeMap.mapImageUrl) {
          const bgImage = new Image();
          bgImage.crossOrigin = 'anonymous';

          bgImage.onload = () => {
            // Draw background
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
            // Then draw territories on top
            drawTerritories();
          };

          bgImage.onerror = () => {
            console.warn('Failed to load background image, using dark background');
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawTerritories();
          };

          bgImage.src = activeMap.mapImageUrl;
        } else {
          // No background image, just draw dark background and territories
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          drawTerritories();
        }

      } catch (error) {
        reject(error);
      }
    });
  };

  const handleExportMapAsPNG = async () => {
    if (!activeMap) return;

    try {
      const blob = await generateMapPNG();
      if (blob) {
        const link = document.createElement('a');
        link.download = `${activeMap.name}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        showNotification('success', 'Успешно', 'Карта экспортирована');
      }
    } catch (error) {
      console.error('Export error:', error);
      showNotification('error', 'Ошибка', 'Не удалось экспортировать карту');
    }
  };

  const handleSendMapToDiscord = async () => {
    if (!activeMap) return;

    try {
      setIsLoading(true);
      const blob = await generateMapPNG();

      if (!blob) {
        showNotification('error', 'Ошибка', 'Не удалось создать изображение');
        return;
      }

      const formData = new FormData();
      formData.append('image', blob, `${activeMap.name}.png`);

      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/maps/${activeMap.id}/send-to-discord`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send map to Discord');
      }

      showNotification('success', 'Успешно', 'Карта отправлена в Discord');
    } catch (error: any) {
      console.error('Send to Discord error:', error);
      showNotification('error', 'Ошибка', error.message || 'Не удалось отправить карту');
    } finally {
      setIsLoading(false);
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

  // Handle team captain selection
  const handleSelectCaptain = (userId: string) => {
    setSelectedCaptain(userId);

    // Initialize team slots based on team mode
    const teamMode = activeMap?.tournament?.teamMode;
    const slotCount = teamMode === 'duo' ? 1 : teamMode === 'trio' ? 2 : teamMode === 'squad' ? 3 : 0;

    setTeamSlots(Array(slotCount).fill(null).map(() => ({ type: 'empty' })));
    setAddPlayerStep('add_members');
  };

  // Handle team submission
  const handleSubmitTeam = async () => {
    if (!activeMap || !selectedCaptain) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      // Prepare team data
      const teamMembers = teamSlots
        .filter(slot => slot.type !== 'empty')
        .map(slot => ({
          type: slot.type,
          userId: slot.userId,
          displayName: slot.displayName,
        }));

      const response = await fetch(`/api/maps/${activeMap.id}/add-team`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainId: selectedCaptain,
          members: teamMembers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('success', 'Успешно', data.message || 'Команда добавлена');
        handleCloseAddPlayersDialog();
        await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось добавить команду');
    }
  };

  // Handle solo player addition (for non-team modes)
  const handleAddPlayers = async () => {
    if (!activeMap || selectedUsers.length === 0) return;

    // For team modes, use team building flow
    const isTeamMode = activeMap.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo';

    if (isTeamMode) {
      // If single user selected, treat as captain selection
      if (selectedUsers.length === 1) {
        handleSelectCaptain(selectedUsers[0]);
        return;
      }

      showNotification('error', 'Ошибка', 'Для командного режима выберите одного капитана');
      return;
    }

    // Solo mode - add multiple players
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
        handleCloseAddPlayersDialog();
        await loadMapData(activeMap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      showNotification('error', 'Ошибка', error.message || 'Не удалось добавить игроков');
    }
  };

  const handleCloseAddPlayersDialog = () => {
    setShowPlayersDialog(false);
    setSelectedUsers([]);
    setPlayerSearchQuery('');
    setTeamSearchQuery('');
    setAddPlayerStep('select_captain');
    setSelectedCaptain(null);
    setTeamSlots([]);
  };

  const handleRemovePlayer = async (userId: string, displayName: string) => {
    if (!activeMap) return;

    showConfirm(
      'Удалить игрока?',
      `Удалить игрока ${displayName} с дропмапы?`,
      async () => {
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
      },
      'destructive'
    );
  };

  const handleRemoveTeam = async (teamId: string, teamName: string) => {
    if (!activeMap) return;

    showConfirm(
      'Удалить команду?',
      `Удалить команду "${teamName}" с дропмапы и турнира?\n\nВсе игроки команды будут удалены с дропмапы, а команда - из турнира.`,
      async () => {
        try {
          const token = getAuthToken();
          if (!token) return;

          // Find all team members
          const teamMembers = eligiblePlayers.filter(p => p.teamInfo?.teamId === teamId);

          // Remove all team members from dropmap
          for (const member of teamMembers) {
            const response = await fetch(`/api/maps/${activeMap.id}/players/${member.userId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
              throw new Error(`Не удалось удалить игрока ${member.displayName}`);
            }
          }

          // If this is a real tournament team (not virtual invite team), delete from tournament
          // Virtual teams created via invites have teamId starting with 'team-invite-'
          // Real teams created via "Create Team" UI have UUID teamId
          if (activeMap.tournamentId && !teamId.startsWith('team-invite-')) {
            const deleteTeamResponse = await fetch(`/api/tournaments/${activeMap.tournamentId}/teams/${teamId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!deleteTeamResponse.ok) {
              console.warn('Failed to delete tournament team, but dropmap cleanup succeeded');
            }
          }

          showNotification('success', 'Успешно', `Команда "${teamName}" удалена`);
          await loadMapData(activeMap.id);
        } catch (error: any) {
          showNotification('error', 'Ошибка', error.message);
        }
      },
      'destructive'
    );
  };

  const handleRemovePlayerFromTeam = async (userId: string, displayName: string, teamId: string) => {
    if (!activeMap) return;

    const teamMembers = eligiblePlayers.filter(p => p.teamInfo?.teamId === teamId);
    const isLeader = eligiblePlayers.find(p => p.userId === userId)?.teamInfo?.isLeader;

    if (isLeader && teamMembers.length > 1) {
      showConfirm(
        'Удалить капитана?',
        `Удалить капитана ${displayName}?\n\nЭто удалит всю команду, так как ${displayName} является капитаном.`,
        async () => {
          await handleRemoveTeam(teamId, `Team ${displayName}`);
        },
        'destructive'
      );
      return;
    }

    showConfirm(
      'Удалить из команды?',
      `Удалить ${displayName} из команды?`,
      async () => {
        try {
          const token = getAuthToken();
          if (!token) return;

          const response = await fetch(`/api/maps/${activeMap.id}/players/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            showNotification('success', 'Успешно', `${displayName} удален из команды`);
            await loadMapData(activeMap.id);
          } else {
            throw new Error('Не удалось удалить игрока');
          }
        } catch (error: any) {
          showNotification('error', 'Ошибка', error.message);
        }
      },
      'destructive'
    );
  };

  const getMaxTeamSize = () => {
    const teamMode = activeMap?.tournament?.teamMode;
    if (!teamMode || teamMode === 'solo') return 1;
    const teamSizeMap = { duo: 2, trio: 3, squad: 4 };
    return teamSizeMap[teamMode as keyof typeof teamSizeMap] || 4;
  };

  const handleAddPlayerToTeam = (teamId: string, teamName: string, currentMembers: EligiblePlayer[]) => {
    setAddPlayerToTeamForm({
      teamId,
      teamName,
      currentMembers,
      playerType: '',
      selectedUserId: '',
      virtualPlayerName: '',
      searchQuery: '',
    });
    setShowAddPlayerToTeamDialog(true);
  };

  const handleSubmitAddPlayerToTeam = async () => {
    if (!activeMap) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      let userId: string;
      let displayName: string;

      if (addPlayerToTeamForm.playerType === 'real') {
        // Real user
        if (!addPlayerToTeamForm.selectedUserId) {
          showNotification('error', 'Ошибка', 'Выберите игрока');
          return;
        }
        const selectedUser = allUsers.find(u => u.id === addPlayerToTeamForm.selectedUserId);
        if (!selectedUser) {
          showNotification('error', 'Ошибка', 'Игрок не найден');
          return;
        }
        userId = selectedUser.id;
        displayName = selectedUser.displayName;
      } else if (addPlayerToTeamForm.playerType === 'virtual') {
        // Virtual player
        if (!addPlayerToTeamForm.virtualPlayerName.trim()) {
          showNotification('error', 'Ошибка', 'Введите никнейм виртуального игрока');
          return;
        }
        userId = `virtual-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        displayName = addPlayerToTeamForm.virtualPlayerName.trim();
      } else {
        showNotification('error', 'Ошибка', 'Выберите тип игрока');
        return;
      }

      const response = await fetch(`/api/maps/${activeMap.id}/add-player-to-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          displayName,
          sourceType: 'invite',
          teamId: addPlayerToTeamForm.teamId,
          isTeamLeader: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось добавить игрока');
      }

      showNotification('success', 'Успешно', `${displayName} добавлен в команду "${addPlayerToTeamForm.teamName}"`);

      // Reset form
      setAddPlayerToTeamForm({
        teamId: '',
        teamName: '',
        currentMembers: [],
        playerType: '',
        selectedUserId: '',
        virtualPlayerName: '',
        searchQuery: '',
      });

      setShowAddPlayerToTeamDialog(false);

      // Reload map data
      await loadMapData(activeMap.id);

      console.log('✅ Player added successfully, data reloaded');
    } catch (error: any) {
      console.error('❌ Error adding player:', error);
      showNotification('error', 'Ошибка', error.message);
    }
  };

  const handleCreateInvite = async () => {
    if (!activeMap) return;
    try {
      const token = getAuthToken();
      if (!token) return;

      // Парсим имена членов команды (по одному на строку)
      const teamMembers = inviteForm.teamMemberNames
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      const payload = {
        displayName: inviteForm.displayName,
        expiresInDays: inviteForm.expiresInDays,
        teamMemberNames: teamMembers.length > 0 ? JSON.stringify(teamMembers) : null,
      };

      const response = await fetch(`/api/maps/${activeMap.id}/invites`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        const inviteUrl = `${window.location.origin}/dropmap/invite/${data.code}`;
        navigator.clipboard.writeText(inviteUrl);
        showNotification('success', 'Успешно', `Код создан и скопирован: ${data.code}`);
        setShowInviteDialog(false);
        setInviteForm({ displayName: '', expiresInDays: 30, teamMemberNames: '' }); // Сброс формы
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
    showConfirm(
      'Удалить локацию?',
      `Удалить локацию "${territory.name}"?`,
      async () => {
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
      },
      'destructive'
    );
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
    showConfirm(
      'Убрать игрока?',
      'Убрать игрока с этой локации?',
      async () => {
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
      },
      'destructive'
    );
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

  // Extract edge colors from map image for dynamic background
  useEffect(() => {
    if (!activeMap?.mapImageUrl) {
      setDynamicBgColor('rgb(9, 9, 11)');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Sample pixels from all four edges
        const sampleSize = 20; // Sample 20 pixels from each edge
        const colors: number[][] = [];

        // Top edge
        for (let i = 0; i < sampleSize; i++) {
          const x = Math.floor((i / sampleSize) * img.width);
          const data = ctx.getImageData(x, 0, 1, 1).data;
          colors.push([data[0], data[1], data[2]]);
        }

        // Bottom edge
        for (let i = 0; i < sampleSize; i++) {
          const x = Math.floor((i / sampleSize) * img.width);
          const data = ctx.getImageData(x, img.height - 1, 1, 1).data;
          colors.push([data[0], data[1], data[2]]);
        }

        // Left edge
        for (let i = 0; i < sampleSize; i++) {
          const y = Math.floor((i / sampleSize) * img.height);
          const data = ctx.getImageData(0, y, 1, 1).data;
          colors.push([data[0], data[1], data[2]]);
        }

        // Right edge
        for (let i = 0; i < sampleSize; i++) {
          const y = Math.floor((i / sampleSize) * img.height);
          const data = ctx.getImageData(img.width - 1, y, 1, 1).data;
          colors.push([data[0], data[1], data[2]]);
        }

        // Calculate average color
        const avgColor = colors.reduce(
          (acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]],
          [0, 0, 0]
        ).map(c => Math.floor(c / colors.length));

        // Use the color as-is for perfect match with map edges
        setDynamicBgColor(`rgb(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]})`);
      } catch (err) {
        console.error('Failed to extract edge color:', err);
        setDynamicBgColor('rgb(9, 9, 11)');
      }
    };

    img.onerror = () => {
      setDynamicBgColor('rgb(9, 9, 11)');
    };

    img.src = activeMap.mapImageUrl;
  }, [activeMap?.mapImageUrl]);

  if (authLoading || isLoading) { return <LoadingScreen message="Загрузка локаций..." />; }
  if (error) { return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center space-y-4"><AlertCircle className="h-12 w-12 text-red-500 mx-auto" /><div className="text-red-500 font-semibold">{error}</div><Button onClick={() => window.location.reload()}>Перезагрузить</Button></div></div>); }

  return (
    <div
      className="min-h-screen transition-colors duration-1000"
      style={{ backgroundColor: dynamicBgColor }}
    >
      {contextMenu && (
        <TerritoryContextMenu
          territory={contextMenu.territory}
          onEdit={handleEditTerritory}
          onDelete={handleDeleteTerritory}
          onClose={() => setContextMenu(null)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
        />
      )}

      <header
        className="backdrop-blur-xl sticky top-0 z-40 transition-colors duration-1000 bg-card/95 border-b"
        style={{
          background: `linear-gradient(${dynamicBgColor.replace('rgb(', 'rgba(').replace(')', ', 0.1)')}, ${dynamicBgColor.replace('rgb(', 'rgba(').replace(')', ', 0.1)')}), hsl(var(--card) / 0.95)`
        }}
      >
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
                {user?.isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleExportMapAsPNG}
                      className="h-7 px-2"
                      title="Экспортировать карту в PNG"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {activeMap.tournamentId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSendMapToDiscord}
                        className="h-7 px-2"
                        title="Отправить карту в Discord турнира"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
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

            {activeMap?.tournamentId && activeMap.tournament?.name && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/tournament/${activeMap.tournamentId}`)}
                className="h-8 px-3 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30"
                title={`Перейти к турниру: ${activeMap.tournament.name}`}
              >
                <Trophy className="h-4 w-4 mr-1.5 text-amber-600" />
                <LinkIcon className="h-3 w-3 mr-1.5 text-amber-600" />
                <span className="text-sm font-medium">{activeMap.tournament.name}</span>
              </Button>
            )}

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
        <aside
          className="w-64 backdrop-blur-sm overflow-y-auto transition-colors duration-1000 bg-card/95 border-r"
          style={{
            background: `linear-gradient(${dynamicBgColor.replace('rgb(', 'rgba(').replace(')', ', 0.1)')}, ${dynamicBgColor.replace('rgb(', 'rgba(').replace(')', ', 0.1)')}), hsl(var(--card) / 0.95)`
          }}
        >
          <div className="p-4">
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

        <main
          className="flex-1 relative overflow-hidden flex items-center justify-center transition-colors duration-1000"
          style={{
            backgroundColor: dynamicBgColor
          }}
        >
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
              {territories.map(territory => (<TerritoryPolygon key={territory.id} territory={territory} isSelected={selectedTerritory?.id === territory.id} onClick={(e) => handleTerritoryClick(territory, e)} onContextMenu={(e) => handleTerritoryContextMenu(territory, e)} scale={scale} tournamentTeamMode={activeMap?.tournament?.teamMode} />))}
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

        <aside
          className="w-80 backdrop-blur-sm overflow-y-auto transition-colors duration-1000 bg-card/95"
          style={{
            background: `linear-gradient(${dynamicBgColor.replace('rgb(', 'rgba(').replace(')', ', 0.1)')}, ${dynamicBgColor.replace('rgb(', 'rgba(').replace(')', ', 0.1)')}), hsl(var(--card) / 0.95)`
          }}
        >
          {isAdminMode && user?.isAdmin && (
            <div className="p-4 bg-primary/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Settings className="h-4 w-4" />Админ-панель</h3>
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { setIsDrawingMode(true); setCurrentPoints([]); }} disabled={isDrawingMode}><Plus className="h-4 w-4 mr-2" />Создать локацию</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowAssignPlayerDialog(true)}><User className="h-4 w-4 mr-2" />Назначить игрока</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowPlayersDialog(true)}><Users className="h-4 w-4 mr-2" />Управление игроками</Button>
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setShowSettingsDialog(true)}><Settings className="h-4 w-4 mr-2" />Настройки карты</Button>
              </div>
            </div>
          )}
          
          <div className="p-4 border-b">
             {(() => {
               const isTeamTournament = activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo';
               const teamLeaders = isTeamTournament ? eligiblePlayers.filter(p => p.teamInfo?.isLeader) : [];
               const count = isTeamTournament ? teamLeaders.length : eligiblePlayers.length;
               const label = isTeamTournament ? 'Команды' : 'Игроки';

               return (
                 <h3 className="font-semibold flex items-center gap-2 mb-3">
                   <Users className="h-4 w-4" />
                   {label}
                   <Badge variant="outline" className="ml-auto">{count}</Badge>
                 </h3>
               );
             })()}
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

    // Check if this is a team tournament
    const isTeamTournament = activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo';

    if (isTeamTournament) {
      // For team tournaments, show only team leaders with expandable team members
      const teamLeaders = eligiblePlayers.filter(p => p.teamInfo?.isLeader);

      if (teamLeaders.length === 0) {
        return (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Нет команд на карте</p>
          </div>
        );
      }

      return teamLeaders.map(leader => {
        const teamId = leader.teamInfo!.teamId;
        const isExpanded = expandedTeams[teamId];
        const members = leader.teamInfo!.members.filter(m => !m.isLeader);

        // Find territory for the team
        const claimedTerritory = territories.find(t =>
          t.claims?.some(c => c.teamId === teamId)
        );
        const hasClaim = !!claimedTerritory;

        return (
          <div key={leader.userId} className="space-y-1">
            <button
              onClick={() => {
                if (hasClaim && claimedTerritory) {
                  setSelectedTerritory(claimedTerritory);
                  const centerX = claimedTerritory.points.reduce((sum, p) => sum + p.x, 0) / claimedTerritory.points.length;
                  const centerY = claimedTerritory.points.reduce((sum, p) => sum + p.y, 0) / claimedTerritory.points.length;
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
                {hasClaim && claimedTerritory ? (
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: claimedTerritory.color }} />
                ) : (
                  <div className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-muted-foreground/30" />
                )}
                <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs font-medium truncate">{leader.displayName}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{members.length + 1} / {activeMap.tournament?.teamMode === 'duo' ? 2 : activeMap.tournament?.teamMode === 'trio' ? 3 : 4}</span>
                  </div>
                </div>
                {members.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
                    }}
                    className="flex-shrink-0 p-1 hover:bg-muted rounded"
                    title={isExpanded ? "Скрыть состав" : "Показать состав"}
                  >
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform text-muted-foreground",
                      isExpanded && "rotate-180"
                    )} />
                  </button>
                )}
              </div>
              {hasClaim && claimedTerritory && isAdminMode && user?.isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePlayerFromTerritory(claimedTerritory.id, leader.userId);
                  }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 rounded bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"
                  title="Убрать команду с локации"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </button>

            {/* Team members dropdown */}
            {isExpanded && members.length > 0 && (
              <div className="ml-8 space-y-1">
                {members.map(member => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30 border border-border/50"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs truncate">{member.displayName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      });
    } else {
      // For solo tournaments or non-tournament maps, show all players individually
      const playersWithTerritories = eligiblePlayers.map(player => {
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
    }
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
    {Number(editTerritoryForm.maxPlayers) < 999 && ` / ${editTerritoryForm.maxPlayers}`}
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
                  const canAddMore = currentPlayerCount < Number(editTerritoryForm.maxPlayers);

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
      <Dialog open={showPlayersDialog} onOpenChange={(open) => {if (!open) handleCloseAddPlayersDialog();}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {addPlayerStep === 'select_captain' ? (
            // Main view: List of teams
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Управление игроками
                  </DialogTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowPlayersDialog(false);
                      setShowInviteDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Создать инвайт
                  </Button>
                </div>
                <DialogDescription>
                  {activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo' ? (
                    <>
                      Режим: <span className="font-medium text-foreground">
                        {activeMap.tournament.teamMode === 'duo' ? 'Дуо (2 игрока)' :
                         activeMap.tournament.teamMode === 'trio' ? 'Трио (3 игрока)' :
                         'Сквад (4 игрока)'}
                      </span>
                      {' • '}
                      {eligiblePlayers.length} {eligiblePlayers.length === 1 ? 'игрок' : 'игроков'}
                    </>
                  ) : (
                    `${eligiblePlayers.length} игроков на дропмапе`
                  )}
                </DialogDescription>
              </DialogHeader>

              {eligiblePlayers.length > 0 && (
                <div className="px-1">
                  <Input
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder={activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo'
                      ? "Поиск по командам и игрокам..."
                      : "Поиск по игрокам..."}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2">
                {eligiblePlayers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Нет игроков</p>
                    <p className="text-sm mt-1">Добавьте игроков или команды</p>
                  </div>
                ) : (
                  <>
                    {activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo' ? (
                      // Team mode: Group by teams
                      (() => {
                        // Group players by teamId
                        const teams = new Map();
                        eligiblePlayers.forEach(player => {
                          const teamId = player.teamInfo?.teamId || 'solo';
                          if (!teams.has(teamId)) {
                            teams.set(teamId, []);
                          }
                          teams.get(teamId).push(player);
                        });

                        // Filter teams based on search query
                        const filteredTeams = Array.from(teams.entries()).filter(([teamId, members]: [string, EligiblePlayer[]]) => {
                          if (!teamSearchQuery) return true;
                          const query = teamSearchQuery.toLowerCase();
                          const leader = members.find((m: EligiblePlayer) => m.teamInfo?.isLeader);
                          const teamName = (members[0]?.teamInfo?.teamName || `Team ${leader?.displayName || 'Unknown'}`).toLowerCase();

                          // Search in team name or any member name
                          return teamName.includes(query) ||
                                 members.some((m: EligiblePlayer) =>
                                   m.displayName.toLowerCase().includes(query) ||
                                   m.user?.username.toLowerCase().includes(query)
                                 );
                        });

                        if (filteredTeams.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Ничего не найдено</p>
                            </div>
                          );
                        }

                        return filteredTeams.map(([teamId, members]: [string, EligiblePlayer[]]) => {
                          const leader = members.find((m: EligiblePlayer) => m.teamInfo?.isLeader);
                          const teamName = members[0]?.teamInfo?.teamName || `Team ${leader?.displayName || 'Unknown'}`;

                          return (
                            <div key={teamId} className="border rounded-lg p-3 bg-card hover:bg-muted/20 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                  <span className="font-semibold truncate">{teamName}</span>
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                                    {members.length}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  {members.length < getMaxTeamSize() && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleAddPlayerToTeam(teamId, teamName, members)}
                                      className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10 flex-shrink-0"
                                      title="Добавить игрока в команду"
                                    >
                                      <UserPlus className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveTeam(teamId, teamName)}
                                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                    title="Удалить всю команду"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-1 ml-6">
                                {members.map((member: EligiblePlayer) => (
                                  <div key={member.userId} className="flex items-center justify-between gap-2 text-sm group">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {member.teamInfo?.isLeader && (
                                        <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                                      )}
                                      <span className="font-medium truncate">{member.displayName}</span>
                                      {member.user && (
                                        <span className="text-muted-foreground text-xs truncate">@{member.user.username}</span>
                                      )}
                                      {member.userId.startsWith('virtual-') && (
                                        <Badge variant="outline" className="text-xs flex-shrink-0">Virtual</Badge>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemovePlayerFromTeam(member.userId, member.displayName, teamId)}
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                      title={member.teamInfo?.isLeader ? "Удалить капитана (удалит всю команду)" : "Удалить из команды"}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      // Solo mode: Simple list with filtering
                      (() => {
                        const filteredPlayers = eligiblePlayers.filter(player => {
                          if (!teamSearchQuery) return true;
                          const query = teamSearchQuery.toLowerCase();
                          return player.displayName.toLowerCase().includes(query) ||
                                 player.user?.username.toLowerCase().includes(query);
                        });

                        if (filteredPlayers.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Ничего не найдено</p>
                            </div>
                          );
                        }

                        return filteredPlayers.map(player => (
                          <div key={player.userId} className="flex items-center justify-between border rounded-lg p-2 hover:bg-muted/20 transition-colors group">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{player.displayName}</div>
                              {player.user && (
                                <div className="text-sm text-muted-foreground truncate">@{player.user.username}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemovePlayer(player.userId, player.displayName)}
                              className="h-7 px-2 opacity-70 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ));
                      })()
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => setAddPlayerStep('build_team')}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo'
                    ? 'Добавить команду'
                    : 'Добавить игроков'}
                </Button>
                <Button variant="outline" onClick={handleCloseAddPlayersDialog} className="flex-1">
                  Закрыть
                </Button>
              </div>
            </>
          ) : addPlayerStep === 'build_team' ? (
            // Step 2: Select Captain / Select Players
            activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo' ? (
              // Team mode: Select captain first
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Выберите капитана команды
                  </DialogTitle>
                  <DialogDescription>
                    Режим: <span className="font-medium text-foreground">
                      {activeMap.tournament.teamMode === 'duo' ? 'Дуо (2 игрока)' :
                       activeMap.tournament.teamMode === 'trio' ? 'Трио (3 игрока)' :
                       'Сквад (4 игрока)'}
                    </span>
                    <br />
                    Выберите одного игрока, который станет капитаном команды
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div>
                    <Label>Поиск игроков</Label>
                    <Input
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      placeholder="Введите имя или username..."
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto border rounded p-2">
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
                                "flex items-center gap-3 p-3 rounded cursor-pointer transition-colors border",
                                isAlreadyAdded ? "opacity-50 cursor-not-allowed bg-muted" : "hover:bg-muted hover:border-primary/50",
                                isSelected && !isAlreadyAdded && "bg-primary/10 border-primary"
                              )}
                            >
                              <input
                                type="radio"
                                name="captain"
                                checked={isSelected}
                                disabled={isAlreadyAdded}
                                onChange={() => {
                                  setSelectedUsers([u.id]);
                                }}
                                className="cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium flex items-center gap-2">
                                  {u.displayName}
                                  {isSelected && <Crown className="h-4 w-4 text-yellow-500" />}
                                </div>
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

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddPlayerStep('select_captain');
                        setSelectedUsers([]);
                      }}
                      className="flex-1"
                    >
                      <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                      Назад
                    </Button>
                    <Button
                      onClick={handleAddPlayers}
                      disabled={selectedUsers.length === 0}
                      className="flex-1"
                    >
                      <ChevronDown className="h-4 w-4 mr-2 -rotate-90" />
                      Выбрать капитана
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              // Solo mode: Select multiple players
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Добавить игроков
                  </DialogTitle>
                  <DialogDescription>
                    Выберите пользователей для доступа к карте
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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
                      <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                        Очистить
                      </Button>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto border rounded p-2">
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
                                "flex items-center gap-3 p-3 rounded cursor-pointer transition-colors border",
                                isAlreadyAdded ? "opacity-50 cursor-not-allowed bg-muted" : "hover:bg-muted hover:border-primary/50",
                                isSelected && !isAlreadyAdded && "bg-primary/10 border-primary"
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

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddPlayerStep('select_captain');
                        setSelectedUsers([]);
                      }}
                      className="flex-1"
                    >
                      <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                      Назад
                    </Button>
                    <Button
                      onClick={handleAddPlayers}
                      disabled={selectedUsers.length === 0}
                      className="flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Добавить ({selectedUsers.length})
                    </Button>
                  </div>
                </div>
              </>
            )
          ) : (
            // Step 3: Build Team (existing code)
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Соберите команду
                </DialogTitle>
                <DialogDescription>
                  Капитан: <span className="font-medium text-foreground">
                    {allUsers.find(u => u.id === selectedCaptain)?.displayName}
                  </span>
                  <br />
                  Добавьте членов команды или оставьте слоты пустыми
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 flex-1 overflow-y-auto">
                {teamSlots.map((slot, index) => (
                  <TeamSlotEditor
                    key={index}
                    slotNumber={index + 1}
                    slot={slot}
                    allUsers={allUsers.filter(u =>
                      u.id !== selectedCaptain &&
                      !teamSlots.some(s => s.userId === u.id) &&
                      !eligiblePlayers.some(p => p.userId === u.id)
                    )}
                    onChange={(newSlot) => {
                      const newSlots = [...teamSlots];
                      newSlots[index] = newSlot;
                      setTeamSlots(newSlots);
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddPlayerStep('build_team');
                    setSelectedCaptain(null);
                    setTeamSlots([]);
                  }}
                  className="flex-1"
                >
                  <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                  Назад
                </Button>
                <Button
                  onClick={handleSubmitTeam}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Добавить команду
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать инвайт-код</DialogTitle><DialogDescription>Создайте код для приглашения игроков</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Имя капитана</Label><Input value={inviteForm.displayName} onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })} placeholder="Например: Malibuca" /></div>
            {activeMap?.tournament?.teamMode && activeMap.tournament.teamMode !== 'solo' && (
              <div>
                <Label>Члены команды (опционально)</Label>
                <textarea
                  value={inviteForm.teamMemberNames}
                  onChange={(e) => setInviteForm({ ...inviteForm, teamMemberNames: e.target.value })}
                  placeholder="Введите имена членов команды (по одному на строку)&#10;Например:&#10;Player1&#10;Player2&#10;Player3"
                  className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Для {activeMap.tournament.teamMode === 'duo' ? 'дуо' : activeMap.tournament.teamMode === 'trio' ? 'трио' : 'сквада'} - укажите {activeMap.tournament.teamMode === 'duo' ? '1' : activeMap.tournament.teamMode === 'trio' ? '2' : '3'} {activeMap.tournament.teamMode === 'duo' ? 'напарника' : 'напарников'}
                </p>
              </div>
            )}
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

              {/* Public Link */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <Label className="text-sm font-medium">Публичная ссылка</Label>
                <p className="text-xs text-muted-foreground">Поделитесь этой ссылкой для просмотра карты без авторизации</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const publicUrl = `${window.location.origin}/dropmap/view/${activeMap.id}`;
                    navigator.clipboard.writeText(publicUrl).then(() => {
                      toast({
                        title: "Ссылка скопирована!",
                        description: "Публичная ссылка скопирована в буфер обмена",
                      });
                    }).catch(() => {
                      toast({
                        title: "Ошибка",
                        description: "Не удалось скопировать ссылку",
                        variant: "destructive",
                      });
                    });
                  }}
                  className="w-full"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Копировать публичную ссылку
                </Button>
              </div>

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

      {/* Add Player to Team Dialog */}
      <Dialog open={showAddPlayerToTeamDialog} onOpenChange={setShowAddPlayerToTeamDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить игрока в команду</DialogTitle>
            <DialogDescription>
              {addPlayerToTeamForm.teamName} ({addPlayerToTeamForm.currentMembers.length}/{getMaxTeamSize()})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!addPlayerToTeamForm.playerType ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAddPlayerToTeamForm({ ...addPlayerToTeamForm, playerType: 'real' })}
                  className="h-auto py-6 flex flex-col items-center gap-2"
                >
                  <User className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Реальный пользователь</div>
                    <div className="text-xs text-muted-foreground mt-1">С аккаунтом на сайте</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddPlayerToTeamForm({ ...addPlayerToTeamForm, playerType: 'virtual' })}
                  className="h-auto py-6 flex flex-col items-center gap-2"
                >
                  <UserPlus className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Виртуальный игрок</div>
                    <div className="text-xs text-muted-foreground mt-1">Без аккаунта</div>
                  </div>
                </Button>
              </div>
            ) : addPlayerToTeamForm.playerType === 'real' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Выберите игрока с сайта</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAddPlayerToTeamForm({ ...addPlayerToTeamForm, playerType: '', selectedUserId: '', searchQuery: '' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Поиск по никнейму..."
                  value={addPlayerToTeamForm.searchQuery}
                  onChange={(e) => setAddPlayerToTeamForm({ ...addPlayerToTeamForm, searchQuery: e.target.value })}
                />
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {allUsers
                    .filter(u => {
                      // Filter out users already on the map
                      const isOnMap = eligiblePlayers.some(p => p.userId === u.id);
                      if (isOnMap) return false;

                      // Filter by search query
                      if (!addPlayerToTeamForm.searchQuery) return true;
                      const query = addPlayerToTeamForm.searchQuery.toLowerCase();
                      return u.displayName.toLowerCase().includes(query) ||
                             u.username.toLowerCase().includes(query);
                    })
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => setAddPlayerToTeamForm({ ...addPlayerToTeamForm, selectedUserId: u.id })}
                        className={cn(
                          "w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                          addPlayerToTeamForm.selectedUserId === u.id && "bg-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {addPlayerToTeamForm.selectedUserId === u.id && (
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{u.displayName}</div>
                            <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  {allUsers.filter(u => {
                    const isOnMap = eligiblePlayers.some(p => p.userId === u.id);
                    if (isOnMap) return false;
                    if (!addPlayerToTeamForm.searchQuery) return true;
                    const query = addPlayerToTeamForm.searchQuery.toLowerCase();
                    return u.displayName.toLowerCase().includes(query) ||
                           u.username.toLowerCase().includes(query);
                  }).length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Нет доступных игроков</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSubmitAddPlayerToTeam}
                  disabled={!addPlayerToTeamForm.selectedUserId}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Добавить игрока
                </Button>
              </div>
            ) : addPlayerToTeamForm.playerType === 'virtual' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Никнейм виртуального игрока</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAddPlayerToTeamForm({ ...addPlayerToTeamForm, playerType: '', virtualPlayerName: '' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Например: Player123"
                  value={addPlayerToTeamForm.virtualPlayerName}
                  onChange={(e) => setAddPlayerToTeamForm({ ...addPlayerToTeamForm, virtualPlayerName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && addPlayerToTeamForm.virtualPlayerName.trim()) {
                      handleSubmitAddPlayerToTeam();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Виртуальный игрок не привязан к аккаунту на сайте
                </p>
                <Button
                  onClick={handleSubmitAddPlayerToTeam}
                  disabled={!addPlayerToTeamForm.virtualPlayerName.trim()}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Добавить игрока
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", confirmDialog.variant === 'destructive' ? "text-destructive" : "text-primary")} />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Отмена
            </Button>
            <Button
              variant={confirmDialog.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={confirmDialog.onConfirm}
            >
              Подтвердить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NotificationModal isOpen={notification.isOpen} type={notification.type} title={notification.title} message={notification.message} onClose={closeNotification} />
    </div>
  );
}