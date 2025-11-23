// client/src/components/AdminTournamentsTab.tsx - ПОЛНАЯ ВЕРСИЯ С ПРИЗОВЫМ ФОНДОМ
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Plus, Edit, Trash2, Users, Calendar, Coins, Eye, Gift, X, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  prize: number;
  entryFee: number;
  registrationOpen: boolean;
  maxParticipants: number | null;
  currentParticipants: number;
  status: string;
  imageUrl: string | null;
  teamMode: 'solo' | 'duo' | 'trio' | 'squad';
  prizeDistribution?: Record<string, number>;
  dropMapId?: string | null;
}

interface TournamentRegistration {
  id: string;
  userId: string;
  status: string;
  teamName: string | null;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface AdminTournamentsTabProps {
  tournaments: Tournament[];
  loading: boolean;
  onRefresh: () => void;
  authToken: string;
}

export function AdminTournamentsTab({ tournaments, loading, onRefresh, authToken }: AdminTournamentsTabProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPrizeDialog, setShowPrizeDialog] = useState(false);
  const [showLinkDropMapDialog, setShowLinkDropMapDialog] = useState(false);
  const [showAddPlayersDialog, setShowAddPlayersDialog] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tournamentParticipants, setTournamentParticipants] = useState<TournamentRegistration[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [dropMapIdInput, setDropMapIdInput] = useState('');
  const [availableMaps, setAvailableMaps] = useState<Array<{ id: string; name: string }>>([]);

  // Add players state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Prize distribution state
  const [prizeDistribution, setPrizeDistribution] = useState<Record<string, number>>({});
  
  // Prize inputs for create form
  const [prizeInputs, setPrizeInputs] = useState<Array<{ place: number; amount: number }>>([
    { place: 1, amount: 0 }
  ]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: '',
    entryFee: 0,
    maxParticipants: '',
    teamMode: 'solo' as 'solo' | 'duo' | 'trio' | 'squad',
    isInviteOnly: false,
    autoCreateDiscordChannels: false,
    discordRoleId: '',
    templateMapId: '', // ID шаблона карты для копирования
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rules: '',
      entryFee: 0,
      maxParticipants: '',
      teamMode: 'solo',
      autoCreateDiscordChannels: false,
      discordRoleId: '',
      templateMapId: '',
    });
    setPrizeInputs([{ place: 1, amount: 0 }]);
    setImageFile(null);
  };

  const addPrizePlace = () => {
    const nextPlace = prizeInputs.length + 1;
    setPrizeInputs([...prizeInputs, { place: nextPlace, amount: 0 }]);
  };

  const removePrizePlace = (index: number) => {
    if (prizeInputs.length > 1) {
      setPrizeInputs(prizeInputs.filter((_, i) => i !== index));
    }
  };

  const updatePrizeAmount = (index: number, amount: string) => {
    const newInputs = [...prizeInputs];
    newInputs[index].amount = parseInt(amount) || 0;
    setPrizeInputs(newInputs);
  };

  const getTotalPrizeDistribution = () => {
    return prizeInputs.reduce((sum, prize) => sum + prize.amount, 0);
  };

  const getPlaceEmoji = (place: number) => {
    switch(place) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${place}.`;
    }
  };

  const fetchAvailableMaps = async () => {
    try {
      console.log('🗺️ Fetching available maps...');
      const response = await fetch('/api/maps', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch maps');

      const data = await response.json();
      console.log('📋 Available maps received:', data);
      // API returns array directly, not { maps: [...] }
      setAvailableMaps(Array.isArray(data) ? data : []);
      console.log('✅ Maps state updated, count:', (Array.isArray(data) ? data : []).length);
    } catch (error) {
      console.error('❌ Fetch maps error:', error);
    }
  };

  const fetchTournamentParticipants = async (tournamentId: string) => {
    setLoadingParticipants(true);
    try {
      const response = await fetch(`/api/tournament/${tournamentId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch tournament details');

      const data = await response.json();
      setTournamentParticipants(data.registrations || []);
    } catch (error) {
      console.error('Fetch participants error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить участников',
        variant: 'destructive',
      });
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleOpenPrizeDialog = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    await fetchTournamentParticipants(tournament.id);
    
    // Initialize prize distribution
    const initialDistribution: Record<string, number> = {};
    setPrizeDistribution(initialDistribution);
    
    setShowPrizeDialog(true);
  };

  const handleDistributePrizes = async () => {
    if (!selectedTournament) return;

    const distributions = Object.entries(prizeDistribution).filter(([_, amount]) => amount > 0);
    
    if (distributions.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Укажите хотя бы одного получателя приза',
        variant: 'destructive',
      });
      return;
    }

    const totalPrize = distributions.reduce((sum, [_, amount]) => sum + amount, 0);
    
    if (!confirm(`Распределить ${totalPrize.toLocaleString()} ₽ между ${distributions.length} участниками?`)) {
      return;
    }

    setActionLoading(true);
    try {
      // Send prizes to each user
      for (const [userId, amount] of distributions) {
        const response = await fetch(`/api/admin/user/${userId}/balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            amount: amount,
            reason: `Приз за турнир: ${selectedTournament.name}`,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to send prize to user ${userId}`);
        }
      }

      toast({
        title: 'Успешно',
        description: `Призы распределены между ${distributions.length} участниками`,
      });

      setShowPrizeDialog(false);
      setPrizeDistribution({});
      setSelectedTournament(null);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось распределить призы',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!formData.name) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    // Validate prize distribution
    const totalPrize = getTotalPrizeDistribution();
    if (totalPrize === 0) {
      toast({
        title: 'Ошибка',
        description: 'Укажите призовой фонд',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.rules) formDataToSend.append('rules', formData.rules);
      if (formData.templateMapId) formDataToSend.append('templateMapId', formData.templateMapId);

      // Build prize distribution object
      const prizeDistributionObj: Record<string, number> = {};
      prizeInputs.forEach(prize => {
        if (prize.amount > 0) {
          prizeDistributionObj[prize.place.toString()] = prize.amount;
        }
      });

      formDataToSend.append('prizeDistribution', JSON.stringify(prizeDistributionObj));
      formDataToSend.append('prize', totalPrize.toString());
      formDataToSend.append('entryFee', formData.entryFee.toString());
      if (formData.maxParticipants) formDataToSend.append('maxParticipants', formData.maxParticipants);
      formDataToSend.append('teamMode', formData.teamMode);
      formDataToSend.append('isInviteOnly', formData.isInviteOnly.toString());
      if (imageFile) formDataToSend.append('image', imageFile);

      // Discord Integration
      formDataToSend.append('autoCreateDiscordChannels', formData.autoCreateDiscordChannels.toString());
      if (formData.discordRoleId) formDataToSend.append('discordRoleId', formData.discordRoleId);

      const response = await fetch('/api/admin/tournament', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tournament');
      }

      toast({
        title: 'Успешно',
        description: 'Турнир создан',
      });

      setShowCreateDialog(false);
      resetForm();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать турнир',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (tournamentId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/tournament/${tournamentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tournament');
      }

      toast({
        title: 'Успешно',
        description: 'Статус турнира обновлён',
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить статус',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRegistration = async (tournamentId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/tournament/${tournamentId}/toggle-registration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle registration');
      }

      toast({
        title: 'Успешно',
        description: 'Регистрация обновлена',
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить регистрацию',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm('Вы уверены? Всем участникам будет возвращён взнос.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/tournament/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tournament');
      }

      toast({
        title: 'Успешно',
        description: 'Турнир удалён, участникам возвращены средства',
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить турнир',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenLinkDropMapDialog = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setDropMapIdInput('');
    setShowLinkDropMapDialog(true);
  };

  const handleLinkDropMap = async () => {
    if (!selectedTournament || !dropMapIdInput.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите ID карты',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/tournament/${selectedTournament.id}/link-dropmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ dropMapId: dropMapIdInput.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link dropmap');
      }

      toast({
        title: 'Успешно',
        description: 'Карта привязана к турниру',
      });

      setShowLinkDropMapDialog(false);
      setDropMapIdInput('');
      setSelectedTournament(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось привязать карту',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration_open':
        return 'bg-gaming-success';
      case 'upcoming':
        return 'bg-blue-500';
      case 'registration_closed':
        return 'bg-gaming-warning';
      case 'in_progress':
        return 'bg-gaming-secondary';
      case 'completed':
        return 'bg-muted';
      case 'cancelled':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const getTotalPrizeDistributionForDialog = () => {
    return Object.values(prizeDistribution).reduce((sum, amount) => sum + (amount || 0), 0);
  };

  const formatPrizeDistribution = (distribution?: Record<string, number>) => {
    if (!distribution) return [];
    return Object.entries(distribution)
      .map(([place, amount]) => ({ place: parseInt(place), amount }))
      .sort((a, b) => a.place - b.place);
  };

  // Load available maps when component mounts
  useEffect(() => {
    if (authToken) {
      fetchAvailableMaps();
    }
  }, [authToken]);

  // Load all users for adding to tournament
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenAddPlayersDialog = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setSelectedUserIds([]);
    setPlayerSearchQuery('');
    setShowAddPlayersDialog(true);
    await loadAllUsers();
  };

  const handleAddPlayers = async () => {
    if (!selectedTournament || selectedUserIds.length === 0) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/tournament/${selectedTournament.id}/add-players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add players');
      }

      const result = await response.json();

      toast({
        title: 'Успешно',
        description: result.message,
      });

      setShowAddPlayersDialog(false);
      setSelectedUserIds([]);
      setPlayerSearchQuery('');
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить игроков',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsersForAdd = allUsers.filter(u =>
    u.displayName.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(playerSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-gaming flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gaming-warning" />
                Управление турнирами
              </CardTitle>
              <CardDescription>Создание и управление игровыми турнирами</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать турнир
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Создать новый турнир</DialogTitle>
                  <DialogDescription>
                    Заполните информацию о турнире
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Название турнира *</Label>
                    <Input
                      id="name"
                      placeholder="Введите название"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      placeholder="Краткое описание турнира"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Prize Distribution Section */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border-2 border-gaming-warning/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-gaming-warning" />
                        Распределение призового фонда *
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPrizePlace}
                        disabled={prizeInputs.length >= 10}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Добавить место
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {prizeInputs.map((prize, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-12 h-10 rounded bg-primary/10 flex items-center justify-center font-bold text-sm">
                            {getPlaceEmoji(prize.place)}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Сумма приза"
                            value={prize.amount || ''}
                            onChange={(e) => updatePrizeAmount(index, e.target.value)}
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground w-8">₽</span>
                          {prizeInputs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePrizePlace(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-sm font-medium">Итого призовой фонд:</span>
                      <span className="text-lg font-bold text-gaming-success">
                        {getTotalPrizeDistribution().toLocaleString()} ₽
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entryFee">Взнос (₽)</Label>
                      <Input
                        id="entryFee"
                        type="number"
                        min="0"
                        placeholder="0 - бесплатно"
                        value={formData.entryFee}
                        onChange={(e) => setFormData({ ...formData, entryFee: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxParticipants">
                        Макс. команд
                        {formData.teamMode !== 'solo' && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (для {formData.teamMode === 'duo' ? '2' : formData.teamMode === 'trio' ? '3' : '4'} игроков в команде)
                          </span>
                        )}
                      </Label>
                      <Input
                        id="maxParticipants"
                        type="number"
                        min="1"
                        placeholder="Без ограничений"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.teamMode === 'solo'
                          ? 'Укажите максимальное количество игроков (например, 100)'
                          : `Укажите максимальное количество команд (например, для 100 игроков: ${
                              formData.teamMode === 'duo' ? '50 команд' :
                              formData.teamMode === 'trio' ? '33 команды' :
                              '25 команд'
                            })`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamMode">Режим команды</Label>
                    <Select value={formData.teamMode} onValueChange={(value: 'solo' | 'duo' | 'trio' | 'squad') => setFormData({ ...formData, teamMode: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Solo (1 игрок)</SelectItem>
                        <SelectItem value="duo">Duo (2 игрока)</SelectItem>
                        <SelectItem value="trio">Trio (3 игрока)</SelectItem>
                        <SelectItem value="squad">Squad (4 игрока)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.teamMode === 'solo'
                        ? 'Игроки участвуют индивидуально'
                        : `Игроки формируют команды по ${formData.teamMode === 'duo' ? '2' : formData.teamMode === 'trio' ? '3' : '4'} человека`}
                    </p>
                  </div>

                  {/* Invite Only Mode */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.isInviteOnly}
                        onCheckedChange={(checked) =>
                          setFormData({...formData, isInviteOnly: checked as boolean})
                        }
                        id="isInviteOnly"
                      />
                      <Label htmlFor="isInviteOnly" className="cursor-pointer">
                        Только по приглашению
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Если включено, игроки смогут присоединиться к турниру только через приглашение от администратора
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="templateMap">Шаблон карты (опционально)</Label>
                    <Select
                      value={formData.templateMapId || 'empty'}
                      onValueChange={(value) => {
                        console.log('📝 Template map selected:', value);
                        setFormData({ ...formData, templateMapId: value === 'empty' ? '' : value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Создать пустую карту" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="empty">Создать пустую карту</SelectItem>
                        {availableMaps.map((map) => {
                          console.log('🗺️ Rendering map option:', map);
                          return (
                            <SelectItem key={map.id} value={map.id}>
                              {map.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Выберите существующую карту для копирования локаций или создайте пустую
                      {availableMaps.length > 0 && ` (Доступно карт: ${availableMaps.length})`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rules">Правила турнира</Label>
                    <Textarea
                      id="rules"
                      placeholder="Подробные правила и условия участия"
                      value={formData.rules}
                      onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Изображение турнира</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG или WebP, макс. 5MB
                    </p>
                  </div>

                  {/* Discord Integration Section */}
                  <div className="space-y-4 border p-4 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Discord интеграция
                    </h4>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.autoCreateDiscordChannels}
                        onCheckedChange={(checked) =>
                          setFormData({...formData, autoCreateDiscordChannels: checked as boolean})
                        }
                        id="autoCreateDiscordChannels"
                      />
                      <Label htmlFor="autoCreateDiscordChannels" className="cursor-pointer">
                        Автоматически создать роль и каналы в Discord
                      </Label>
                    </div>

                    {!formData.autoCreateDiscordChannels && (
                      <div className="space-y-2">
                        <Label htmlFor="discordRoleId">ID роли Discord (опционально)</Label>
                        <Input
                          id="discordRoleId"
                          value={formData.discordRoleId}
                          onChange={(e) => setFormData({...formData, discordRoleId: e.target.value})}
                          placeholder="Введите ID существующей роли"
                        />
                        <p className="text-xs text-muted-foreground">
                          Если указана, участникам будет автоматически выдаваться эта роль
                        </p>
                      </div>
                    )}

                    {formData.autoCreateDiscordChannels && (
                      <div className="bg-muted/50 p-3 rounded text-sm">
                        <p className="font-medium mb-2">Будут созданы:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Роль "Турнир - {formData.name || 'Название турнира'}"</li>
                          <li>• Категория "🏆 {formData.name || 'Название турнира'}"</li>
                          <li>• Канал "📋-информация" (только чтение)</li>
                          <li>• Канал "💬-чат" (участники могут писать)</li>
                          <li>• Канал "🔐-пароль" (только для админов)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleCreateTournament}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    {actionLoading ? 'Создание...' : 'Создать турнир'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Турниры не найдены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Турнир</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Участники</TableHead>
                  <TableHead>Призы</TableHead>
                  <TableHead>Регистрация</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tournament.name}</div>
                        {tournament.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {tournament.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tournament.status}
                        onValueChange={(value) => handleUpdateStatus(tournament.id, value)}
                        disabled={actionLoading}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Скоро</SelectItem>
                          <SelectItem value="registration_open">Регистрация открыта</SelectItem>
                          <SelectItem value="registration_closed">Регистрация закрыта</SelectItem>
                          <SelectItem value="in_progress">Идёт</SelectItem>
                          <SelectItem value="completed">Завершён</SelectItem>
                          <SelectItem value="cancelled">Отменён</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {tournament.currentParticipants}
                          {tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {tournament.prizeDistribution ? (
                          <>
                            <div className="text-xs text-muted-foreground">Распределение:</div>
                            {formatPrizeDistribution(tournament.prizeDistribution).slice(0, 3).map(({ place, amount }) => (
                              <div key={place} className="flex items-center gap-1 text-xs">
                                <span>{getPlaceEmoji(place)}</span>
                                <span className="text-gaming-success font-medium">
                                  {amount.toLocaleString()} ₽
                                </span>
                              </div>
                            ))}
                            {Object.keys(tournament.prizeDistribution).length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{Object.keys(tournament.prizeDistribution).length - 3} мест
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-sm">
                            <Trophy className="h-3 w-3 text-gaming-warning" />
                            <span className="text-gaming-success font-medium">
                              {tournament.prize.toLocaleString()} ₽
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm">
                          <Coins className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {tournament.entryFee === 0 ? 'Бесплатно' : `${tournament.entryFee.toLocaleString()} ₽`}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={tournament.registrationOpen ? "default" : "secondary"}
                          className={tournament.registrationOpen ? "bg-green-600" : ""}
                        >
                          {tournament.registrationOpen ? "Открыта" : "Закрыта"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRegistration(tournament.id)}
                          title={tournament.registrationOpen ? "Закрыть регистрацию" : "Открыть регистрацию"}
                          disabled={actionLoading}
                          className={tournament.registrationOpen ? "border-red-500 text-red-500" : "border-green-500 text-green-500"}
                        >
                          {tournament.registrationOpen ? "Закрыть" : "Открыть"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddPlayersDialog(tournament)}
                          title="Добавить игроков"
                          className="border-green-500 text-green-500"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenLinkDropMapDialog(tournament)}
                          title={tournament.dropMapId ? "Сменить карту" : "Привязать карту"}
                          className={tournament.dropMapId ? "" : "border-blue-500 text-blue-500"}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPrizeDialog(tournament)}
                          title="Выдать призы"
                        >
                          <Gift className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/tournament/${tournament.id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTournament(tournament.id)}
                          disabled={actionLoading}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Prize Distribution Dialog */}
      <Dialog open={showPrizeDialog} onOpenChange={setShowPrizeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Распределение призов</DialogTitle>
            <DialogDescription>
              {selectedTournament?.name}
              {selectedTournament && (
                <div className="mt-2 text-sm">
                  Призовой фонд: <span className="font-bold text-gaming-success">{selectedTournament.prize.toLocaleString()} ₽</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : tournamentParticipants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Нет участников в турнире</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {tournamentParticipants.map((participant, index) => (
                    <div key={participant.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{participant.user.displayName}</div>
                        {participant.teamName && (
                          <div className="text-sm text-muted-foreground">
                            Команда: {participant.teamName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-32"
                          value={prizeDistribution[participant.userId] || ''}
                          onChange={(e) => setPrizeDistribution({
                            ...prizeDistribution,
                            [participant.userId]: parseInt(e.target.value) || 0
                          })}
                        />
                        <span className="text-sm text-muted-foreground">₽</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Итого к выдаче:</span>
                    <span className={getTotalPrizeDistributionForDialog() > (selectedTournament?.prize || 0) ? 'text-destructive' : 'text-gaming-success'}>
                      {getTotalPrizeDistributionForDialog().toLocaleString()} ₽
                    </span>
                  </div>
                  {getTotalPrizeDistributionForDialog() > (selectedTournament?.prize || 0) && (
                    <p className="text-sm text-destructive mt-2">
                      Сумма призов превышает призовой фонд турнира
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowPrizeDialog(false);
                setPrizeDistribution({});
                setSelectedTournament(null);
              }}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleDistributePrizes}
              disabled={actionLoading || loadingParticipants || getTotalPrizeDistributionForDialog() === 0}
              className="flex-1"
            >
              {actionLoading ? 'Выдача...' : 'Выдать призы'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link DropMap Dialog */}
      <Dialog open={showLinkDropMapDialog} onOpenChange={setShowLinkDropMapDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Привязать карту к турниру</DialogTitle>
            <DialogDescription>
              {selectedTournament?.name}
              {selectedTournament?.dropMapId && (
                <div className="mt-2 text-sm">
                  <Badge variant="outline">Текущая карта: {selectedTournament.dropMapId}</Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dropMapId">ID карты (Drop Map)</Label>
              <Input
                id="dropMapId"
                placeholder="Введите UUID карты"
                value={dropMapIdInput}
                onChange={(e) => setDropMapIdInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Найдите ID карты в разделе "Дропмапы" (Admin panel)
              </p>
            </div>

            {selectedTournament?.dropMapId && (
              <div className="bg-muted/50 p-3 rounded text-sm">
                <p className="font-medium mb-1">⚠️ Внимание</p>
                <p className="text-muted-foreground">
                  Замена карты изменит привязку для всех участников турнира
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDropMapDialog(false);
                setDropMapIdInput('');
                setSelectedTournament(null);
              }}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleLinkDropMap}
              disabled={actionLoading || !dropMapIdInput.trim()}
              className="flex-1"
            >
              {actionLoading ? 'Привязка...' : 'Привязать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Players Dialog */}
      <Dialog open={showAddPlayersDialog} onOpenChange={setShowAddPlayersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить игроков на турнир</DialogTitle>
            <DialogDescription>
              {selectedTournament?.name}
              {selectedTournament?.teamMode !== 'solo' && (
                <span className="block mt-1 text-xs">
                  Режим: {selectedTournament?.teamMode === 'duo' ? 'Дуо (2 игрока)' : selectedTournament?.teamMode === 'trio' ? 'Трио (3 игрока)' : 'Сквад (4 игрока)'}
                  {' '}- игроки будут добавлены как капитаны команд и смогут приглашать тиммейтов
                </span>
              )}
            </DialogDescription>
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

            {selectedUserIds.length > 0 && (
              <div className="flex items-center justify-between bg-primary/10 p-2 rounded">
                <span className="text-sm font-medium">Выбрано: {selectedUserIds.length}</span>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds([])}>
                  Очистить
                </Button>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto border rounded p-2">
              {loadingUsers ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm">Загрузка пользователей...</p>
                </div>
              ) : filteredUsersForAdd.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ничего не найдено</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsersForAdd.map(u => {
                    const isSelected = selectedUserIds.includes(u.id);
                    const isAlreadyInTournament = tournamentParticipants.some(p => p.userId === u.id);

                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                          isAlreadyInTournament
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-muted'
                        } ${isSelected && !isAlreadyInTournament ? 'bg-primary/10' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAlreadyInTournament}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, u.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                            }
                          }}
                          className="cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{u.displayName}</div>
                          <div className="text-xs text-muted-foreground">@{u.username}</div>
                        </div>
                        {isAlreadyInTournament && (
                          <Badge variant="secondary" className="text-xs">
                            Уже в турнире
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
                disabled={selectedUserIds.length === 0 || actionLoading}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                {actionLoading ? 'Добавление...' : `Добавить (${selectedUserIds.length})`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddPlayersDialog(false);
                  setPlayerSearchQuery('');
                  setSelectedUserIds([]);
                }}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}