import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, FileText, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface KillHistoryEntry {
  id: string;
  killType: 'gold' | 'silver' | 'bronze';
  rewardAmount: number;
  reason?: string;
  createdAt: string;
  submission?: {
    category: string;
    originalFilename: string;
  };
  grantedByUser?: {
    username: string;
    displayName: string;
  };
}

export function KillHistory({ userId }: { userId: string }) {
  const { getAuthToken } = useAuth();
  const [history, setHistory] = useState<KillHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/user/${userId}/kills?limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error('Failed to fetch kill history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId, getAuthToken]);

  const getKillIcon = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
    }
  };

  const getKillColor = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'silver': return 'border-gray-400/30 bg-gray-400/5';
      case 'bronze': return 'border-orange-600/30 bg-orange-600/5';
    }
  };

  const getKillTextColor = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return 'text-yellow-700';
      case 'silver': return 'text-gray-700';
      case 'bronze': return 'text-orange-700';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка истории...</span>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            История киллов
          </CardTitle>
          <CardDescription>Записи о полученных киллах</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">История пуста</p>
            <p className="text-sm">Киллы появятся здесь после одобрения заявок</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          История киллов
        </CardTitle>
        <CardDescription>
          Всего получено: {history.length} {history.length === 1 ? 'килл' : 'киллов'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border p-4 transition-all hover:shadow-md ${getKillColor(entry.killType)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{getKillIcon(entry.killType)}</div>
                  <div>
                    <div className={`font-bold text-lg ${getKillTextColor(entry.killType)}`}>
                      {entry.killType.charAt(0).toUpperCase() + entry.killType.slice(1)} Kill
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(entry.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="font-bold">
                  +{entry.rewardAmount} ₽
                </Badge>
              </div>

              {entry.submission && (
                <div className="flex items-start gap-2 mb-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">За заявку:</div>
                    <div className="text-muted-foreground text-xs">
                      {entry.submission.originalFilename}
                    </div>
                  </div>
                </div>
              )}

              {entry.grantedByUser && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserIcon className="h-3 w-3" />
                  Выдал: {entry.grantedByUser.displayName} (@{entry.grantedByUser.username})
                </div>
              )}

              {entry.reason && (
                <div className="mt-2 text-xs text-muted-foreground italic">
                  {entry.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}