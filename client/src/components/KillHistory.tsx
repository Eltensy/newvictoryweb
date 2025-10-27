import { useState } from "react";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2, FileText, User as UserIcon, Calendar, Target } from "lucide-react";

interface KillHistoryEntry {
  id: string;
  userId: string;
  killType: 'gold' | 'silver' | 'bronze';
  rewardAmount: number;
  submissionId?: string;
  grantedBy?: string;
  reason?: string;
  metadata?: any;
  createdAt: string;
  user?: {
    username: string;
    displayName: string;
  };
  grantedByUser?: {
    username: string;
    displayName: string;
  };
  submission?: {
    category: string;
    originalFilename: string;
  };
}

interface KillHistoryTableProps {
  killHistory: KillHistoryEntry[];
  loading: boolean;
}

export function KillHistoryTable({ killHistory, loading }: KillHistoryTableProps) {
  const [killHistoryData, setKillHistoryData] = useState<KillHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'gold' | 'silver' | 'bronze'>('all');

  useEffect(() => {
  const fetchKillHistory = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch('/api/admin/kills', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch kill history');
      
      const data = await response.json();
      setKillHistoryData(data);
    } catch (error) {
      console.error('Failed to fetch kill history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchKillHistory();
}, []);

const effectiveKillHistory = killHistory || killHistoryData;
  const effectiveLoading = loading || isLoading;
  const getKillIcon = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
    }
  };

  const getKillColor = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700';
      case 'silver': return 'border-gray-400/50 bg-gray-400/10 text-gray-700';
      case 'bronze': return 'border-orange-600/50 bg-orange-600/10 text-orange-700';
    }
  };

  const getKillBadgeVariant = (type: 'gold' | 'silver' | 'bronze') => {
    switch (type) {
      case 'gold': return 'default';
      case 'silver': return 'secondary';
      case 'bronze': return 'outline';
    }
  };

  const filteredHistory = filterType === 'all' 
    ? effectiveKillHistory 
    : effectiveKillHistory.filter(k => k.killType === filterType);

  const stats = {
    total: effectiveKillHistory.length,
    gold: effectiveKillHistory.filter(k => k.killType === 'gold').length,
    silver: effectiveKillHistory.filter(k => k.killType === 'silver').length,
    bronze: effectiveKillHistory.filter(k => k.killType === 'bronze').length,
    totalRewards: effectiveKillHistory.reduce((sum, k) => sum + k.rewardAmount, 0)
  };

  if (effectiveLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка истории киллов...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-gaming flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          История киллов
        </CardTitle>
        <CardDescription>Все выданные киллы в системе</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card 
              className={`p-4 cursor-pointer transition-all ${filterType === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterType('all')}
            >
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-gaming-primary" />
                <div>
                  <p className="text-sm font-medium">Всего киллов</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 ${filterType === 'gold' ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setFilterType('gold')}
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="text-sm font-medium">Gold Kills</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.gold}</p>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all bg-gradient-to-br from-gray-400/10 to-gray-400/5 border-gray-400/20 ${filterType === 'silver' ? 'ring-2 ring-gray-400' : ''}`}
              onClick={() => setFilterType('silver')}
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🥈</span>
                <div>
                  <p className="text-sm font-medium">Silver Kills</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.silver}</p>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer transition-all bg-gradient-to-br from-orange-600/10 to-orange-600/5 border-orange-600/20 ${filterType === 'bronze' ? 'ring-2 ring-orange-600' : ''}`}
              onClick={() => setFilterType('bronze')}
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🥉</span>
                <div>
                  <p className="text-sm font-medium">Bronze Kills</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.bronze}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Выдано наград</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalRewards} ₽</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Active Filter Badge */}
          {filterType !== 'all' && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                Фильтр: {filterType === 'gold' ? '🥇 Gold' : filterType === 'silver' ? '🥈 Silver' : '🥉 Bronze'}
              </Badge>
              <button 
                onClick={() => setFilterType('all')}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Сбросить
              </button>
            </div>
          )}

          {/* Kill History Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Награда</TableHead>
                  <TableHead>Заявка</TableHead>
                  <TableHead>Выдал</TableHead>
                  <TableHead>Причина</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Нет истории киллов</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      {/* Kill Type */}
                      <TableCell>
                        <Badge 
                          variant={getKillBadgeVariant(entry.killType)}
                          className={`font-bold ${getKillColor(entry.killType)}`}
                        >
                          {getKillIcon(entry.killType)} {entry.killType}
                        </Badge>
                      </TableCell>

                      {/* User */}
                      <TableCell>
                        {entry.user ? (
                          <div>
                            <div className="font-medium">{entry.user.displayName}</div>
                            <div className="text-xs text-muted-foreground">@{entry.user.username}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Reward */}
                      <TableCell>
                        <Badge variant="outline" className="font-gaming text-gaming-success">
                          +{entry.rewardAmount} ₽
                        </Badge>
                      </TableCell>

                      {/* Submission */}
                      <TableCell>
                        {entry.submission ? (
                          <div className="flex items-start gap-2 max-w-xs">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">
                                {entry.submission.category}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {entry.submission.originalFilename}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Granted By */}
                      <TableCell>
                        {entry.grantedByUser ? (
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{entry.grantedByUser.displayName}</div>
                              <div className="text-xs text-muted-foreground">@{entry.grantedByUser.username}</div>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </TableCell>

                      {/* Reason */}
                      <TableCell>
                        {entry.reason ? (
                          <div className="max-w-xs">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {entry.reason}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div>{new Date(entry.createdAt).toLocaleDateString('ru-RU')}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleTimeString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Results Info */}
          {filteredHistory.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Показано: {filteredHistory.length} {filterType !== 'all' ? `(${filterType})` : ''} из {stats.total} записей
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}