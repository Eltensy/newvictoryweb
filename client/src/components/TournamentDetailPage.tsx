// client/src/components/TournamentDetailPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Users, Coins, MapPin, ArrowLeft, CheckCircle2, AlertCircle, Loader2, UserCheck, Shield, Target, ChevronDown, ChevronUp, Crown, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'wouter';
import { TournamentTeamManager } from './TournamentTeamManager';
import { TeamInvitesPopup } from './TeamInvitesPopup';
import type { TournamentWithDetails } from '@/types/tournament';

interface TournamentDetail extends TournamentWithDetails {
  prizeDistribution?: Record<string, number>;
}

interface TeamMember {
  id: string;
  userId: string;
  status: 'pending' | 'accepted';
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface TournamentTeam {
  id: string;
  name: string;
  leaderId: string;
  members: TeamMember[];
  leader: {
    id: string;
    username: string;
    displayName: string;
  };
}

function TournamentDetailPage() {
  const { id } = useParams();
  const { getAuthToken, user, isLoggedIn, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [discordLinked, setDiscordLinked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [showTeamInvitesPopup, setShowTeamInvitesPopup] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedGiftRecipient, setSelectedGiftRecipient] = useState('');
  const [giftSearch, setGiftSearch] = useState('');

  useEffect(() => {
    if (id) {
      fetchTournament();
      fetchTeams();
      if (isLoggedIn) {
        checkDiscordStatus();
      }
    }
  }, [id, isLoggedIn]);

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
      console.log('📥 Tournament data received:', {
        id: data.id,
        isUserRegistered: data.isUserRegistered,
        userRegistration: data.userRegistration
      });
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

  const checkDiscordStatus = async () => {
    try {
      const response = await fetch(`/api/tournament/${id}/discord-status`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDiscordLinked(data.hasDiscord);
      }
    } catch (error) {
      console.error('Check Discord status error:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/tournament/${id}/teams`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Fetch teams error:', error);
    }
  };

  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
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
        body: JSON.stringify({}),
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
      // Обновляем данные турнира, команды и профиль пользователя (для обновления баланса)
      await Promise.all([
        fetchTournament(),
        fetchTeams(),
        refreshProfile()
      ]);
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

      // Обновляем данные турнира, команды и профиль пользователя (для обновления баланса)
      console.log('🔄 Refreshing tournament data after cancellation...');
      await Promise.all([
        fetchTournament(),
        fetchTeams(),
        refreshProfile()
      ]);
      console.log('✅ Tournament data refreshed');
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

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users/search?query=', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      } else {
        console.error('Failed to fetch users:', response.status);
        setAllUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleGiftRegistration = async () => {
    if (!selectedGiftRecipient || !tournament) return;

    setRegistering(true);
    try {
      const response = await fetch(`/api/tournament/${tournament.id}/gift-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ recipientId: selectedGiftRecipient }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to gift registration');
      }

      const data = await response.json();

      toast({
        title: 'Успешно!',
        description: data.message,
      });

      setShowGiftDialog(false);
      setSelectedGiftRecipient('');
      setGiftSearch('');

      // Обновляем данные
      await Promise.all([
        fetchTournament(),
        fetchTeams(),
        refreshProfile()
      ]);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось подарить регистрацию',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  const canRegister = () => {
    if (!tournament || !isLoggedIn) return false;
    if (tournament.isUserRegistered) return false;
    if (!tournament.registrationOpen) return false;
    if (tournament.status !== 'registration_open' && tournament.status !== 'upcoming') return false;
    if (tournament.maxParticipants && tournament.currentParticipants >= tournament.maxParticipants) return false;
    if (tournament.entryFee > 0 && user && user.balance < tournament.entryFee) return false;

    return true;
  };

  const canCancelRegistration = () => {
    if (!tournament || !tournament.isUserRegistered) return false;
    return tournament.status !== 'in_progress' && tournament.status !== 'completed';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration_open':
        return <Badge className="bg-green-600 text-white border-0">Регистрация открыта</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500 text-white border-0">Скоро</Badge>;
      case 'registration_closed':
        return <Badge className="bg-gray-600 text-white border-0">Регистрация закрыта</Badge>;
      case 'in_progress':
        return <Badge className="bg-orange-500 text-white border-0">Идёт</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500 text-white border-0">Завершён</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTeamModeText = (mode: string) => {
    switch (mode) {
      case 'solo': return 'Соло';
      case 'duo': return 'Дуо';
      case 'trio': return 'Трио';
      case 'squad': return 'Отряд';
      default: return mode;
    }
  };

  const formatPrizeDistribution = (distribution?: Record<string, number>) => {
    if (!distribution) return [];
    return Object.entries(distribution)
      .map(([place, amount]) => ({ place: parseInt(place), amount }))
      .sort((a, b) => a.place - b.place);
  };

  const getPlaceIcon = (place: number) => {
    switch(place) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${place}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <Card className="backdrop-blur-sm bg-background/50">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
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
            <Card className="backdrop-blur-md bg-background/80 border-primary/10">
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
                  {getStatusBadge(tournament.status)}
                </div>
              </CardHeader>
            </Card>

            {/* Prize Distribution */}
            {tournament.prizeDistribution && Object.keys(tournament.prizeDistribution).length > 0 && (
              <Card className="backdrop-blur-md bg-background/80 border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Призовой фонд
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {formatPrizeDistribution(tournament.prizeDistribution).map(({ place, amount }) => (
                      <div
                        key={place}
                        className="backdrop-blur-sm bg-background/50 border border-primary/10 rounded-lg p-4 hover:bg-background/70 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{getPlaceIcon(place)}</span>
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">
                              {place} место
                            </div>
                            <div className="text-xl font-bold text-green-500">
                              {amount.toLocaleString()} ₽
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tournament Details */}
            <Card className="backdrop-blur-md bg-background/80 border-primary/10">
              <CardHeader>
                <CardTitle>Информация о турнире</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 backdrop-blur-sm bg-background/50 rounded-lg border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 backdrop-blur-sm flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Призовой фонд</div>
                      <div className="font-bold text-green-500">
                        {tournament.prize.toLocaleString()} ₽
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 backdrop-blur-sm bg-background/50 rounded-lg border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 backdrop-blur-sm flex items-center justify-center">
                      <Coins className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Взнос</div>
                      <div className="font-bold">
                        {tournament.entryFee === 0 ? 'Бесплатно' : `${tournament.entryFee.toLocaleString()} ₽`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 backdrop-blur-sm bg-background/50 rounded-lg border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 backdrop-blur-sm flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Участники</div>
                      <div className="font-bold">
                        {tournament.currentParticipants}
                        {tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 backdrop-blur-sm bg-background/50 rounded-lg border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 backdrop-blur-sm flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Режим</div>
                      <div className="font-bold">{getTeamModeText(tournament.teamMode)}</div>
                    </div>
                  </div>
                </div>

                {tournament.mapUrl && (
                  <div className="pt-4 border-t border-primary/10">
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
              <Card className="backdrop-blur-md bg-background/80 border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    Правила турнира
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap">
                    {tournament.rules}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <Card className="backdrop-blur-md bg-background/80 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  {tournament.teamMode === 'solo'
                    ? `Участники (${tournament.registrations.length})`
                    : `Команды (${teams.length})`
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournament.teamMode === 'solo' ? (
                  // Solo mode - show individual participants
                  tournament.registrations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Пока нет зарегистрированных участников
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tournament.registrations.map((reg, index) => (
                        <div
                          key={reg.id}
                          className="flex items-center gap-3 p-3 backdrop-blur-sm bg-background/50 border border-primary/10 rounded-lg hover:bg-background/70 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center font-bold text-primary text-sm">
                            {index + 1}
                          </div>
                          <div className="font-medium">{reg.user.displayName}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Team mode - show teams with expandable member lists
                  teams.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Пока нет зарегистрированных команд
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teams.map((team, index) => {
                        const isExpanded = expandedTeams.has(team.id);
                        return (
                          <div
                            key={team.id}
                            className="backdrop-blur-sm bg-background/50 border border-primary/10 rounded-lg overflow-hidden"
                          >
                            {/* Team Header - Always visible */}
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-background/70 transition-colors"
                              onClick={() => toggleTeamExpansion(team.id)}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center font-bold text-primary text-sm">
                                  {index + 1}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                  <div>
                                    <div className="font-medium">{team.leader.displayName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {team.members.length} {team.members.length === 1 ? 'участник' : 'участника'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {team.name}
                                </Badge>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Team Members - Expandable */}
                            {isExpanded && team.members.length > 0 && (
                              <div className="border-t border-primary/10 bg-background/30 p-3">
                                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                  Состав команды:
                                </div>
                                <div className="space-y-1">
                                  {team.members.map((member) => (
                                    <div
                                      key={member.id}
                                      className="flex items-center gap-2 p-2 rounded hover:bg-background/50 transition-colors"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm flex items-center justify-center">
                                        <Users className="h-3 w-3 text-blue-500" />
                                      </div>
                                      <span className="text-sm">
                                        {member.user.displayName}
                                        {member.status === 'pending' && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            (Ожидает подтверждения)
                                          </span>
                                        )}
                                      </span>
                                      {member.userId === team.leaderId && (
                                        <Crown className="h-3 w-3 text-yellow-500 ml-auto" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Discord Warning */}
            {isLoggedIn && discordLinked === false && (
              <Card className="backdrop-blur-md bg-[#5865F2]/10 border-[#5865F2]/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[#5865F2] flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[#5865F2]">
                        Discord не привязан
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Для участия в турнире необходимо привязать Discord аккаунт.
                        После регистрации вам будет автоматически выдана роль турнира.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10"
                        onClick={() => window.location.href = '/profile'}
                      >
                        Привязать Discord
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Registration Card */}
            <Card className="backdrop-blur-md bg-background/80 border-primary/10">
              <CardHeader>
                <CardTitle>Регистрация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="pt-2">
                    {tournament.registrationOpen ? (
                      <Badge className="bg-green-600 text-white w-full justify-center border-0">
                        Регистрация открыта
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="w-full justify-center">
                        Регистрация закрыта
                      </Badge>
                    )}
                  </div>
                </div>

                {isLoggedIn && user && tournament.entryFee > 0 && (
                  <div className="pt-4 border-t border-primary/10">
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
                  <div className="space-y-3 pt-4 border-t border-primary/10">
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Вы зарегистрированы</span>
                    </div>
                    {canCancelRegistration() && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                          onClick={handleCancelRegistration}
                          disabled={cancelling}
                        >
                          {cancelling ? 'Отмена...' : 'Отменить регистрацию'}
                        </Button>
                        <Dialog open={showGiftDialog} onOpenChange={(open) => { setShowGiftDialog(open); if (open) fetchAllUsers(); }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="px-4"
                              title="Подарить регистрацию другому игроку"
                            >
                              <Gift className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md backdrop-blur-md bg-background/95">
                            <DialogHeader>
                              <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
                                <Gift className="h-5 w-5 text-primary" />
                                Подарить регистрацию
                              </DialogTitle>
                              <DialogDescription className="text-center">
                                Оплатите участие в турнире для другого игрока
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                              {tournament.entryFee > 0 && user && (
                                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Стоимость:</span>
                                    <span className="font-bold text-lg text-primary">{tournament.entryFee.toLocaleString()} ₽</span>
                                  </div>
                                  <div className="pt-3 border-t border-border/50">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">Ваш баланс:</span>
                                      <span className={`font-semibold ${user.balance >= tournament.entryFee ? 'text-green-500' : 'text-destructive'}`}>
                                        {user.balance.toLocaleString()} ₽
                                      </span>
                                    </div>
                                    {user.balance < tournament.entryFee && (
                                      <div className="mt-2 bg-destructive/10 border border-destructive/20 rounded p-2 text-xs text-destructive">
                                        Недостаточно средств
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div>
                                <input
                                  type="text"
                                  placeholder="Поиск игрока..."
                                  value={giftSearch}
                                  onChange={(e) => setGiftSearch(e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>

                              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
                                {loadingUsers ? (
                                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                    <span className="text-sm">Загрузка игроков...</span>
                                  </div>
                                ) : allUsers.filter(u => u.id !== user?.id).length === 0 ? (
                                  <div className="text-center text-sm text-muted-foreground py-8">
                                    {giftSearch ? 'Игроки не найдены' : 'Нет доступных игроков'}
                                  </div>
                                ) : (
                                  allUsers
                                    .filter(u => u.id !== user?.id &&
                                      (u.displayName?.toLowerCase().includes(giftSearch.toLowerCase()) ||
                                       u.username?.toLowerCase().includes(giftSearch.toLowerCase())))
                                    .map(u => (
                                      <button
                                        key={u.id}
                                        onClick={() => setSelectedGiftRecipient(u.id)}
                                        className={`w-full p-3 text-left border rounded-md hover:bg-accent transition-colors ${
                                          selectedGiftRecipient === u.id ? 'bg-accent border-primary' : 'bg-background'
                                        }`}
                                      >
                                        <div className="font-medium">{u.displayName}</div>
                                        <div className="text-xs text-muted-foreground">@{u.username}</div>
                                      </button>
                                    ))
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    setShowGiftDialog(false);
                                    setSelectedGiftRecipient('');
                                    setGiftSearch('');
                                  }}
                                >
                                  Отмена
                                </Button>
                                <Button
                                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                  onClick={handleGiftRegistration}
                                  disabled={!selectedGiftRecipient || registering || (tournament.entryFee > 0 && user && user.balance < tournament.entryFee)}
                                >
                                  {registering ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Обработка...
                                    </>
                                  ) : (
                                    <>
                                      <Gift className="h-4 w-4 mr-2" />
                                      Подарить
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    {/* Map button for registered users */}
                    {tournament.dropMapId && (
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg"
                        onClick={() => window.location.href = `/dropmap/${tournament.dropMapId}`}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Открыть карту турнира
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
                      <DialogTrigger asChild>
                        <Button
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0"
                          disabled={!canRegister()}
                        >
                          {!isLoggedIn ? 'Войдите для регистрации' : 'Зарегистрироваться'}
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="sm:max-w-md backdrop-blur-md bg-background/95">
                      <DialogHeader>
                        <DialogTitle className="text-center text-xl">
                          Регистрация на турнир
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          Подтвердите участие в турнире
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-6">
                        <div className="text-center space-y-2">
                          <h3 className="font-semibold text-lg">{tournament.name}</h3>
                          {tournament.teamMode !== 'solo' && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span className="capitalize">{getTeamModeText(tournament.teamMode)}</span>
                            </div>
                          )}
                        </div>

                        {tournament.entryFee > 0 ? (
                          <div className="backdrop-blur-sm bg-muted/30 rounded-lg p-4 space-y-3 border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Взнос за участие:</span>
                              <span className="font-bold text-lg flex items-center gap-1">
                                <Coins className="w-5 h-5 text-yellow-500" />
                                {tournament.entryFee} ₽
                              </span>
                            </div>
                            {user && (
                              <div className="pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Ваш баланс:</span>
                                  <span className="font-semibold">{user.balance.toLocaleString()} ₽</span>
                                </div>
                                {user.balance < tournament.entryFee && (
                                  <p className="text-xs text-destructive mt-2 text-center">
                                    ⚠️ Недостаточно средств
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center backdrop-blur-sm">
                            <p className="text-sm text-green-600 font-medium">
                              ✓ Участие бесплатное
                            </p>
                          </div>
                        )}
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
                          disabled={registering || (tournament.entryFee > 0 && user ? user.balance < tournament.entryFee : false)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          {registering ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Регистрация...
                            </>
                          ) : (
                            'Подтвердить'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Gift Registration Dialog */}
                  <Dialog open={showGiftDialog} onOpenChange={(open) => { setShowGiftDialog(open); if (open) fetchAllUsers(); }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="px-4"
                        disabled={!isLoggedIn || !canRegister()}
                        title="Подарить регистрацию другому игроку"
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md backdrop-blur-md bg-background/95">
                      <DialogHeader>
                        <DialogTitle className="text-center text-xl">
                          Подарить регистрацию
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          Выберите игрока, которому хотите подарить участие в турнире
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        {tournament.entryFee > 0 && user && (
                          <div className="backdrop-blur-sm bg-muted/30 rounded-lg p-4 space-y-3 border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Стоимость подарка:</span>
                              <span className="font-bold text-lg flex items-center gap-1">
                                <Coins className="w-5 h-5 text-yellow-500" />
                                {tournament.entryFee} ₽
                              </span>
                            </div>
                            <div className="pt-3 border-t border-border/50">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Ваш баланс:</span>
                                <span className={`font-semibold ${user.balance >= tournament.entryFee ? 'text-green-500' : 'text-destructive'}`}>
                                  {user.balance.toLocaleString()} ₽
                                </span>
                              </div>
                              {user.balance < tournament.entryFee && (
                                <div className="mt-2 bg-destructive/10 border border-destructive/20 rounded p-2 text-xs text-destructive">
                                  Недостаточно средств
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <input
                            type="text"
                            placeholder="Поиск игрока..."
                            value={giftSearch}
                            onChange={(e) => setGiftSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
                          {loadingUsers ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                              <Loader2 className="h-6 w-6 animate-spin mb-2" />
                              <span className="text-sm">Загрузка игроков...</span>
                            </div>
                          ) : allUsers.filter(u => u.id !== user?.id).length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              {giftSearch ? 'Игроки не найдены' : 'Нет доступных игроков'}
                            </div>
                          ) : (
                            allUsers
                              .filter(u => u.id !== user?.id &&
                                (u.displayName?.toLowerCase().includes(giftSearch.toLowerCase()) ||
                                 u.username?.toLowerCase().includes(giftSearch.toLowerCase())))
                              .map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => setSelectedGiftRecipient(u.id)}
                                  className={`w-full p-3 text-left border rounded-md hover:bg-accent transition-colors ${
                                    selectedGiftRecipient === u.id ? 'bg-accent border-primary' : 'bg-background'
                                  }`}
                                >
                                  <div className="font-medium">{u.displayName}</div>
                                  <div className="text-xs text-muted-foreground">@{u.username}</div>
                                </button>
                              ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowGiftDialog(false)}
                            className="flex-1"
                          >
                            Отмена
                          </Button>
                          <Button
                            onClick={handleGiftRegistration}
                            disabled={!selectedGiftRecipient || registering || (tournament.entryFee > 0 && user ? user.balance < tournament.entryFee : false)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            {registering ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Подарок...
                              </>
                            ) : (
                              <>
                                <Gift className="h-4 w-4 mr-2" />
                                Подарить
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Management */}
            {tournament.teamMode !== 'solo' && isLoggedIn && tournament.isUserRegistered && (
              <TournamentTeamManager
                tournament={tournament}
                onTeamCreated={() => {
                  fetchTournament();
                  fetchTeams();
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Team Invites Popup */}
      <TeamInvitesPopup
        open={showTeamInvitesPopup}
        onOpenChange={setShowTeamInvitesPopup}
        onInviteResponded={() => fetchTournament()}
      />
    </div>
  );
}

export default TournamentDetailPage;
