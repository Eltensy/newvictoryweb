// client/src/components/AdminTournamentsTab.tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Plus, Edit, Trash2, Users, Calendar, Coins, Eye, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  prize: number;
  entryFee: number;
  startDate: string;
  endDate: string | null;
  maxParticipants: number | null;
  currentParticipants: number;
  status: string;
  imageUrl: string | null;
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
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tournamentParticipants, setTournamentParticipants] = useState<TournamentRegistration[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Prize distribution state
  const [prizeDistribution, setPrizeDistribution] = useState<Record<string, number>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mapUrl: '',
    rules: '',
    prize: 0,
    entryFee: 0,
    registrationStartDate: '',
    registrationEndDate: '',
    startDate: '',
    endDate: '',
    maxParticipants: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mapUrl: '',
      rules: '',
      prize: 0,
      entryFee: 0,
      registrationStartDate: '',
      registrationEndDate: '',
      startDate: '',
      endDate: '',
      maxParticipants: '',
    });
    setImageFile(null);
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
    if (!formData.name || !formData.startDate || !formData.registrationStartDate || !formData.registrationEndDate) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.mapUrl) formDataToSend.append('mapUrl', formData.mapUrl);
      if (formData.rules) formDataToSend.append('rules', formData.rules);
      formDataToSend.append('prize', formData.prize.toString());
      formDataToSend.append('entryFee', formData.entryFee.toString());
      formDataToSend.append('registrationStartDate', new Date(formData.registrationStartDate).toISOString());
      formDataToSend.append('registrationEndDate', new Date(formData.registrationEndDate).toISOString());
      formDataToSend.append('startDate', new Date(formData.startDate).toISOString());
      if (formData.endDate) formDataToSend.append('endDate', new Date(formData.endDate).toISOString());
      if (formData.maxParticipants) formDataToSend.append('maxParticipants', formData.maxParticipants);
      if (imageFile) formDataToSend.append('image', imageFile);

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

  const getTotalPrizeDistribution = () => {
    return Object.values(prizeDistribution).reduce((sum, amount) => sum + (amount || 0), 0);
  };

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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prize">Призовой фонд (₽) *</Label>
                      <Input
                        id="prize"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.prize}
                        onChange={(e) => setFormData({ ...formData, prize: parseInt(e.target.value) || 0 })}
                      />
                    </div>

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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">Макс. участников</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="1"
                      placeholder="Без ограничений"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registrationStartDate">Начало регистрации *</Label>
                      <Input
                        id="registrationStartDate"
                        type="datetime-local"
                        value={formData.registrationStartDate}
                        onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registrationEndDate">Конец регистрации *</Label>
                      <Input
                        id="registrationEndDate"
                        type="datetime-local"
                        value={formData.registrationEndDate}
                        onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Начало турнира *</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Конец турнира</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mapUrl">Ссылка на карту турнира</Label>
                    <Input
                      id="mapUrl"
                      type="url"
                      placeholder="https://..."
                      value={formData.mapUrl}
                      onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                    />
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
                  <TableHead>Даты</TableHead>
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
                        <div className="flex items-center gap-1 text-sm">
                          <Trophy className="h-3 w-3 text-gaming-warning" />
                          <span className="text-gaming-success font-medium">
                            {tournament.prize.toLocaleString()} ₽
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Coins className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {tournament.entryFee === 0 ? 'Бесплатно' : `${tournament.entryFee.toLocaleString()} ₽`}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(tournament.startDate).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                    <span className={getTotalPrizeDistribution() > (selectedTournament?.prize || 0) ? 'text-destructive' : 'text-gaming-success'}>
                      {getTotalPrizeDistribution().toLocaleString()} ₽
                    </span>
                  </div>
                  {getTotalPrizeDistribution() > (selectedTournament?.prize || 0) && (
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
              disabled={actionLoading || loadingParticipants || getTotalPrizeDistribution() === 0}
              className="flex-1"
            >
              {actionLoading ? 'Выдача...' : 'Выдать призы'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}