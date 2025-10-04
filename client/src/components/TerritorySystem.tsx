import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from "wouter";
import LoadingScreen from './LoadingScreen';
import { 
  Trophy, Clock, Crown, MapPin, Home, User, Settings, Plus, Save, X, Loader2, ArrowLeft, AlertCircle, ZoomIn, ZoomOut, RotateCcw
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
  color: string;
  points: { x: number; y: number }[];
  claimedAt?: string;
}

interface TerritoryTemplate {
  id: string;
  name: string;
  description?: string;
  mapImageUrl?: string;
  isActive: boolean;
  territoryCount?: number;
  claimedCount?: number;
  tournament?: {
    id: string;
    name: string;
    status: string;
  };
}

interface TerritoryShape {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  defaultColor: string;
  description?: string;
}

export default function TerritorySystem() {
  const { user, isLoggedIn, getAuthToken, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [templates, setTemplates] = useState<TerritoryTemplate[]>([]);
  const [shapes, setShapes] = useState<TerritoryShape[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<TerritoryTemplate | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Админ режим
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<{ x: number; y: number }[]>([]);
  const [showShapeForm, setShowShapeForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  
  const [shapeForm, setShapeForm] = useState({
    name: '',
    color: '#3B82F6',
    description: ''
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    selectedShapes: [] as string[],
    file: null as File | null
  });

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  useEffect(() => {
    if (!isLoggedIn || user?.subscriptionScreenshotStatus !== 'approved') {
      setLocation('/');
      return;
    }
    
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadTemplates(), loadShapes()]);
      } catch (err) {
        setError('Ошибка загрузки данных');
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (activeTemplate) {
      loadTerritories();
    }
  }, [activeTemplate]);

  // Отрисовка canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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
      if (territory.ownerId) {
        // Заклеймленная - цвет из БД
        ctx.fillStyle = `${territory.color}80`;
        ctx.fill();
      } else {
        // Свободная - черная без заливки
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
      }
      
      // Выделение выбранной
      if (selectedTerritory?.id === territory.id) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      }
    });
    
    // Текущий путь рисования
    if (isDrawing && drawingPath.length > 0) {
      ctx.beginPath();
      if (drawingPath.length > 1) {
        ctx.moveTo(drawingPath[0].x, drawingPath[0].y);
        drawingPath.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
      }
      
      ctx.strokeStyle = shapeForm.color;
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([5 / scale, 5 / scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      drawingPath.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, (index === 0 ? 6 : 4) / scale, 0, 2 * Math.PI);
        ctx.fillStyle = index === 0 ? '#ef4444' : shapeForm.color;
        ctx.fill();
      });
    }
    
    ctx.restore();
    
    // Текст только для заклеймленных территорий
    if (scale > 0.5) {
      territories.forEach(territory => {
        if (!territory.ownerId || !territory.owner || territory.points.length < 3) return;
        
        const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
        const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;
        
        const screenX = centerX * scale + panOffset.x;
        const screenY = centerY * scale + panOffset.y;
        
        if (screenX < -100 || screenX > canvas.width + 100 || 
            screenY < -50 || screenY > canvas.height + 50) {
          return;
        }
        
        ctx.font = `bold 16px Inter, system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeText(territory.owner.displayName, screenX, screenY);
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(territory.owner.displayName, screenX, screenY);
      });
    }
  }, [territories, selectedTerritory, isDrawing, drawingPath, shapeForm.color, scale, panOffset]);

  const loadTemplates = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/territory/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        const active = data.find((t: TerritoryTemplate) => t.isActive);
        setActiveTemplate(active || null);
      }
    } catch (err) {
      console.error('Ошибка загрузки карт:', err);
    }
  };

  const loadShapes = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/territory/shapes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setShapes(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки контуров:', err);
    }
  };

  const loadTerritories = async () => {
    if (!activeTemplate) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/territory/territories?templateId=${activeTemplate.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTerritories(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки территорий:', err);
    }
  };

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / rect.width * 1200;
    const mouseY = (event.clientY - rect.top) / rect.height * 800;
    const mapX = (mouseX - panOffset.x * scale) / scale;
    const mapY = (mouseY - panOffset.y * scale) / scale;
    
    // Админ рисует контур
    if (isDrawing && user?.isAdmin && isAdminMode) {
      if (drawingPath.length > 2) {
        const firstPoint = drawingPath[0];
        const distance = Math.sqrt(Math.pow(mapX - firstPoint.x, 2) + Math.pow(mapY - firstPoint.y, 2));
        if (distance < 15) {
          handleCreateShape();
          return;
        }
      }
      setDrawingPath(prev => [...prev, { x: mapX, y: mapY }]);
      return;
    }
    
    // Обычный клик - клейм территории
    const clickedTerritory = territories.find(territory => 
      isPointInPolygon({ x: mapX, y: mapY }, territory.points)
    );
    
    if (clickedTerritory) {
      setSelectedTerritory(clickedTerritory);
      
      if (!user?.isAdmin || !isAdminMode) {
        handleClaimTerritory(clickedTerritory.id);
      }
    } else {
      setSelectedTerritory(null);
    }
  }, [isDragging, isDrawing, territories, user, isAdminMode, drawingPath, scale, panOffset]);

  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const handleClaimTerritory = async (territoryId: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/territory/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          territoryId,
          replaceExisting: true // Всегда заменяем предыдущий клейм
        })
      });
      
      if (response.ok) {
        await loadTerritories();
      }
    } catch (err) {
      console.error('Ошибка клейма:', err);
    }
  };

  const handleCreateShape = async () => {
    if (drawingPath.length < 3) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch('/api/territory/shapes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: shapeForm.name || `Контур ${shapes.length + 1}`,
          points: drawingPath,
          defaultColor: shapeForm.color,
          description: shapeForm.description
        })
      });
      
      if (response.ok) {
        await loadShapes();
        setIsDrawing(false);
        setDrawingPath([]);
        setShowShapeForm(false);
        setShapeForm({ name: '', color: '#3B82F6', description: '' });
      }
    } catch (err) {
      console.error('Ошибка создания контура:', err);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || templateForm.selectedShapes.length === 0) return;
    
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('name', templateForm.name);
      if (templateForm.description) formData.append('description', templateForm.description);
      if (templateForm.file) formData.append('mapImage', templateForm.file);
      formData.append('shapeIds', JSON.stringify(templateForm.selectedShapes));
      
      const response = await fetch('/api/territory/templates', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        await loadTemplates();
        setShowTemplateForm(false);
        setTemplateForm({ name: '', description: '', selectedShapes: [], file: null });
      }
    } catch (err) {
      console.error('Ошибка создания карты:', err);
    }
  };

  const handleActivateTemplate = async (templateId: string) => {
    try {
      const token = getAuthToken();
      await fetch(`/api/territory/templates/${templateId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadTemplates();
    } catch (err) {
      console.error('Ошибка активации:', err);
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width * 1200;
    const mouseY = (e.clientY - rect.top) / rect.height * 800;
    const worldX = (mouseX - panOffset.x * scale) / scale;
    const worldY = (mouseY - panOffset.y * scale) / scale;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * zoomFactor, MIN_SCALE), MAX_SCALE);
    
    if (newScale !== scale) {
      const newPanX = (mouseX - worldX * newScale) / newScale;
      const newPanY = (mouseY - worldY * newScale) / newScale;
      setScale(newScale);
      setPanOffset({ x: newPanX, y: newPanY });
    }
  }, [scale, panOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
      setIsDragging(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    setPanOffset(prev => ({ x: prev.x + deltaX / scale, y: prev.y + deltaY / scale }));
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  if (authLoading || isLoading) {
    return <LoadingScreen message="Загрузка системы территорий..." />;
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
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-semibold">ContestGG</span>
            </div>
            
            {activeTemplate && (
              <Badge variant="secondary">{activeTemplate.name}</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Zoom controls */}
            <div className="hidden lg:flex items-center gap-1">
              <button onClick={() => setScale(prev => Math.max(prev / 1.2, MIN_SCALE))} 
                className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-medium min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(prev => Math.min(prev * 1.2, MAX_SCALE))}
                className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setScale(1); setPanOffset({ x: 0, y: 0 }); }}
                className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {/* Admin controls */}
            {user?.isAdmin && isAdminMode && !isDrawing && (
              <Button size="sm" onClick={() => { setIsDrawing(true); setShowShapeForm(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Контур
              </Button>
            )}
            
            {isDrawing && (
              <>
                <Button size="sm" onClick={handleCreateShape} disabled={drawingPath.length < 3}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />Сохранить
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setIsDrawing(false);
                  setDrawingPath([]);
                  setShowShapeForm(false);
                }}>
                  <X className="h-3.5 w-3.5 mr-1.5" />Отмена
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
            
            <button className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Map area */}
        <div className="flex-1 relative flex items-center justify-center bg-background">
          <div className="relative" style={{ width: '1200px', height: '800px' }}>
            {activeTemplate?.mapImageUrl && (
              <img 
                src={activeTemplate.mapImageUrl}
                alt="Map"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
              />
            )}
            
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={() => setIsDragging(false)}
              onWheel={handleWheel}
              onContextMenu={(e) => e.preventDefault()}
              className={`absolute inset-0 w-full h-full ${isDragging ? 'cursor-grabbing' : isDrawing ? 'cursor-crosshair' : 'cursor-grab'}`}
            />
          </div>
          
          {isDrawing && (
            <div className="absolute top-8 left-8 bg-card/90 backdrop-blur-sm p-4 rounded-lg border z-10">
              <h3 className="font-semibold mb-2">Создание контура</h3>
              <p className="text-sm text-muted-foreground">Кликайте для создания точек</p>
              <p className="text-sm text-muted-foreground">Минимум 3 точки</p>
              {drawingPath.length > 2 && (
                <p className="text-sm text-green-600 font-medium mt-2">
                  Кликните на красную точку для завершения
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">Точек: {drawingPath.length}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-card/30 backdrop-blur-sm overflow-y-auto">
          {selectedTerritory ? (
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-3">{selectedTerritory.name}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedTerritory.color }} />
                  <span className="text-sm">Цвет локации</span>
                </div>
                
                {selectedTerritory.owner ? (
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Заклеймлена</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{selectedTerritory.owner.displayName}</div>
                      <div className="text-muted-foreground">@{selectedTerritory.owner.username}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Свободная локация</span>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => handleClaimTerritory(selectedTerritory.id)}>
                      Заклеймить
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border-b text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">Кликните на локацию</p>
              <p className="text-xs mt-1">Новый клейм заменит предыдущий</p>
            </div>
          )}

          {/* Templates list */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Карты</h3>
              <Badge variant="outline">{templates.length}</Badge>
            </div>
            
            <div className="space-y-2">
              {templates.map(template => (
                <div key={template.id} onClick={() => handleActivateTemplate(template.id)}
                  className={cn("p-2 rounded-lg border cursor-pointer transition-colors",
                    activeTemplate?.id === template.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50')}>
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {template.isActive && <Badge variant="default" className="text-xs">Активная</Badge>}
                    {template.territoryCount !== undefined && (
                      <span className="text-xs text-muted-foreground">{template.territoryCount} локаций</span>
                    )}
                  </div>
                  {template.tournament && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Турнир: {template.tournament.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {user?.isAdmin && isAdminMode && (
              <Button size="sm" variant="outline" onClick={() => setShowTemplateForm(true)} className="w-full mt-3">
                <Plus className="h-3 w-3 mr-1" />Создать карту
              </Button>
            )}
          </div>

          {/* Territories list */}
          <div className="p-4">
            <h3 className="font-medium mb-3">Локации ({territories.length})</h3>
            <div className="space-y-2">
              {territories.map(territory => (
                <div key={territory.id} onClick={() => setSelectedTerritory(territory)}
                  className={cn("p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedTerritory?.id === territory.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: territory.color }} />
                      <span className="font-medium text-sm">{territory.name}</span>
                    </div>
                    {territory.owner && <Crown className="h-3 w-3 text-yellow-500" />}
                  </div>
                  {territory.owner && (
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      {territory.owner.displayName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shape form modal */}
      {showShapeForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96 border">
            <h3 className="font-semibold mb-4">Настройки контура</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название</label>
                <input type="text" value={shapeForm.name} onChange={(e) => setShapeForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background" placeholder="Название контура" />
              </div>
              <div>
                <label className="text-sm font-medium">Цвет</label>
                <input type="color" value={shapeForm.color} onChange={(e) => setShapeForm(prev => ({...prev, color: e.target.value}))}
                  className="w-full p-1 mt-1 border rounded bg-background h-10" />
              </div>
              <div>
                <label className="text-sm font-medium">Описание</label>
                <textarea value={shapeForm.description} onChange={(e) => setShapeForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background h-20" />
              </div>
              <Button onClick={() => setShowShapeForm(false)} variant="outline" className="w-full">
                Применить
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template form modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-[500px] border max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">Создать карту</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название</label>
                <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium">Описание</label>
                <textarea value={templateForm.description} onChange={(e) => setTemplateForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background h-20" />
              </div>
              <div>
                <label className="text-sm font-medium">Фоновое изображение</label>
                <input type="file" accept="image/*" onChange={(e) => setTemplateForm(prev => ({...prev, file: e.target.files?.[0] || null}))}
                  className="w-full p-2 mt-1 border rounded bg-background" />
              </div>
              <div>
                <label className="text-sm font-medium">Выберите контуры</label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {shapes.map(shape => (
                    <label key={shape.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" checked={templateForm.selectedShapes.includes(shape.id)}
                        onChange={(e) => {
                          setTemplateForm(prev => ({
                            ...prev,
                            selectedShapes: e.target.checked 
                              ? [...prev.selectedShapes, shape.id]
                              : prev.selectedShapes.filter(id => id !== shape.id)
                          }));
                        }} />
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: shape.defaultColor }} />
                      <span className="text-sm">{shape.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateTemplate} disabled={!templateForm.name.trim() || templateForm.selectedShapes.length === 0} className="flex-1">
                  Создать
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowTemplateForm(false);
                  setTemplateForm({ name: '', description: '', selectedShapes: [], file: null });
                }} className="flex-1">
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}