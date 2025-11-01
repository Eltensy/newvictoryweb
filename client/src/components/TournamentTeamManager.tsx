import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, UserPlus, Check, X, Loader2, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TeamInvitesPopup } from './TeamInvitesPopup';
import type { Tournament } from '../types/tournament';

interface TeamMember {
  id: string;
  userId: string;
  status: 'pending' | 'accepted' | 'declined';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface Team {
  id: string;
  name: string;
  leaderId: string;
  status: string;
  members: TeamMember[];
  isLeader: boolean;
}

interface TournamentTeamManagerProps {
  tournament: Tournament;
  onTeamCreated?: () => void;
}

interface TeamInvitesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TournamentTeamManager({ tournament, onTeamCreated }: TournamentTeamManagerProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showInvitesManager, setShowInvitesManager] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const { toast } = useToast();

  const teamSizeMap = {
    solo: 1,
    duo: 2,
    trio: 3,
    squad: 4,
  };

  const maxTeamSize = teamSizeMap[tournament.teamMode];
  const currentMembers = team?.members || [];
  const acceptedMembers = team?.members.filter(m => m.status === 'accepted') || [];
  const currentSize = acceptedMembers.length;

  useEffect(() => {
    loadMyTeam();
  }, [tournament.id]);

  useEffect(() => {
    if (showInviteDialog) {
      loadUsers('');
    }
  }, [showInviteDialog]);

  // Dynamic search when user types
  useEffect(() => {
    if (showInviteDialog) {
      const timeoutId = setTimeout(() => {
        loadUsers(searchQuery);
      }, 300); // Debounce for 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, showInviteDialog]);

  const loadUsers = async (query: string) => {
    try {
      setSearchingUsers(true);
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Search users based on query
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const users = await response.json();
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const loadMyTeam = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No token found');
        return;
      }

      console.log('Loading team for tournament:', tournament.id);

      const response = await fetch(`/api/tournament/${tournament.id}/my-team`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized');
          return;
        }
        throw new Error('Failed to load team');
      }

      const data = await response.json();

      console.log('Team data received:', data);

      if (data) {
        console.log('Setting team data:', data);
        setTeam(data);
      } else {
        console.log('No team found');
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const invitePlayer = async () => {
    if (!team || !selectedUserId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      // Find selected user details
      const userToInvite = allUsers.find(u => u.id === selectedUserId);
      if (!userToInvite) {
        throw new Error('Пользователь не найден');
      }

      // Send invite
      const response = await fetch(`/api/tournament/team/${team.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: userToInvite.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось отправить приглашение');
      }

      toast({
        title: 'Приглашение отправлено',
        description: `Приглашение отправлено ${userToInvite.displayName || userToInvite.username}`,
      });

      setSelectedUserId(null);
      setSearchQuery('');
      setShowInviteDialog(false);

      // Reload team to show pending member
      await loadMyTeam();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveTeam = async () => {
    if (!team) return;

    if (!confirm('Вы уверены, что хотите покинуть команду?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/tournament/team/${team.id}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось покинуть команду');
      }

      toast({
        title: 'Вы покинули команду',
        description: 'Вы успешно покинули команду',
      });

      // Reload team data
      await loadMyTeam();
      onTeamCreated?.();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const kickPlayer = async (userId: string, displayName: string) => {
    if (!team) return;

    if (!confirm(`Вы уверены, что хотите исключить ${displayName} из команды?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/tournament/team/${team.id}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось исключить игрока');
      }

      toast({
        title: 'Игрок исключен',
        description: `${displayName} исключен из команды`,
      });

      // Reload team data
      await loadMyTeam();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelInvite = async (userId: string, displayName: string) => {
    if (!team) return;

    if (!confirm(`Вы уверены, что хотите отменить приглашение для ${displayName}?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/tournament/team/${team.id}/cancel-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось отменить приглашение');
      }

      toast({
        title: 'Приглашение отменено',
        description: `Приглашение для ${displayName} отменено`,
      });

      // Reload team data
      await loadMyTeam();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (tournament.teamMode === 'solo') {
    return null;
  }

  if (loadingTeam) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If no team exists, don't render anything (user hasn't registered yet)
  if (!team) {
    return null;
  }

  // Create slots with leader always first
  console.log('Current members:', currentMembers); // Debug log
  console.log('Team leader ID:', team?.leaderId); // Debug log

  const slots = Array.from({ length: maxTeamSize }, (_, index) => {
    let member;

    if (index === 0) {
      // First slot is always the leader
      member = currentMembers.find(m => m.userId === team?.leaderId);
    } else {
      // Other slots are for other members
      member = currentMembers.filter(m => m.userId !== team?.leaderId)[index - 1];
    }

    return {
      index: index + 1,
      member,
      isEmpty: !member,
    };
  });

  console.log('Slots:', slots); // Debug log

  const isLeader = team?.isLeader || false;

  // Filter out team members from the list
  const teamMemberIds = currentMembers.map(m => m.userId);
  const filteredUsers = allUsers.filter(u => !teamMemberIds.includes(u.id));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            Моя команда
          </CardTitle>
          <CardDescription>
            {currentSize}/{maxTeamSize} игроков
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {slots.map((slot) => (
            <div
              key={slot.index}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
            >
              {slot.isEmpty ? (
                <>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs">
                      {slot.index}
                    </div>
                    <span className="text-sm">Свободно</span>
                  </div>
                  {isLeader && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInviteDialog(true)}
                      className="h-8"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Пригласить
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {slot.member.userId === team?.leaderId && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary text-xs">
                        {slot.member.user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {slot.member.user.displayName || slot.member.user.username}
                        {slot.member.status === 'pending' && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Ожидает подтверждения)
                          </span>
                        )}
                      </p>
                      {slot.member.userId === team?.leaderId && (
                        <p className="text-xs text-muted-foreground">Капитан</p>
                      )}
                    </div>
                  </div>

                  {/* Kick/Cancel button for leader (cannot kick themselves) */}
                  {isLeader && slot.member.userId !== team?.leaderId ? (
                    slot.member.status === 'pending' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelInvite(slot.member.userId, slot.member.user.displayName)}
                        disabled={loading}
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        title="Отменить приглашение"
                      >
                        <X className="w-4 h-4 text-orange-500" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => kickPlayer(slot.member.userId, slot.member.user.displayName)}
                        disabled={loading}
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        title="Исключить из команды"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )
                  ) : (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </>
              )}
            </div>
          ))}

          {/* Leave Team Button for non-leaders */}
          {!isLeader && (
            <div className="px-6 pb-4">
              <Button
                variant="outline"
                onClick={leaveTeam}
                disabled={loading}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Покинуть команду
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => {
        setShowInviteDialog(open);
        if (!open) {
          setSearchQuery('');
          setSelectedUserId(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Пригласить игрока</DialogTitle>
            <DialogDescription>
              Выберите игрока для отправки приглашения в команду
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="searchPlayer">Поиск игрока</Label>
              <Input
                id="searchPlayer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Введите имя или username..."
              />
            </div>

            {/* Selected User Info */}
            {selectedUserId && (
              <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-bold text-primary text-sm">
                      {allUsers.find(u => u.id === selectedUserId)?.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {allUsers.find(u => u.id === selectedUserId)?.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @{allUsers.find(u => u.id === selectedUserId)?.username}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUserId(null)}
                >
                  Отменить
                </Button>
              </div>
            )}

            {/* Users List */}
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {searchingUsers ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Поиск игроков...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery.trim() ? 'Игроки не найдены' : 'Начните вводить имя для поиска'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredUsers.map(user => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors hover:bg-muted ${
                        selectedUserId === user.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="selectedUser"
                        checked={selectedUserId === user.id}
                        onChange={() => setSelectedUserId(user.id)}
                        className="cursor-pointer"
                      />
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <span className="font-bold text-sm">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={invitePlayer}
              disabled={loading || !selectedUserId}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Отправить
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
