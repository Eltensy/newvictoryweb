import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger  } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Map, 
  Plus, 
  Edit, 
  Trash2, 
  Lock, 
  Unlock, 
  Save,
  Undo,
  Users,
  Link as LinkIcon,
  Copy,
  UserPlus,
  Upload,
  ExternalLink
} from 'lucide-react';

interface AdminDropMapTabProps {
  authToken: string;
}

interface Point {
  x: number;
  y: number;
}

interface TerritoryTemplate {
  id: string;
  name: string;
  description?: string;
  mapImageUrl?: string;
  isActive: boolean;
}

interface DropMapSettings {
  id: string;
  templateId: string;
  tournamentId?: string;
  mode: 'tournament' | 'practice';
  maxPlayersPerSpot: number;
  maxContestedSpots: number;
  allowReclaim: boolean;
  isLocked: boolean;
  customName?: string;
  template?: {
    name: string;
    mapImageUrl?: string;
  };
  tournament?: {
    name: string;
  };
}

interface TerritorySpot {
  id: string;
  name: string;
  points: Point[];
  color: string;
  description?: string;
  ownerId?: string;
  owner?: {
    displayName: string;
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

export default function AdminDropMapTab({ authToken }: AdminDropMapTabProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState('maps');
  const [loading, setLoading] = useState(false);
  
  const [templates, setTemplates] = useState<TerritoryTemplate[]>([]);
  const [dropmaps, setDropmaps] = useState<DropMapSettings[]>([]);
  const [selectedDropmap, setSelectedDropmap] = useState<DropMapSettings | null>(null);
  const [territories, setTerritories] = useState<TerritorySpot[]>([]);
  
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize] = useState({ width: 1000, height: 1000 });

  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [editNameForm, setEditNameForm] = useState({ id: '', name: '' });
  
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [mapForm, setMapForm] = useState({
    name: '',
    templateId: '',
    tournamentId: '',
    maxPlayersPerSpot: 1,
    maxContestedSpots: 0,
    allowReclaim: true,
  });
  
  const [spotForm, setSpotForm] = useState({
    name: '',
    color: '#3B82F6',
    description: '',
  });
  
  const [eligiblePlayers, setEligiblePlayers] = useState<EligiblePlayer[]>([]);
  const [showPlayersDialog, setShowPlayersDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importForm, setImportForm] = useState({
    tournamentId: '',
    topN: '',
    positions: '',
  });
  
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    displayName: '',
    expiresInDays: 30,
  });
  
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplates();
    fetchDropMaps();
    fetchTournaments();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (selectedDropmap) {
      fetchDropMapDetails(selectedDropmap.id);
      loadMapImage();
    }
  }, [selectedDropmap]);

  useEffect(() => {
    drawCanvas();
  }, [currentPoints, territories, mapImage]);

  const loadMapImage = () => {
    if (selectedDropmap?.template?.mapImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setMapImage(img);
      img.src = selectedDropmap.template.mapImageUrl;
    } else {
      setMapImage(null);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mapImage) {
      ctx.drawImage(mapImage, 0, 0, canvasSize.width, canvasSize.height);
    } else {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i <= canvasSize.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvasSize.height);
        ctx.stroke();
      }
      for (let i = 0; i <= canvasSize.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvasSize.width, i);
        ctx.stroke();
      }
    }

    territories.forEach((territory) => {
      if (!territory.points || territory.points.length < 3) return;

      ctx.fillStyle = territory.color + '40';
      ctx.beginPath();
      ctx.moveTo(territory.points[0].x, territory.points[0].y);
      territory.points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = territory.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (territory.points.length > 0) {
        const centerX = territory.points.reduce((sum, p) => sum + p.x, 0) / territory.points.length;
        const centerY = territory.points.reduce((sum, p) => sum + p.y, 0) / territory.points.length;
        
        ctx.font = 'bold 16px Montserrat, "Inter", system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(territory.name, centerX, centerY);
        
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
        ctx.fillText(territory.name, centerX, centerY);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText(territory.name, centerX, centerY);
      }
    });

    if (currentPoints.length > 0) {
      if (currentPoints.length >= 3) {
        ctx.fillStyle = spotForm.color + '40';
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = spotForm.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      currentPoints.forEach((point, index) => {
        ctx.fillStyle = spotForm.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((index + 1).toString(), point.x, point.y - 12);
      });
    }
  };

  const handleUpdateDropMapName = async () => {
    if (!editNameForm.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/dropmap/settings/${editNameForm.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customName: editNameForm.name }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Название обновлено',
        });
        setShowEditNameDialog(false);
        fetchDropMaps();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить название',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTerritory = async (territoryId: string) => {
    if (!selectedDropmap) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/territory/territories/${territoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Локация удалена',
        });
        await fetchDropMapDetails(selectedDropmap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить локацию',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const screenToCanvas = (screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize.width / rect.width;
    const scaleY = canvasSize.height / rect.height;
    
    const x = (screenX - rect.left) * scaleX;
    const y = (screenY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(canvasSize.width, Math.round(x))),
      y: Math.max(0, Math.min(canvasSize.height, Math.round(y)))
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = screenToCanvas(e.clientX, e.clientY);
    setCurrentPoints([...currentPoints, point]);
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/territory/templates', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchDropMaps = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dropmaps', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDropmaps(data);
      }
    } catch (error) {
      console.error('Error fetching dropmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropMapDetails = async (settingsId: string) => {
    try {
      const playersResponse = await fetch(`/api/dropmap/settings/${settingsId}/players`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (playersResponse.ok) {
        const players = await playersResponse.json();
        setEligiblePlayers(players);
      }

      const invitesResponse = await fetch(`/api/dropmap/settings/${settingsId}/invites`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (invitesResponse.ok) {
        const invites = await invitesResponse.json();
        setInviteCodes(invites);
      }

      const dropmap = dropmaps.find(d => d.id === settingsId);
      if (dropmap) {
        const territoriesResponse = await fetch(`/api/territory/territories?templateId=${dropmap.templateId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (territoriesResponse.ok) {
          const territoriesData = await territoriesResponse.json();
          setTerritories(territoriesData);
        }
      }
    } catch (error) {
      console.error('Error fetching dropmap details:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/admin/tournaments', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateDropMap = async () => {
    if (!mapForm.templateId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите шаблон карты',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const requestBody: any = {
        templateId: mapForm.templateId,
        mode: 'tournament',
        maxPlayersPerSpot: mapForm.maxPlayersPerSpot,
        maxContestedSpots: mapForm.maxContestedSpots,
        allowReclaim: mapForm.allowReclaim,
      };
      
      if (mapForm.tournamentId && mapForm.tournamentId !== '') {
        requestBody.tournamentId = mapForm.tournamentId;
      }

      const response = await fetch('/api/dropmap/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'DropMap создана',
        });
        setShowMapDialog(false);
        setMapForm({
          name: '',
          templateId: '',
          tournamentId: '',
          maxPlayersPerSpot: 1,
          maxContestedSpots: 0,
          allowReclaim: true,
        });
        fetchDropMaps();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать DropMap',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (settingsId: string, currentlyLocked: boolean) => {
    try {
      const response = await fetch(`/api/dropmap/settings/${settingsId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isLocked: !currentlyLocked }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: currentlyLocked ? 'Карта разблокирована' : 'Карта заблокирована',
        });
        fetchDropMaps();
        if (selectedDropmap?.id === settingsId) {
          setSelectedDropmap({ ...selectedDropmap, isLocked: !currentlyLocked });
        }
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSpot = async () => {
    if (!selectedDropmap) {
      toast({
        title: 'Ошибка',
        description: 'Выберите DropMap',
        variant: 'destructive',
      });
      return;
    }

    if (currentPoints.length < 3) {
      toast({
        title: 'Ошибка',
        description: 'Нужно минимум 3 точки для создания локации',
        variant: 'destructive',
      });
      return;
    }

    if (!spotForm.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название локации',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const shapeResponse = await fetch('/api/territory/shapes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: spotForm.name,
          points: currentPoints,
          defaultColor: spotForm.color,
          description: spotForm.description,
        }),
      });

      if (!shapeResponse.ok) {
        const error = await shapeResponse.json();
        throw new Error(error.error || 'Не удалось создать контур');
      }

      const shape = await shapeResponse.json();

      const template = await fetch(`/api/territory/templates/${selectedDropmap.templateId}/add-shape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shapeId: shape.id }),
      });

      if (!template.ok) {
        const error = await template.json();
        throw new Error(error.error || 'Не удалось добавить локацию к шаблону');
      }

      toast({
        title: 'Успешно',
        description: 'Локация создана',
      });
      
      setCurrentPoints([]);
      setIsDrawing(false);
      setSpotForm({ name: '', color: '#3B82F6', description: '' });
      
      await fetchDropMapDetails(selectedDropmap.id);
    } catch (error: any) {
      console.error('Error saving spot:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать локацию',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayers = async () => {
    if (!selectedDropmap || selectedUsers.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/dropmap/settings/${selectedDropmap.id}/players`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Успешно',
          description: `Добавлено игроков: ${data.added}`,
        });
        setShowPlayersDialog(false);
        setSelectedUsers([]);
        fetchDropMapDetails(selectedDropmap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить игроков',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportPlayers = async () => {
    if (!selectedDropmap || !importForm.tournamentId) return;

    setLoading(true);
    try {
      const body: any = { tournamentId: importForm.tournamentId };
      
      if (importForm.topN) {
        body.topN = parseInt(importForm.topN);
      } else if (importForm.positions) {
        body.positions = importForm.positions.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
      }

      const response = await fetch(`/api/dropmap/settings/${selectedDropmap.id}/import-players`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Успешно',
          description: `Импортировано игроков: ${data.added}`,
        });
        setShowImportDialog(false);
        setImportForm({ tournamentId: '', topN: '', positions: '' });
        fetchDropMapDetails(selectedDropmap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось импортировать игроков',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInviteCode = async () => {
    if (!selectedDropmap) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/dropmap/settings/${selectedDropmap.id}/invites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      if (response.ok) {
        const data = await response.json();
        const inviteUrl = `${window.location.origin}/dropmap/invite/${data.code}`;
        
        toast({
          title: 'Успешно',
          description: `Код создан: ${data.code}`,
        });
        
        navigator.clipboard.writeText(inviteUrl);
        
        setShowInviteDialog(false);
        setInviteForm({ displayName: '', expiresInDays: 30 });
        fetchDropMapDetails(selectedDropmap.id);
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать код',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlayer = async (userId: string) => {
    if (!selectedDropmap) return;

    try {
      const response = await fetch(`/api/dropmap/settings/${selectedDropmap.id}/players/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Игрок удален',
        });
        fetchDropMapDetails(selectedDropmap.id);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить игрока',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteInvite = async (code: string) => {
    try {
      const response = await fetch(`/api/dropmap/invites/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Код удален',
        });
        if (selectedDropmap) {
          fetchDropMapDetails(selectedDropmap.id);
        }
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить код',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-gaming flex items-center gap-2">
            <Map className="h-5 w-5" />
            Управление DropMap
          </CardTitle>
          <CardDescription>
            Создавайте и управляйте картами для турниров
          </CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить название</DialogTitle>
            <DialogDescription>
              Введите новое название для карты
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={editNameForm.name}
                onChange={(e) => setEditNameForm({ ...editNameForm, name: e.target.value })}
                placeholder="Введите название..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateDropMapName}
                disabled={!editNameForm.name.trim() || loading}
                className="flex-1"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditNameDialog(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="maps">Карты</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedDropmap}>
            Детали {selectedDropmap && `(${selectedDropmap.customName || selectedDropmap.template?.name})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maps">
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Активные карты</CardTitle>
        <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать карту
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая карта</DialogTitle>
              <DialogDescription>
                Создайте карту на основе шаблона
              </DialogDescription>
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
              <div>
                <Label>Макс. игроков на локации</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={mapForm.maxPlayersPerSpot}
                  onChange={(e) => setMapForm({ ...mapForm, maxPlayersPerSpot: parseInt(e.target.value) })}
                />
              </div>
              <Button onClick={handleCreateDropMap} disabled={loading} className="w-full">
                {loading ? 'Создание...' : 'Создать карту'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CardHeader>
    <CardContent>
      {loading && <div className="text-center py-4">Загрузка...</div>}
      {!loading && dropmaps.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Нет созданных карт
        </div>
      )}
      {!loading && dropmaps.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Прямая ссылка</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dropmaps.map((dropmap) => (
              <TableRow key={dropmap.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{dropmap.customName || dropmap.template?.name || 'Неизвестно'}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditNameForm({ 
                          id: dropmap.id, 
                          name: dropmap.customName || dropmap.template?.name || '' 
                        });
                        setShowEditNameDialog(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={dropmap.mode === 'tournament' ? 'default' : 'secondary'}>
                      {dropmap.mode === 'tournament' ? 'турнирная' : 'кастомная'}
                    </Badge>
                    {dropmap.isLocked && (
                      <Badge variant="destructive">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      /dropmap/{dropmap.id.slice(0, 8)}...
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyDropMapLink(dropmap.id)}
                      title="Скопировать ссылку"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {/* Открыть карту */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/dropmap/${dropmap.id}`, '_blank')}
                      title="Открыть в новой вкладке"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    
                    {/* Редактировать */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDropmap(dropmap);
                        setActiveTab('details');
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {/* Блокировка/Разблокировка */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleLock(dropmap.id, dropmap.isLocked)}
                    >
                      {dropmap.isLocked ? (
                        <Unlock className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}