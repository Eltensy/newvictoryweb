// client/src/components/TournamentDetailPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Calendar, Users, Coins, MapPin, Clock, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'wouter';

interface TournamentDetail {
  id: string;
  name: string;
  description: string | null;
  mapUrl: string | null;
  rules: string | null;
  prize: number;
  entryFee: number;
  registrationStartDate: string;
  registrationEndDate: string;
  startDate: string;
  endDate: string | null;
  maxParticipants: number | null;
  currentParticipants: number;
  status: string;
  imageUrl: string | null;
  isUserRegistered: boolean;
  userRegistration?: any;
  creator: {
    username: string;
    displayName: string;
  };
  registrations: Array<{
    id: string;
    userId: string;
    status: string;
    teamName: string | null;
    user: {
      username: string;
      displayName: string;
    };
  }>;
}

export default function TournamentDetailPage() {
  const { id } = useParams();
  const { getAuthToken, user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournament();
    }
  }, [id]);

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/tournament/${id}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch tournament');
      
      const data = await response.json();
      setTournament(data);
    } catch (error) {
      console.error('Fetch tournament error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить турнир',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isLoggedIn) {
      toast({
        title: 'Требуется авторизация',
        description: 'Войдите в систему для регистрации на турнир',
        variant: 'destructive',
      });
      return;
    }

    if (!tournament) return;

    setRegistering(true);
    try {
      const response = await fetch(`/api/tournament/${tournament.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          teamName: teamName || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register');
      }

      toast({
        title: 'Успешно!',
        description: 'Вы зарегистрированы на турнир',
      });

      setShowRegistrationDialog(false);
      setTeamName('');
      await fetchTournament();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось зарегистрироваться',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!tournament) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/tournament/${tournament.id}/register`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel registration');
      }

      const data = await response.json();
      
      toast({
        title: 'Регистрация отменена',
        description: data.refundAmount > 0 
          ? `Вам возвращено ${data.refundAmount} ₽`
          : 'Ваша регистрация отменена',
      });

      await fetchTournament();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отменить регистрацию',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const canRegister = () => {
    if (!tournament || !isLoggedIn) return false;
    if (tournament.isUserRegistered) return false;
    if (tournament.status !== 'registration_open' && tournament.status !== 'upcoming') return false;
    
    const now = new Date();
    const regStart = new Date(tournament.registrationStartDate);
    const regEnd = new Date(tournament.registrationEndDate);
    
    if (now < regStart || now > regEnd) return false;
    if (tournament.maxParticipants && tournament.currentParticipants >= tournament.maxParticipants) return false;
    if (tournament.entryFee > 0 && user && user.balance < tournament.entryFee) return false;
    
    return true;
  };

  const canCancelRegistration = () => {
    if (!tournament || !tournament.isUserRegistered) return false;
    return tournament.status !== 'in_progress' && tournament.status !== 'completed';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration_open':
        return 'bg-gaming-success text-white';
      case 'upcoming':
        return 'bg-blue-500 text-white';
      case 'registration_closed':
        return 'bg-gaming-warning text-black';
      case 'in_progress':
        return 'bg-gaming-secondary text-white';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'registration_open':
        return 'Регистрация открыта';
      case 'upcoming':
        return 'Скоро';
      case 'registration_closed':
        return 'Регистрация закрыта';
      case 'in_progress':
        return 'Идёт';
      case 'completed':
        return 'Завершён';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <p className="text-lg font-medium mb-2">Турнир не найден</p>
              <Button onClick={() => window.location.href = '/tournaments'} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Вернуться к турнирам
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => window.location.href = '/tournaments'}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к турнирам
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tournament Header */}
            <Card>
              {tournament.imageUrl && (
                <div className="relative h-64 overflow-hidden rounded-t-lg">
                  <img 
                    src={tournament.imageUrl} 
                    alt={tournament.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className={getStatusColor(tournament.status)}>
                      {getStatusText(tournament.status)}
                    </Badge>
                  </div>
                  {tournament.isUserRegistered && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Вы зарегистрированы
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-gaming mb-2">
                      {tournament.name}
                    </CardTitle>
                    {tournament.description && (
                      <CardDescription className="text-base">
                        {tournament.description}
                      </CardDescription>
                    )}
                  </div>
                  {!tournament.imageUrl && (
                    <Badge className={getStatusColor(tournament.status)}>
                      {getStatusText(tournament.status)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Tournament Details */}
            <Card>
              <CardHeader>
                <CardTitle className="font-gaming">Информация о турнире</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Trophy className="h-5 w-5 text-gaming-warning" />
                    <div>
                      <div className="text-sm text-muted-foreground">Призовой фонд</div>
                      <div className="font-bold text-gaming-success">
                        {tournament.prize.toLocaleString()} ₽
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Coins className="h-5 w-5 text-gaming-warning" />
                    <div>
                      <div className="text-sm text-muted-foreground">Взнос</div>
                      <div className={`font-bold ${tournament.entryFee === 0 ? 'text-gaming-success' : ''}`}>
                        {tournament.entryFee === 0 ? 'Бесплатно' : `${tournament.entryFee.toLocaleString()} ₽`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm text-muted-foreground">Участники</div>
                      <div className="font-bold">
                        {tournament.currentParticipants}
                        {tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm text-muted-foreground">Начало турнира</div>
                      <div className="font-medium text-sm">
                        {formatDate(tournament.startDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {tournament.mapUrl && (
                  <div className="pt-4 border-t">
                    <a 
                      href={tournament.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Открыть карту турнира</span>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rules */}
            {tournament.rules && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-gaming">Правила турнира</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-foreground">
                    {tournament.rules}
                    </div>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="font-gaming">
                  Участники ({tournament.registrations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournament.registrations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Пока нет зарегистрированных участников
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tournament.registrations.map((reg, index) => (
                      <div 
                        key={reg.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{reg.user.displayName}</div>
                            {reg.teamName && (
                              <div className="text-sm text-muted-foreground">
                                Команда: {reg.teamName}
                              </div>
                            )}
                          </div>
                        </div>
                        {reg.status === 'paid' && (
                          <Badge variant="outline" className="text-gaming-success border-gaming-success">
                            Оплачено
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-gaming">Регистрация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Начало регистрации:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(tournament.registrationStartDate)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Конец регистрации:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(tournament.registrationEndDate)}</span>
                  </div>
                </div>

                {isLoggedIn && user && tournament.entryFee > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Ваш баланс:</span>
                      <span className="font-bold">{user.balance.toLocaleString()} ₽</span>
                    </div>
                    {user.balance < tournament.entryFee && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded p-2 text-xs text-destructive">
                        Недостаточно средств для регистрации
                      </div>
                    )}
                  </div>
                )}

                {tournament.isUserRegistered ? (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2 text-gaming-success">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Вы зарегистрированы</span>
                    </div>
                    {canCancelRegistration() && (
                      <Button
                        variant="outline"
                        className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                        onClick={handleCancelRegistration}
                        disabled={cancelling}
                      >
                        {cancelling ? 'Отмена...' : 'Отменить регистрацию'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full"
                        disabled={!canRegister()}
                      >
                        {!isLoggedIn ? 'Войдите для регистрации' : 'Зарегистрироваться'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Регистрация на турнир</DialogTitle>
                        <DialogDescription>
                          {tournament.entryFee > 0 
                            ? `С вашего баланса будет списано ${tournament.entryFee} ₽`
                            : 'Заполните форму для регистрации'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="teamName">Название команды (необязательно)</Label>
                          <Input
                            id="teamName"
                            placeholder="Введите название команды"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowRegistrationDialog(false)}
                          className="flex-1"
                        >
                          Отмена
                        </Button>
                        <Button
                          onClick={handleRegister}
                          disabled={registering}
                          className="flex-1"
                        >
                          {registering ? 'Регистрация...' : 'Подтвердить'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Organizer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="font-gaming text-sm">Организатор</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">
                      {tournament.creator.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{tournament.creator.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      @{tournament.creator.username}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )};