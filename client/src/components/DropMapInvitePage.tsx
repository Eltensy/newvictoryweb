import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, CheckCircle, XCircle, AlertCircle, Trophy, ZoomIn, ZoomOut, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useTerritorySocket } from '@/hooks/useTerritorySocket';

export default function DropMapInvitePage() {
  const [, params] = useRoute('/dropmap/invite/:code');
  const code = params?.code;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [territories, setTerritories] = useState<any[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const SVG_SIZE = 1000;

  // ✅ ИСПРАВЛЕНО: Загружаем территории с полными данными (включая инвайтнутых)
  const loadTerritories = useCallback(async (mapId: string) => {
    try {
      const territoriesResponse = await fetch(`/api/maps/${mapId}/territories/public`);
      
      if (!territoriesResponse.ok) {
        throw new Error('Не удалось загрузить территории');
      }
      
      const territoriesData = await territoriesResponse.json();
      console.log('[loadTerritories] Territories loaded:', territoriesData.length);
      
      if (!Array.isArray(territoriesData) || territoriesData.length === 0) {
        throw new Error('На этой карте нет территорий');
      }
      
      setTerritories(territoriesData);
    } catch (err: any) {
      console.error('[loadTerritories] Error:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (code) {
      validateInvite();
    }
  }, [code]);

  const validateInvite = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[validateInvite] Starting validation for code:', code);
      
      const inviteResponse = await fetch(`/api/dropmap/invite/${code}`);
      console.log('[validateInvite] Invite response status:', inviteResponse.status);
      
      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json().catch(() => ({}));
        console.error('[validateInvite] Invite error:', errorData);
        throw new Error(errorData.error || 'Неверный код приглашения');
      }
      
      const inviteData = await inviteResponse.json();
      console.log('[validateInvite] Invite data received:', inviteData);
      setInviteData(inviteData);
      
      const mapId = inviteData.settingsId || inviteData.map?.id || inviteData.mapId;
      console.log('[validateInvite] Extracted mapId:', mapId);
      
      if (!mapId) {
        console.error('[validateInvite] No mapId found in data:', inviteData);
        throw new Error('ID карты не найден в данных приглашения');
      }
      
      // Загружаем территории
      await loadTerritories(mapId);
      
      console.log('[validateInvite] Validation completed successfully');
      
    } catch (err: any) {
      console.error('[validateInvite] Error occurred:', err);
      setError(err.message || 'Произошла ошибка при загрузке');
    } finally {
      setLoading(false);
    }
  };

  // ✅ ИСПРАВЛЕНО: WebSocket для обновления карты в реальном времени
  const { isConnected } = useTerritorySocket(
    inviteData?.settingsId || inviteData?.map?.id || inviteData?.mapId || null,
    useCallback((update: { territoryId: string; territory: any; timestamp: string }) => {
      console.log('🔔 Territory updated via WebSocket:', update.territoryId);
      
      // Обновляем конкретную территорию
      setTerritories(prev => 
        prev.map(t => 
          t.id === update.territoryId 
            ? { ...t, ...update.territory }
            : t
        )
      );
    }, []),
    useCallback((update: { mapId: string; timestamp: string }) => {
      console.log('🔄 Map updated via WebSocket, reloading...');
      const mapId = inviteData?.settingsId || inviteData?.map?.id || inviteData?.mapId;
      if (mapId) {
        loadTerritories(mapId);
      }
    }, [inviteData, loadTerritories])
  );

  const handleClaim = async () => {
    if (!selectedTerritory) {
      console.warn('[handleClaim] No territory selected');
      return;
    }
    
    console.log('[handleClaim] Starting claim for territory:', selectedTerritory);
    setClaiming(true);
    
    try {
      const response = await fetch('/api/claim-with-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          territoryId: selectedTerritory,
        }),
      });
      
      console.log('[handleClaim] Claim response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[handleClaim] Claim error:', errorData);
        throw new Error(errorData.error || 'Не удалось закрепить территорию');
      }
      
      const claimData = await response.json();
      console.log('[handleClaim] Claim successful:', claimData);
      
      setClaimed(true);
      
      // ✅ ИСПРАВЛЕНО: Перезагружаем территории после клейма
      const mapId = inviteData?.settingsId || inviteData?.map?.id || inviteData?.mapId;
      if (mapId) {
        await loadTerritories(mapId);
      }
      
      console.log('[handleClaim] Claim process completed successfully');
      
    } catch (err: any) {
      console.error('[handleClaim] Error occurred:', err);
      alert(err.message || 'Не удалось поставить метку. Попробуйте еще раз.');
    } finally {
      setClaiming(false);
    }
  };

  const getSVGPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: Math.round(svgP.x), y: Math.round(svgP.y) };
  };

  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging || claimed) return;
    const point = getSVGPoint(event);
    const clickedTerritory = territories.find(t => isPointInPolygon(point, t.points));
    
    if (clickedTerritory) {
      setSelectedTerritory(clickedTerritory.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2 || (e.button === 0 && e.shiftKey) || e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
    setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
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
  };

  const resetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const viewBox = (() => {
    const centerX = SVG_SIZE / 2 - panOffset.x;
    const centerY = SVG_SIZE / 2 - panOffset.y;
    const width = SVG_SIZE / scale;
    const height = SVG_SIZE / scale;
    const x = centerX - width / 2;
    const y = centerY - height / 2;
    return `${x} ${y} ${width} ${height}`;
  })();

  // ✅ Функция для отрисовки территорий (вынесена для переиспользования)
  const renderTerritory = (territory: any, isInteractive: boolean = true) => {
    if (!territory.points || territory.points.length < 3) return null;
    
    const points = territory.points.map((p: any) => `${p.x},${p.y}`).join(' ');
    
    // Убираем дубликаты по userId
    const uniqueClaims = territory.claims ? territory.claims.filter((claim: any, index: number, self: any[]) => 
      index === self.findIndex((c: any) => c.userId === claim.userId)
    ) : [];
    
    const claimCount = uniqueClaims.length;
    const isSelected = selectedTerritory === territory.id;
    
    // Красный если 2+ игроков
    const displayColor = claimCount >= 2 ? '#EF4444' : territory.color;
    
    const getTextPositions = (centerX: number, centerY: number, count: number) => {
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
      <g key={territory.id} className="territory-group">
        <polygon 
          points={points} 
          fill={displayColor} 
          fillOpacity={claimCount > 0 ? 0.5 : 0.25} 
          stroke={isSelected ? '#fff' : displayColor} 
          strokeWidth={isSelected ? 3 / scale : 2 / scale}
          className={cn(
            "transition-all duration-200",
            isInteractive && "cursor-pointer",
            claimCount > 0 ? "hover:fill-opacity-60" : "hover:fill-opacity-35"
          )}
        />
        {/* ✅ ИСПРАВЛЕНО: Показываем текст с группировкой по командам */}
        {scale > 0.5 && claimCount > 0 && (() => {
          const centerX = territory.points.reduce((sum: number, p: any) => sum + p.x, 0) / territory.points.length;
          const centerY = territory.points.reduce((sum: number, p: any) => sum + p.y, 0) / territory.points.length;

          // Группировка по командам (как в TerritoryMain)
          const hasTeams = uniqueClaims.some((c: any) => c.teamId);
          let displayTexts: Array<{ text: string; key: string }> = [];

          if (!hasTeams) {
            // Без команд - показываем каждого игрока отдельно
            displayTexts = uniqueClaims.map((claim: any, idx: number) => ({
              text: claim.displayName || territory.name,
              key: `${claim.userId}-${idx}`
            }));
          } else {
            // С командами - группируем по teamId
            const teamGroups: Record<string, any[]> = {};
            uniqueClaims.forEach((claim: any) => {
              const teamId = claim.teamId || 'solo';
              if (!teamGroups[teamId]) teamGroups[teamId] = [];
              teamGroups[teamId].push(claim);
            });

            const entries = Object.entries(teamGroups);
            const teamEntries = entries.filter(([teamId]) => teamId !== 'solo');
            const soloEntries = entries.filter(([teamId]) => teamId === 'solo');

            // Сначала команды
            teamEntries.forEach(([teamId, members]) => {
              if (members.length > 0) {
                const memberNames = members.map((m: any) => m.displayName).join(' + ');
                displayTexts.push({ text: memberNames, key: teamId });
              }
            });

            // Потом соло
            soloEntries.forEach(([_, members]) => {
              members.forEach((m: any, idx: number) => {
                displayTexts.push({ text: m.displayName || territory.name, key: `${m.userId}-${idx}` });
              });
            });
          }

          const positions = getTextPositions(centerX, centerY, displayTexts.length);

          return displayTexts.map((item, index) => {
            const pos = positions[index];
            if (!pos) return null;

            return (
              <text
                key={item.key}
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
                {item.text}
              </text>
            );
          });
        })()}
      </g>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-center">Ошибка</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold">DropMap</span>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] p-4 md:p-8 relative z-10">
          <div className="max-w-4xl w-full mx-auto">
            {/* Success animation */}
            <div className="text-center mb-6 animate-in fade-in slide-in-from-top duration-500">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-5 shadow-2xl">
                  <CheckCircle className="h-12 w-12 text-white" strokeWidth={2.5} />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-3">
                Метка поставлена!
              </h1>
              
              <div className="space-y-2">
                <p className="text-base md:text-lg text-muted-foreground">
                  Ваша локация успешно отмечена как
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full border border-primary/20">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <span className="font-semibold text-lg md:text-xl">{inviteData.displayName}</span>
                </div>
              </div>
            </div>

            {/* Map card - Centered and responsive */}
            <Card className="border-2 shadow-2xl overflow-hidden backdrop-blur-sm bg-card/50 animate-in fade-in slide-in-from-bottom duration-700 mx-auto" style={{ animationDelay: '200ms', maxWidth: '900px' }}>
              <CardContent className="p-4 md:p-6">
                <div className="relative bg-background/50 overflow-hidden rounded-xl border-2 shadow-inner mx-auto" style={{ aspectRatio: '1 / 1', maxHeight: '600px', maxWidth: '600px' }}>
                  {/* Decorative corners */}
                  <div className="absolute top-0 left-0 w-16 h-16 md:w-20 md:h-20 border-t-4 border-l-4 border-primary/30 rounded-tl-xl pointer-events-none"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 border-t-4 border-r-4 border-primary/30 rounded-tr-xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 md:w-20 md:h-20 border-b-4 border-l-4 border-primary/30 rounded-bl-xl pointer-events-none"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 md:w-20 md:h-20 border-b-4 border-r-4 border-primary/30 rounded-br-xl pointer-events-none"></div>
                  
                  <svg ref={svgRef} viewBox={viewBox} width="100%" height="100%" className="max-w-full max-h-full" style={{ aspectRatio: '1 / 1' }}>
                    {inviteData?.map?.mapImageUrl && (
                      <image href={inviteData.map.mapImageUrl} x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} preserveAspectRatio="xMidYMid slice" />
                    )}
                    {territories.map(territory => renderTerritory(territory, false))}
                  </svg>
                  
                  {/* Success badge on map */}
                  <div className="absolute top-3 md:top-4 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-sm text-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-lg border border-green-400/50 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '400ms' }}>
                    <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="font-semibold text-xs md:text-sm">Ваша метка на карте</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional info */}
            <div className="mt-6 text-center text-sm text-muted-foreground animate-in fade-in duration-700" style={{ animationDelay: '400ms' }}>
              <p>Ваша локация теперь видна всем участникам на карте</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold">DropMap</span>
            </div>
            
            {inviteData?.map?.name && (
              <Badge variant="secondary">
                {inviteData.map.name}
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
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setScale(prev => Math.max(prev / 1.2, MIN_SCALE))} 
                className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-medium min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => setScale(prev => Math.min(prev * 1.2, MAX_SCALE))} 
                className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={resetZoom} 
                className="h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        <main className="flex-1 relative bg-background overflow-hidden flex items-center justify-center">
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
              cursor: isDragging ? 'grabbing' : 'pointer',
              aspectRatio: '1 / 1'
            }}
          >
            {inviteData?.map?.mapImageUrl && (
              <image 
                href={inviteData.map.mapImageUrl} 
                x="0" 
                y="0" 
                width={SVG_SIZE} 
                height={SVG_SIZE} 
                preserveAspectRatio="xMidYMid slice" 
              />
            )}
            
            {territories.map(territory => renderTerritory(territory))}
          </svg>
          
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border text-sm pointer-events-none">
            <div className="text-muted-foreground">
              <div>Скролл: Зум</div>
              <div>Shift + ЛКМ: Двигать картой</div>
              <div>Клик: Выбрать локацию</div>
            </div>
          </div>
        </main>

        <aside className="w-80 border-l bg-card/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">Выбор локации</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Выберите локацию для {inviteData.displayName}
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Инструкция</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>Кликните на любую локацию для выбора</li>
                <li>Можно выбирать как свободные, так и занятые локации</li>
                <li>После выбора нажмите кнопку "Подтвердить"</li>
              </ul>
            </div>
            
            {selectedTerritory ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-600">Локация выбрана</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full"
                  size="lg"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    'Подтвердить выбор'
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Кликните на свободную локацию</p>
              </div>
            )}
          </div>
          
          <div className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Локации ({territories.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {territories.map(territory => {
                // Убираем дубликаты
                const uniqueClaims = territory.claims ? territory.claims.filter((claim: any, index: number, self: any[]) => 
                  index === self.findIndex((c: any) => c.userId === claim.userId)
                ) : [];
                
                const claimCount = uniqueClaims.length;
                const isSelected = selectedTerritory === territory.id;
                
                return (
                  <div 
                    key={territory.id} 
                    className={cn(
                      "p-3 rounded-lg border transition-colors cursor-pointer",
                      isSelected && "border-primary bg-primary/10",
                      !isSelected && "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedTerritory(territory.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: claimCount >= 2 ? '#EF4444' : territory.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{territory.name}</div>
                        {claimCount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {claimCount === 1 ? (
                              <>Занята: {uniqueClaims[0].displayName}</>
                            ) : (
                              <>Игроков: {claimCount}</>
                            )}
                          </div>
                        )}
                      </div>
                      {claimCount > 0 && (
                        <Badge variant={claimCount >= 2 ? "destructive" : "secondary"} className="text-xs">
                          {claimCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}