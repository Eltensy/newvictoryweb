import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Save, Undo, ZoomIn, ZoomOut } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Territory {
  id: string;
  name: string;
  points: Point[];
  color: string;
}

export default function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapImage, setMapImage] = useState<string>('/api/placeholder/800/600');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [territoryName, setTerritoryName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    drawCanvas();
  }, [currentPoints, territories, zoom, offset]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply zoom and pan
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw background image (placeholder)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width / zoom, canvas.height / zoom);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 / zoom;
    for (let i = 0; i < canvas.width / zoom; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height / zoom);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height / zoom; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width / zoom, i);
      ctx.stroke();
    }

    // Draw saved territories
    territories.forEach((territory) => {
      if (territory.points.length < 3) return;

      // Fill
      ctx.fillStyle = territory.color + '40';
      ctx.beginPath();
      ctx.moveTo(territory.points[0].x, territory.points[0].y);
      territory.points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();

      // Border
      ctx.strokeStyle = territory.color;
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      // Points
      territory.points.forEach((point) => {
        ctx.fillStyle = territory.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoom, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Label
      if (territory.points.length > 0) {
        const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
        const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;
        
        ctx.fillStyle = '#fff';
        ctx.font = `${14 / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(territory.name, centerX, centerY);
      }
    });

    // Draw current polygon being drawn
    if (currentPoints.length > 0) {
      // Fill
      if (currentPoints.length >= 3) {
        ctx.fillStyle = selectedColor + '40';
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fill();
      }

      // Lines
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Points
      currentPoints.forEach((point, index) => {
        ctx.fillStyle = selectedColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoom, 0, 2 * Math.PI);
        ctx.fill();

        // Point number
        ctx.fillStyle = '#fff';
        ctx.font = `${12 / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText((index + 1).toString(), point.x, point.y - 8 / zoom);
      });
    }

    ctx.restore();
  };

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    return { x, y };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning || !isDrawing) return;

    const point = getCanvasPoint(e);

    // Check if clicking near first point to close polygon
    if (currentPoints.length >= 3) {
      const firstPoint = currentPoints[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );

      if (distance < 10 / zoom) {
        // Close polygon
        return;
      }
    }

    setCurrentPoints([...currentPoints, point]);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.shiftKey) { // Middle mouse or Shift + click for panning
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    setZoom(newZoom);
  };

  const handleSaveTerritory = () => {
    if (currentPoints.length < 3) {
      alert('Нужно минимум 3 точки для создания локации');
      return;
    }

    if (!territoryName.trim()) {
      alert('Введите название локации');
      return;
    }

    const newTerritory: Territory = {
      id: Date.now().toString(),
      name: territoryName,
      points: [...currentPoints],
      color: selectedColor,
    };

    setTerritories([...territories, newTerritory]);
    setCurrentPoints([]);
    setTerritoryName('');
    setIsDrawing(false);
  };

  const handleDeleteTerritory = (id: string) => {
    setTerritories(territories.filter(t => t.id !== id));
  };

  const handleUndo = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  const handleClear = () => {
    setCurrentPoints([]);
  };

  const handleExport = () => {
    const data = {
      territories: territories.map(t => ({
        name: t.name,
        points: t.points,
        color: t.color,
      })),
    };
    console.log('Export data:', data);
    alert('Данные экспортированы в консоль');
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Название локации</Label>
              <Input
                value={territoryName}
                onChange={(e) => setTerritoryName(e.target.value)}
                placeholder="Введите название..."
                disabled={!isDrawing}
              />
            </div>
            <div className="w-32">
              <Label>Цвет</Label>
              <Input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                disabled={!isDrawing}
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setIsDrawing(!isDrawing)}
              variant={isDrawing ? 'destructive' : 'default'}
            >
              {isDrawing ? 'Отменить рисование' : 'Начать рисование'}
            </Button>
            
            {isDrawing && (
              <>
                <Button onClick={handleUndo} variant="outline">
                  <Undo className="h-4 w-4 mr-2" />
                  Отменить точку
                </Button>
                <Button onClick={handleClear} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Очистить
                </Button>
                <Button
                  onClick={handleSaveTerritory}
                  disabled={currentPoints.length < 3 || !territoryName.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить локацию ({currentPoints.length} точек)
                </Button>
              </>
            )}

            <div className="flex gap-2 ml-auto">
              <Button onClick={() => setZoom(zoom * 1.2)} variant="outline" size="icon">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button onClick={() => setZoom(zoom * 0.8)} variant="outline" size="icon">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} variant="outline">
                Сброс
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {isDrawing ? (
              <>
                <p>• Кликайте по карте чтобы добавить точки</p>
                <p>• Shift + перетаскивание или колесико мыши для панорамирования</p>
                <p>• Колесико мыши для зума</p>
                <p>• Минимум 3 точки для создания локации</p>
              </>
            ) : (
              <p>Нажмите "Начать рисование" чтобы создать новую локацию</p>
            )}
          </div>
        </div>
      </Card>

      <div className="border rounded-lg overflow-hidden bg-gray-900">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="cursor-crosshair"
          style={{ display: 'block' }}
        />
      </div>

      {territories.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Созданные локации ({territories.length})</h3>
          <div className="space-y-2">
            {territories.map((territory) => (
              <div
                key={territory.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: territory.color }}
                  />
                  <div>
                    <div className="font-medium">{territory.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {territory.points.length} точек
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteTerritory(territory.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={handleExport} className="w-full mt-4">
            Экспортировать все локации
          </Button>
        </Card>
      )}
    </div>
  );
}