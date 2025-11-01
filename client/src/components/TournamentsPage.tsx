// client/src/components/TournamentsPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Users, Coins, ChevronRight, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import EnhancedHeader from '@/components/Header';
import { TeamInvitesPopup } from './TeamInvitesPopup';

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
  isUserRegistered?: boolean;
  creator: {
    username: string;
    displayName: string;
  };
}

export default function TournamentsPage() {
  const { getAuthToken, user, isLoggedIn } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [showInvitesPopup, setShowInvitesPopup] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  useEffect(() => {
    fetchTournaments();
    if (isLoggedIn) {
      loadPendingInvites();
    }
  }, [isLoggedIn]);

  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/tournaments', { headers });
      if (!response.ok) throw new Error('Failed to fetch tournaments');
      
      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      console.error('Fetch tournaments error:', error);
      setError('Не удалось загрузить турниры');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvites = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/tournament/team/invites', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const invites = await response.json();
        setPendingInvitesCount(invites.filter((inv: any) => inv.status === 'pending').length);
      }
    } catch (error) {
      console.error('Error loading invites:', error);
    }
  };

  const handleRefreshUser = async () => {
    setIsRefreshing(true);
    try {
      // Refresh user logic here if needed
      await fetchTournaments();
      if (isLoggedIn) {
        await loadPendingInvites();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Требуется авторизация</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Войдите в систему, чтобы просматривать турниры
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader
          user={user}
          onPremiumClick={() => setIsPremiumModalOpen(true)}
          onBalanceClick={() => setIsBalanceModalOpen(true)}
          onProfileClick={() => setIsProfileOpen(true)}
          onRefreshUser={handleRefreshUser}
          isRefreshing={isRefreshing}
          authToken={getAuthToken() || undefined}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader
        user={user}
        onPremiumClick={() => setIsPremiumModalOpen(true)}
        onBalanceClick={() => setIsBalanceModalOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
        onRefreshUser={handleRefreshUser}
        isRefreshing={isRefreshing}
        authToken={getAuthToken() || undefined}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Team Invites Button */}
        {isLoggedIn && (
          <div className="mb-6 flex justify-end">
            <Button
              onClick={() => setShowInvitesPopup(true)}
              variant="outline"
              className="relative"
            >
              <Mail className="w-4 h-4 mr-2" />
              Приглашения в команды
              {pendingInvitesCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 px-2 py-0.5 text-xs"
                >
                  {pendingInvitesCount}
                </Badge>
              )}
            </Button>
          </div>
        )}

        {/* Tournaments Grid */}
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Нет активных турниров</p>
              <p className="text-sm text-muted-foreground">
                Новые турниры появятся скоро. Следите за обновлениями!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card 
                key={tournament.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/50 overflow-hidden group"
                onClick={() => window.location.href = `/tournament/${tournament.id}`}
              >
                {/* Tournament Image */}
                {tournament.imageUrl ? (
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={tournament.imageUrl} 
                      alt={tournament.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className={getStatusColor(tournament.status)}>
                        {getStatusText(tournament.status)}
                      </Badge>
                    </div>
                    {tournament.isUserRegistered && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-green-600 text-white">
                          Зарегистрирован
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-gaming-secondary/20 flex items-center justify-center">
                    <Trophy className="h-16 w-16 text-primary/50" />
                    <div className="absolute top-3 right-3">
                      <Badge className={getStatusColor(tournament.status)}>
                        {getStatusText(tournament.status)}
                      </Badge>
                    </div>
                    {tournament.isUserRegistered && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-green-600 text-white">
                          Зарегистрирован
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="font-gaming text-xl line-clamp-1">
                    {tournament.name}
                  </CardTitle>
                  {tournament.description && (
                    <CardDescription className="line-clamp-2">
                      {tournament.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Prize & Entry Fee */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gaming-warning" />
                      <span className="text-sm font-medium">Приз:</span>
                    </div>
                    <span className="font-bold text-gaming-success">
                      {tournament.prize.toLocaleString()} ₽
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-gaming-warning" />
                      <span className="text-sm font-medium">Взнос:</span>
                    </div>
                    <span className={`font-bold ${tournament.entryFee === 0 ? 'text-gaming-success' : ''}`}>
                      {tournament.entryFee === 0 ? 'Бесплатно' : `${tournament.entryFee.toLocaleString()} ₽`}
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Участники:</span>
                    </div>
                    <span className="font-medium">
                      {tournament.currentParticipants}
                      {tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ''}
                    </span>
                  </div>

                  {/* Registration Status */}
                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    {tournament.registrationOpen ? (
                      <Badge className="bg-green-600 text-white">Регистрация открыта</Badge>
                    ) : (
                      <Badge variant="secondary">Регистрация закрыта</Badge>
                    )}
                  </div>

                  {/* View Details Button */}
                  <Button 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    variant="outline"
                  >
                    Подробнее
                    <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Team Invites Popup */}
      <TeamInvitesPopup
        open={showInvitesPopup}
        onOpenChange={setShowInvitesPopup}
        onInviteResponded={() => {
          loadPendingInvites();
          fetchTournaments();
        }}
      />
    </div>
  );
}