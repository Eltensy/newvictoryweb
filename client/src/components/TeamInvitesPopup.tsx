import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users, Check, X, Clock } from 'lucide-react';

interface TeamInvite {
  id: string;
  teamId: string;
  tournamentId: string;
  status: string;
  createdAt: string;
  team: {
    id: string;
    name: string;
  };
  fromUser: {
    id: string;
    username: string;
    displayName: string;
  };
  tournament: {
    id: string;
    name: string;
    teamMode: string;
  };
}

interface TeamInvitesPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteResponded?: () => void;
}

export function TeamInvitesPopup({ open, onOpenChange, onInviteResponded }: TeamInvitesPopupProps) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadInvites();
    }
  }, [open]);

  const loadInvites = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/tournament/team/invites', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load invites');
      }

      const data = await response.json();
      setInvites(data);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить приглашения',
        variant: 'destructive',
      });
    }
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    setRespondingTo(inviteId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tournament/team/invite/${inviteId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ accept }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to respond to invite');
      }

      const result = await response.json();

      toast({
        title: accept ? 'Приглашение принято' : 'Приглашение отклонено',
        description: result.message,
      });

      // Remove the invite from the list
      setInvites(invites.filter(i => i.id !== inviteId));
      onInviteResponded?.();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRespondingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Приглашения в команды
          </DialogTitle>
          <DialogDescription>
            {invites.length === 0
              ? 'У вас нет ожидающих приглашений'
              : `У вас ${invites.length} ${invites.length === 1 ? 'приглашение' : invites.length < 5 ? 'приглашения' : 'приглашений'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет ожидающих приглашений</p>
            </div>
          ) : (
            invites.map((invite) => (
              <Card key={invite.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-lg">{invite.team.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Пригласил {invite.fromUser.displayName || invite.fromUser.username}
                      </p>
                    </div>
                    <Badge variant="secondary" className="uppercase">
                      {invite.tournament.teamMode}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Турнир:</span> {invite.tournament.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Приглашен {new Date(invite.createdAt).toLocaleDateString('ru-RU')} в{' '}
                      {new Date(invite.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => respondToInvite(invite.id, true)}
                      disabled={respondingTo === invite.id}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Принять
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => respondToInvite(invite.id, false)}
                      disabled={respondingTo === invite.id}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
