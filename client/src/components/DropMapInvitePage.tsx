import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (code) {
      validateInvite();
    }
  }, [code]);

  useEffect(() => {
    if (inviteData && territories.length > 0) {
      drawMap();
    }
  }, [inviteData, territories, selectedTerritory, scale, panOffset]);

  const validateInvite = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dropmap/invite/${code}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Неверный код');
      }
      
      const data = await response.json();
      setInviteData(data);
      
      // Fetch territories
      const territoriesResponse = await fetch(`/api/territory/territories?templateId=${data.template.id}`);
      if (territoriesResponse.ok) {
        const territoriesData = await territoriesResponse.json();
        setTerritories(territoriesData);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(scale, scale);
    
    // Draw territories
    territories.forEach(territory => {
      if (territory.points.length < 3) return;
      
      ctx.beginPath();
      ctx.moveTo(territory.points[0].x, territory.points[0].y);
      territory.points.slice(1).forEach((point: any) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      
      // Fill
      const isSelected = selectedTerritory === territory.id;
      const isOccupied = territory.owners && territory.owners.length > 0;
      const alpha = isOccupied ? '80' : isSelected ? '60' : '20';
      ctx.fillStyle = `${territory.color}${alpha}`;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = isSelected ? '#fff' : territory.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
    });
    
    ctx.restore();
    
    // Draw labels
    territories.forEach(territory => {
      if (territory.points.length < 3) return;
      
      const centerX = territory.points.reduce((sum: number, p: any) => sum + p.x, 0) / territory.points.length;
      const centerY = territory.points.reduce((sum: number, p: any) => sum + p.y, 0) / territory.points.length;
      
      const screenX = centerX * scale + panOffset.x;
      const screenY = centerY * scale + panOffset.y;
      
      const displayText = territory.owners && territory.owners.length > 0
        ? territory.owners[0].displayName
        : territory.name;
      
      ctx.font = 'bold 16px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.strokeText(displayText, screenX, screenY);
      
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(displayText, screenX, screenY);
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (claimed) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1200;
    const y = ((event.clientY - rect.top) / rect.height) * 800;
    
    const mapX = (x - panOffset.x * scale) / scale;
    const mapY = (y - panOffset.y * scale) / scale;
    
    // Find clicked territory
    const clickedTerritory = territories.find(t => {
      return isPointInPolygon({ x: mapX, y: mapY }, t.points);
    });
    
    if (clickedTerritory && (!clickedTerritory.owners || clickedTerritory.owners.length === 0)) {
      setSelectedTerritory(clickedTerritory.id);
    }
  };

  const isPointInPolygon = (point: { x: number; y: number }, polygon: any[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const handleClaim = async () => {
    if (!selectedTerritory) return;
    
    setClaiming(true);
    try {
      const response = await fetch('/api/dropmap/claim-with-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          territoryId: selectedTerritory,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка клейма');
      }
      
      setClaimed(true);
      
      // Refresh territories
      const territoriesResponse = await fetch(`/api/territory/territories?templateId=${inviteData.template.id}`);
      if (territoriesResponse.ok) {
        const territoriesData = await territoriesResponse.json();
        setTerritories(territoriesData);
      }
    } catch (err: any) {
      alert(err.message || 'Не удалось поставить метку');
    } finally {
      setClaiming(false);
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-center">Метка поставлена!</CardTitle>
            <CardDescription className="text-center">
              Ваша локация успешно отмечена как {inviteData.displayName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative" style={{ aspectRatio: '3/2' }}>
              {inviteData.template.mapImageUrl && (
                <img
                  src={inviteData.template.mapImageUrl}
                  alt="Map"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
              <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Выбор локации</CardTitle>
                <CardDescription>
                  Выберите локацию для {inviteData.displayName}
                </CardDescription>
              </div>
              <Badge>{inviteData.template.name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative" style={{ aspectRatio: '3/2' }}>
              {inviteData.template.mapImageUrl && (
                <img
                  src={inviteData.template.mapImageUrl}
                  alt="Map"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
              <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                onClick={handleCanvasClick}
                className="absolute inset-0 w-full h-full cursor-pointer"
              />
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Инструкция</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>Кликните на свободную (серую) локацию для выбора</li>
                <li>Занятые локации (цветные) выбрать нельзя</li>
                <li>После выбора нажмите кнопку "Подтвердить"</li>
              </ul>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedTerritory ? (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <MapPin className="inline h-4 w-4" />
                    Локация выбрана: {territories.find(t => t.id === selectedTerritory)?.name}
                  </span>
                ) : (
                  <span>Кликните на свободную локацию</span>
                )}
              </div>
              
              <Button
                onClick={handleClaim}
                disabled={!selectedTerritory || claiming}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}