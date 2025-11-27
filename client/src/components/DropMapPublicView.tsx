// client/src/components/DropMapPublicView.tsx - Public read-only view of dropmap

import React, { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingScreen from './LoadingScreen';
import {
  Trophy, ZoomIn, ZoomOut, RotateCcw, Home, Lock, Link as LinkIcon
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface Territory {
  id: string;
  name: string;
  color: string;
  points: { x: number; y: number }[];
  description?: string;
  isActive: boolean;
  maxPlayers: number;
  claims?: Array<{
    userId: string;
    displayName?: string;
    teamId?: string;
    teamName?: string;
    isTeamLeader?: boolean;
  }>;
}

interface DropMap {
  id: string;
  name: string;
  description?: string;
  mapImageUrl?: string;
  mode: 'tournament' | 'practice';
  isLocked: boolean;
  tournamentId?: string;
  tournament?: {
    id: string;
    name: string;
    teamMode?: 'solo' | 'duo' | 'trio' | 'squad';
  };
}

const TerritoryPolygon = React.memo(({ territory, isSelected, onClick, scale, tournamentTeamMode }: {
  territory: Territory;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  scale: number;
  tournamentTeamMode?: 'solo' | 'duo' | 'trio' | 'squad';
}) => {
  const uniqueClaims = territory.claims ? territory.claims
    .filter(claim => claim && claim.userId)
    .filter((claim, index, self) =>
      index === self.findIndex(c => c.userId === claim.userId)
    ) : [];

  const groupedClaims = React.useMemo(() => {
    if (!uniqueClaims.length) return [];

    const hasTeams = uniqueClaims.some(c => c.teamId);

    if (!hasTeams) {
      return uniqueClaims.map(claim => ({
        displayText: claim.displayName || territory.name,
        isTeamLeader: false,
        teamName: null,
      }));
    }

    const teamGroups: Record<string, typeof uniqueClaims> = {};
    uniqueClaims.forEach(claim => {
      const teamId = claim.teamId || 'solo';
      if (!teamGroups[teamId]) {
        teamGroups[teamId] = [];
      }
      teamGroups[teamId].push(claim);
    });

    const result: Array<{ displayText: string; isTeamLeader: boolean; teamName: string | null }> = [];

    const entries = Object.entries(teamGroups);
    const teamEntries = entries.filter(([teamId]) => teamId !== 'solo');
    const soloEntries = entries.filter(([teamId]) => teamId === 'solo');

    teamEntries.forEach(([teamId, members]) => {
      if (members.length === 0) return;

      const leader = members.find(m => m.isTeamLeader);

      let teamMaxPlayers = territory.maxPlayers || 1;
      if (tournamentTeamMode) {
        const teamSizeMap = { solo: 1, duo: 2, trio: 3, squad: 4 };
        teamMaxPlayers = teamSizeMap[tournamentTeamMode] || teamMaxPlayers;
      }

      const emptySlots = Math.max(0, teamMaxPlayers - members.length);

      const memberNames = members.map(m => m.displayName || 'Unknown');

      const emptySlotMarkers = members.length > 0 ? Array(emptySlots).fill('?') : [];
      const allSlots = [...memberNames, ...emptySlotMarkers];
      const displayText = allSlots.join(' + ');

      result.push({
        displayText,
        isTeamLeader: !!leader,
        teamName: members[0]?.teamName || null,
      });
    });

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

  const points = React.useMemo(() =>
    territory.points.map(p => `${p.x},${p.y}`).join(' '),
    [territory.points]
  );

  const centroid = React.useMemo(() => {
    const sum = territory.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / territory.points.length, y: sum.y / territory.points.length };
  }, [territory.points]);

  const fillOpacity = isSelected ? 0.4 : hasClaims ? 0.3 : 0.2;
  const strokeWidth = (isSelected ? 2.5 : 1.5) / scale;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <polygon
        points={points}
        fill={territory.color}
        fillOpacity={fillOpacity}
        stroke={territory.color}
        strokeWidth={strokeWidth}
        className="transition-all duration-200"
      />
      <text
        x={centroid.x}
        y={centroid.y - (claimCount > 0 ? 8 / scale : 0)}
        textAnchor="middle"
        fill="white"
        fontSize={12 / scale}
        fontWeight="600"
        className="pointer-events-none select-none"
        style={{ textShadow: '2px 2px 3px rgba(0,0,0,1)' }}
      >
      </text>
      {groupedClaims.map((claim, i) => (
        <text
          key={i}
          x={centroid.x}
          y={centroid.y + (i * 15 / scale) + (15 / scale)}
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
          {claim.displayText}
        </text>
      ))}
    </g>
  );
});

export default function DropMapPublicView() {
  const [match, params] = useRoute('/dropmap/view/:mapId');
  const [location, setLocation] = useLocation();
  const mapId = params?.mapId;

  const svgRef = useRef<SVGSVGElement>(null);

  const [map, setMap] = useState<DropMap | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const SVG_SIZE = 1000;

  const [dynamicBgColor, setDynamicBgColor] = useState<string>('rgb(9, 9, 11)');

  const viewBox = `${-panOffset.x / scale} ${-panOffset.y / scale} ${SVG_SIZE / scale} ${SVG_SIZE / scale}`;

  const resetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const loadMapData = async () => {
      if (!mapId) return;

      try {
        setIsLoading(true);
        setError(null);

        const [mapResponse, territoriesResponse] = await Promise.all([
          fetch(`/api/maps/${mapId}/public`),
          fetch(`/api/maps/${mapId}/territories/public`)
        ]);

        if (!mapResponse.ok || !territoriesResponse.ok) {
          throw new Error('Карта не найдена');
        }

        const mapData = await mapResponse.json();
        const territoriesData = await territoriesResponse.json();

        setMap(mapData);
        setTerritories(territoriesData);

      } catch (err) {
        console.error('Error loading map data:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить карту');
      } finally {
        setIsLoading(false);
      }
    };

    loadMapData();
  }, [mapId]);

  useEffect(() => {
    if (!map?.mapImageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 10, 10);
        const centerPixel = ctx.getImageData(1, 1, 1, 1).data;
        const color = `rgb(${centerPixel[0]}, ${centerPixel[1]}, ${centerPixel[2]})`;
        setDynamicBgColor(color);
      }
    };
    img.src = map.mapImageUrl;
  }, [map?.mapImageUrl]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2 || e.shiftKey) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !map) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Ошибка</h1>
          <p className="text-muted-foreground">{error || 'Карта не найдена'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-1000"
      style={{ backgroundColor: dynamicBgColor }}
    >
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

            {map && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {map.name}
                </Badge>
              </div>
            )}

            {map?.isLocked && (
              <Badge variant="destructive">
                <Lock className="h-3 w-3 mr-1" />
                Заблокирована
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {map?.tournamentId && map.tournament?.name && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/tournament/${map.tournamentId}`)}
                className="h-8 px-3 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30"
                title={`Перейти к турниру: ${map.tournament.name}`}
              >
                <Trophy className="h-4 w-4 mr-1.5 text-amber-600" />
                <LinkIcon className="h-3 w-3 mr-1.5 text-amber-600" />
                <span className="text-sm font-medium">{map.tournament.name}</span>
              </Button>
            )}

            <div className="hidden lg:flex items-center gap-1">
              <button onClick={() => setScale(prev => Math.max(prev / 1.2, MIN_SCALE))} className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="px-2 text-xs font-medium min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(prev => Math.min(prev * 1.2, MAX_SCALE))} className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button onClick={resetZoom} className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>

            <Button onClick={() => setLocation('/')} variant="ghost" size="sm">
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        <main
          className="flex-1 relative overflow-hidden flex items-center justify-center transition-colors duration-1000"
          style={{
            backgroundColor: dynamicBgColor
          }}
        >
          <svg
            ref={svgRef}
            viewBox={viewBox}
            width="100%"
            height="100%"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="max-w-full max-h-full"
            style={{
              cursor: isDragging ? 'grabbing' : 'pointer',
              aspectRatio: '1 / 1'
            }}
          >
            {map?.mapImageUrl && (
              <image
                href={map.mapImageUrl}
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
                onClick={() => setSelectedTerritory(territory)}
                scale={scale}
                tournamentTeamMode={map.tournament?.teamMode}
              />
            ))}
          </svg>

          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border text-sm pointer-events-none">
            <div className="text-muted-foreground">
              <div>Скролл: Зум</div>
              <div>ПКМ или Shift + ЛКМ: Двигать картой</div>
              <div>Клик: Выбрать локацию</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
