import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Users, MapPin, Edit, Trash2, Plus, Save, X, User, Calendar, Shield } from 'lucide-react';

interface Territory {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  color: string;
  ownerId?: string;
  ownerName?: string;
  claimedAt?: Date;
  priority: number;
  description?: string;
  isActive: boolean;
}

interface Template {
  id: string;
  name: string;
  territories: Territory[];
  isActive: boolean;
  createdAt: Date;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

interface InteractiveTerritoryMapProps {
  mapImageUrl?: string;
  currentUser: User;
  isAdmin?: boolean;
}

export default function InteractiveTerritoryMap({ 
  mapImageUrl = "public/123.png", 
  currentUser,
  isAdmin = false 
}: InteractiveTerritoryMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [showTerritoryForm, setShowTerritoryForm] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  
  // Form states
  const [territoryForm, setTerritoryForm] = useState({
    name: '',
    color: '#3B82F6',
    priority: 1,
    description: ''
  });
  
  const [templateName, setTemplateName] = useState('');
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sample territories (would come from database)
  const sampleTerritories: Territory[] = [
    {
      id: '1',
      name: 'Північна Область',
      points: [
        { x: 200, y: 150 },
        { x: 300, y: 150 },
        { x: 300, y: 250 },
        { x: 200, y: 250 }
      ],
      color: '#10B981',
      ownerId: 'user1',
      ownerName: 'PlayerOne',
      claimedAt: new Date('2024-01-15'),
      priority: 1,
      description: 'Стратегічно важлива територія',
      isActive: true
    },
    {
      id: '2',
      name: 'Східний Регіон',
      points: [
        { x: 450, y: 200 },
        { x: 550, y: 180 },
        { x: 580, y: 280 },
        { x: 460, y: 300 }
      ],
      color: '#EF4444',
      ownerId: 'user2',
      ownerName: 'RedCommander',
      claimedAt: new Date('2024-01-16'),
      priority: 2,
      description: 'Багаті ресурси',
      isActive: true
    },
    {
      id: '3',
      name: 'Центральний Район',
      points: [
        { x: 300, y: 300 },
        { x: 400, y: 280 },
        { x: 420, y: 380 },
        { x: 320, y: 400 }
      ],
      color: '#8B5CF6',
      priority: 3,
      description: 'Нейтральна зона',
      isActive: true
    }
  ];

  useEffect(() => {
    setTerritories(sampleTerritories);
  }, []);

  // Canvas drawing and interaction
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw territories
    territories.forEach(territory => {
      if (territory.points.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(territory.points[0].x, territory.points[0].y);
      territory.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();

      // Fill
      ctx.fillStyle = territory.ownerId 
        ? `${territory.color}80` 
        : `${territory.color}40`;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = territory.color;
      ctx.lineWidth = territory === selectedTerritory ? 3 : 2;
      ctx.stroke();

      // Territory label
      const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
      const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(territory.name, centerX, centerY - 5);
      
      if (territory.ownerName) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText(territory.ownerName, centerX, centerY + 10);
      }
    });

    // Draw current path while drawing
    if (isDrawing && currentPath.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = territoryForm.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      currentPath.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = territoryForm.color;
        ctx.fill();
      });
    }
  }, [territories, selectedTerritory, isDrawing, currentPath, territoryForm.color]);

  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }, []);

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
    const coords = getCanvasCoordinates(event);

    if (isDrawing && isAdmin) {
      // Add point to current path
      setCurrentPath(prev => [...prev, coords]);
      return;
    }

    // Check if clicking on a territory
    const clickedTerritory = territories.find(territory => 
      isPointInTerritory(coords, territory)
    );

    if (clickedTerritory) {
      setSelectedTerritory(clickedTerritory);
      
      // Claim territory if not owned
      if (!clickedTerritory.ownerId && !isAdmin) {
        handleClaimTerritory(clickedTerritory.id);
      }
    } else {
      setSelectedTerritory(null);
    }
  }, [isDrawing, territories, isAdmin, getCanvasCoordinates, isPointInTerritory]);

  const handleClaimTerritory = async (territoryId: string) => {
    try {
      // Here you would make API call to claim territory
      setTerritories(prev => prev.map(t => 
        t.id === territoryId 
          ? { 
              ...t, 
              ownerId: currentUser.id, 
              ownerName: currentUser.displayName,
              claimedAt: new Date() 
            }
          : t
      ));
      
      // Show success message
      console.log('Territory claimed successfully');
    } catch (error) {
      console.error('Failed to claim territory:', error);
    }
  };

  const startDrawing = () => {
    if (!isAdmin) return;
    setIsDrawing(true);
    setCurrentPath([]);
    setShowTerritoryForm(true);
  };

  const finishDrawing = () => {
    if (!isDrawing || currentPath.length < 3) return;

    const newTerritory: Territory = {
      id: Date.now().toString(),
      name: territoryForm.name || `Територія ${territories.length + 1}`,
      points: [...currentPath],
      color: territoryForm.color,
      priority: territoryForm.priority,
      description: territoryForm.description,
      isActive: true
    };

    setTerritories(prev => [...prev, newTerritory]);
    setIsDrawing(false);
    setCurrentPath([]);
    setShowTerritoryForm(false);
    setTerritoryForm({ name: '', color: '#3B82F6', priority: 1, description: '' });
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPath([]);
    setShowTerritoryForm(false);
    setTerritoryForm({ name: '', color: '#3B82F6', priority: 1, description: '' });
  };

  const deleteTerritory = (territoryId: string) => {
    setTerritories(prev => prev.filter(t => t.id !== territoryId));
    setSelectedTerritory(null);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: templateName,
      territories: [...territories],
      isActive: true,
      createdAt: new Date()
    };

    setTemplates(prev => [...prev, newTemplate]);
    setTemplateName('');
    // API call to save template
    console.log('Template saved:', newTemplate);
  };

  const loadTemplate = (template: Template) => {
    setTerritories([...template.territories]);
    setActiveTemplate(template);
    setShowTemplateManager(false);
  };

  const assignTerritoryToUser = (territoryId: string, userId: string, userName: string) => {
    setTerritories(prev => prev.map(t => 
      t.id === territoryId 
        ? { 
            ...t, 
            ownerId: userId, 
            ownerName: userName,
            claimedAt: new Date() 
          }
        : t
    ));
  };

  return (
    <div className="w-full h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold font-gaming">Territory Control</h1>
            </div>
            
            {activeTemplate && (
              <Badge variant="secondary" className="font-gaming">
                Template: {activeTemplate.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateManager(true)}
                  className="font-gaming"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Templates
                </Button>
                
                {!isDrawing ? (
                  <Button
                    onClick={startDrawing}
                    size="sm"
                    className="font-gaming bg-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Draw Territory
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={finishDrawing}
                      size="sm"
                      className="font-gaming bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={cancelDrawing}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
            
            <Badge variant="secondary" className="font-gaming">
              <User className="h-3 w-3 mr-1" />
              {currentUser.displayName}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Map Area */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Background map image */}
              <img 
                src="public/123.png"
                alt="Territory Map"
                className="max-w-full max-h-full object-contain opacity-80"
                style={{ filter: 'brightness(0.9)' }}
              />
              
              {/* Interactive canvas overlay */}
              <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                onClick={handleCanvasClick}
                className="absolute top-0 left-0 cursor-crosshair"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  maxWidth: '1200px',
                  maxHeight: '800px'
                }}
              />
            </div>
          </div>

          {/* Instructions overlay */}
          {isDrawing && (
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm p-4 rounded-lg border">
              <h3 className="font-gaming font-semibold mb-2">Створення території</h3>
              <p className="text-sm text-muted-foreground">
                Клікайте на карті щоб створити точки території. Мінімум 3 точки.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Поточних точок: {currentPath.length}
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l border-border bg-card/30 backdrop-blur-sm overflow-y-auto">
          {/* Territory Info */}
          {selectedTerritory ? (
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-gaming font-semibold">{selectedTerritory.name}</h3>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTerritory(selectedTerritory)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTerritory(selectedTerritory.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: selectedTerritory.color }}
                  />
                  <span>Priority: {selectedTerritory.priority}</span>
                </div>
                
                {selectedTerritory.ownerId ? (
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                    <Crown className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">{selectedTerritory.ownerName}</div>
                      <div className="text-xs text-muted-foreground">
                        Claimed {selectedTerritory.claimedAt?.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Unclaimed Territory</span>
                    </div>
                    {!isAdmin && (
                      <Button 
                        size="sm" 
                        className="w-full mt-2 font-gaming"
                        onClick={() => handleClaimTerritory(selectedTerritory.id)}
                      >
                        Claim Territory
                      </Button>
                    )}
                  </div>
                )}

                {selectedTerritory.description && (
                  <div className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">
                    {selectedTerritory.description}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-border">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Оберіть територію на карті</p>
              </div>
            </div>
          )}

          {/* Territory List */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-gaming font-medium">All Territories</h3>
              <Badge variant="outline">{territories.length}</Badge>
            </div>

            <div className="space-y-2">
              {territories.map(territory => (
                <div 
                  key={territory.id}
                  onClick={() => setSelectedTerritory(territory)}
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
                    {territory.ownerId && (
                      <Crown className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                  
                  {territory.ownerName && (
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      {territory.ownerName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Territory Form Modal */}
      {showTerritoryForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96 border">
            <h3 className="font-gaming font-semibold mb-4">Territory Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={territoryForm.name}
                  onChange={(e) => setTerritoryForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background"
                  placeholder="Territory name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Color</label>
                <input
                  type="color"
                  value={territoryForm.color}
                  onChange={(e) => setTerritoryForm(prev => ({...prev, color: e.target.value}))}
                  className="w-full p-1 mt-1 border rounded bg-background h-10"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Priority</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={territoryForm.priority}
                  onChange={(e) => setTerritoryForm(prev => ({...prev, priority: parseInt(e.target.value)}))}
                  className="w-full p-2 mt-1 border rounded bg-background"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={territoryForm.description}
                  onChange={(e) => setTerritoryForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full p-2 mt-1 border rounded bg-background h-20"
                  placeholder="Optional description"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-gaming font-semibold">Template Manager</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTemplateManager(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Save Current */}
            <div className="mb-6 p-4 border rounded">
              <h4 className="font-medium mb-2">Save Current Map</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="flex-1 p-2 border rounded bg-background"
                  placeholder="Template name"
                />
                <Button onClick={saveTemplate} size="sm">
                  Save
                </Button>
              </div>
            </div>

            {/* Templates List */}
            <div>
              <h4 className="font-medium mb-2">Saved Templates</h4>
              <div className="space-y-2">
                {templates.map(template => (
                  <div key={template.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.territories.length} territories
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => loadTemplate(template)}
                      >
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}