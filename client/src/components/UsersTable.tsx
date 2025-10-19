// client/src/components/UsersTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, DollarSign, Users, Shield, Trophy, Loader2, Target, Clipboard, Check } from "lucide-react";
import { User } from "@/types/admin";

interface UsersTableProps {
  users: User[];
  loading: boolean;
  onUpdateBalance: (userId: string, amount: number, reason: string) => Promise<void>;
  actionLoading: boolean;
}

function CopyButton({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted transition-colors"
      title="Скопировать"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Clipboard className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

export function UsersTable({ users, loading, onUpdateBalance, actionLoading }: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");

  const handleUpdateBalance = async (isAdd: boolean) => {
    if (!selectedUser) return;
    const amount = Number(balanceAmount);
    if (!amount || amount <= 0 || !balanceReason.trim()) return;
    
    const finalAmount = isAdd ? amount : -amount;
    await onUpdateBalance(selectedUser.id, finalAmount, balanceReason.trim());
    setSelectedUser(null);
    setBalanceAmount("");
    setBalanceReason("");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка пользователей...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-gaming">Управление пользователями</CardTitle>
        <CardDescription>Всего пользователей: {users.length}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gaming-primary" />
                <div>
                  <p className="text-sm font-medium">Всего пользователей</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gaming-warning" />
                <div>
                  <p className="text-sm font-medium">Администраторы</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.isAdmin).length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gaming-success" />
                <div>
                  <p className="text-sm font-medium">Общий баланс</p>
                  <p className="text-2xl font-bold">
                    {users.reduce((sum, u) => sum + u.balance, 0)} ₽
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Kill Statistics Card */}
                <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Всего киллов</p>
                      <p className="text-2xl font-bold">
                        {users.reduce((sum, u) => {
                          const totalKills = u.totalKills || (u.stats?.totalKills) || 0;
                          return sum + totalKills;
                        }, 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-yellow-600">🥇 {users.reduce((sum, u) => {
                      const gold = u.goldKills || (u.stats?.goldKills) || 0;
                      return sum + gold;
                    }, 0)}</span>
                    <span className="text-gray-500">🥈 {users.reduce((sum, u) => {
                      const silver = u.silverKills || (u.stats?.silverKills) || 0;
                      return sum + silver;
                    }, 0)}</span>
                    <span className="text-orange-600">🥉 {users.reduce((sum, u) => {
                      const bronze = u.bronzeKills || (u.stats?.bronzeKills) || 0;
                      return sum + bronze;
                    }, 0)}</span>
                  </div>
                </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-gaming-secondary" />
                <div>
                  <p className="text-sm font-medium">Активные пользователи</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.stats && u.stats.totalSubmissions > 0).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Epic Games ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Заявки</TableHead>
                <TableHead>Доходы</TableHead>
                <TableHead>Регистрация</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {user.id.slice(0, 8)}...
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        @{user.username}
                      </div>
                      {user.telegramUsername && (
                        <div className="text-xs text-muted-foreground">
                          Telegram: @{user.telegramUsername}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1">
                        {user.isAdmin && (
                          <Badge variant="destructive" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {user.epicGamesId?.slice(0, 12)}...
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.email ? (
                      <span className="text-sm">{user.email}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.balance > 0 ? "default" : "secondary"} 
                      className="font-gaming"
                    >
                      {user.balance} ₽
                    </Badge>
                  </TableCell>
                  
                  {/* Kill Stats Cell */}

                  <TableCell>
                    {user.stats ? (
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">Всего: </span>
                          {user.stats.totalSubmissions}
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="text-gaming-success">
                            ✓ {user.stats.approvedSubmissions}
                          </span>
                          <span className="text-gaming-warning">
                            ⏳ {user.stats.pendingSubmissions}
                          </span>
                          <span className="text-destructive">
                            ✗ {user.stats.rejectedSubmissions}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.stats?.totalEarnings ? (
                      <Badge variant="outline" className="text-gaming-success">
                        {user.stats.totalEarnings} ₽
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0 ₽</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleTimeString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Balance Management Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            data-testid={`button-manage-${user.id}`}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-gaming">Управление балансом</DialogTitle>
                            <DialogDescription>
                              Пользователь: {user.displayName} (@{user.username})
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* User Info Card */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                              <div className="text-sm">
                                <strong>ID:</strong> {user.id}
                              </div>
                              <div className="text-sm">
                                <strong>Epic Games ID:</strong> {user.epicGamesId}
                              </div>
                              {user.email && (
                                <div className="text-sm">
                                  <strong>Email:</strong> {user.email}
                                </div>
                              )}
                              <div className="text-sm">
                                <strong>Текущий баланс:</strong>
                                <span className="text-2xl font-bold ml-2">{user.balance} ₽</span>
                              </div>
                              {user.stats && (
                                <div className="text-sm text-muted-foreground mt-2">
                                  <div>Общий доход: {user.stats.totalEarnings} ₽</div>
                                  <div>
                                    Заявки: {user.stats.totalSubmissions} 
                                    (✓{user.stats.approvedSubmissions} 
                                    ⏳{user.stats.pendingSubmissions} 
                                    ✗{user.stats.rejectedSubmissions})
                                  </div>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Создан: {new Date(user.createdAt).toLocaleString('ru-RU')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Обновлен: {new Date(user.updatedAt).toLocaleString('ru-RU')}
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="balance-amount">Сумма</Label>
                              <Input
                                id="balance-amount"
                                type="number"
                                placeholder="Введите сумму"
                                value={balanceAmount}
                                onChange={(e) => setBalanceAmount(e.target.value)}
                                data-testid="input-balance"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="balance-reason">Причина</Label>
                              <Input
                                id="balance-reason"
                                placeholder="Введите причину изменения баланса"
                                value={balanceReason}
                                onChange={(e) => setBalanceReason(e.target.value)}
                                data-testid="input-balance-reason"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                className="flex-1" 
                                onClick={() => handleUpdateBalance(true)}
                                disabled={!balanceAmount || !balanceReason || actionLoading}
                                data-testid="button-add-balance"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  "Добавить"
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => handleUpdateBalance(false)}
                                disabled={!balanceAmount || !balanceReason || actionLoading}
                                data-testid="button-subtract-balance"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  "Списать"
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* User Details Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden rounded-3xl p-0 border-0 bg-gradient-to-b from-background to-background/95">
                          
                          {/* Animated Background */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
                          
                          {/* Header */}
                          <div className="relative border-b border-border/50 bg-background/60 backdrop-blur-2xl">
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                                      <Users className="h-8 w-8 text-white" />
                                    </div>
                                    {user.isAdmin && (
                                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                                        <Shield className="h-3 w-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h2 className="text-xl font-semibold mb-0.5">{user.displayName}</h2>
                                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                                    {user.isAdmin && (
                                      <Badge variant="destructive" className="mt-1 text-xs">
                                        Администратор
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Balance Card */}
                              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 p-4">
                                <div className="relative z-10 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                      <DollarSign className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                      <div className="text-xs text-green-600/80 font-medium">Баланс</div>
                                      <div className="text-2xl font-bold tabular-nums">{user.balance.toLocaleString()} ₽</div>
                                    </div>
                                  </div>
                                  {user.stats && user.stats.totalEarnings > 0 && (
                                    <div className="text-right">
                                      <div className="text-xs text-green-600/80 font-medium">Заработано</div>
                                      <div className="text-lg font-bold tabular-nums text-green-600">{user.stats.totalEarnings} ₽</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="relative overflow-y-auto max-h-[calc(90vh-220px)] p-6 space-y-4">
                            
                            {/* Stats Grid */}
                            {user.stats && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-green-500/30 transition-all duration-300">
                                  <div className="absolute top-0 right-0 h-16 w-16 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors" />
                                  <Trophy className="h-5 w-5 text-green-600 mb-2" />
                                  <div className="text-2xl font-bold tabular-nums mb-1">{user.stats.approvedSubmissions}</div>
                                  <div className="text-xs text-muted-foreground">Одобрено</div>
                                </div>

                                <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-yellow-500/30 transition-all duration-300">
                                  <div className="absolute top-0 right-0 h-16 w-16 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors" />
                                  <Eye className="h-5 w-5 text-yellow-600 mb-2" />
                                  <div className="text-2xl font-bold tabular-nums mb-1">{user.stats.pendingSubmissions}</div>
                                  <div className="text-xs text-muted-foreground">Ожидают</div>
                                </div>

                                <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-blue-500/30 transition-all duration-300">
                                  <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                                  <Target className="h-5 w-5 text-blue-600 mb-2" />
                                  <div className="text-2xl font-bold tabular-nums mb-1">{user.stats.totalSubmissions}</div>
                                  <div className="text-xs text-muted-foreground">Всего</div>
                                </div>

                                <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-red-500/30 transition-all duration-300">
                                  <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
                                  <span className="text-xl mb-2 block">✗</span>
                                  <div className="text-2xl font-bold tabular-nums mb-1">{user.stats.rejectedSubmissions}</div>
                                  <div className="text-xs text-muted-foreground">Отклонено</div>
                                </div>
                              </div>
                            )}

      
{ (
  <div className="space-y-3">
    <h3 className="text-sm font-medium text-muted-foreground">Статистика киллов</h3>
    
    <div className="space-y-3">
      {/* Total Kills */}
      <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-yellow-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 h-16 w-16 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors" />
        <div className="relative flex items-center gap-3">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <div>
            <div className="text-2xl font-bold tabular-nums">{user.totalKills}</div>
            <div className="text-xs text-muted-foreground">Всего киллов</div>
          </div>
        </div>
      </div>

      {/* Medal Stats - 3 equal columns */}
      <div className="grid grid-cols-3 gap-3">
        {/* Gold Kills */}
        <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 hover:border-yellow-500/50 transition-all duration-300 text-center">
          <div className="text-3xl mb-1">🥇</div>
          <div className="text-xl font-bold tabular-nums mb-1">{user.goldKills || 0}</div>
          <div className="text-xs text-muted-foreground">Gold</div>
        </div>

        {/* Silver Kills */}
        <div className="group relative overflow-hidden rounded-2xl border border-gray-400/30 bg-gray-400/5 p-4 hover:border-gray-400/50 transition-all duration-300 text-center">
          <div className="text-3xl mb-1">🥈</div>
          <div className="text-xl font-bold tabular-nums mb-1">{user.silverKills || 0}</div>
          <div className="text-xs text-muted-foreground">Silver</div>
        </div>

        {/* Bronze Kills */}
        <div className="group relative overflow-hidden rounded-2xl border border-orange-600/30 bg-orange-600/5 p-4 hover:border-orange-600/50 transition-all duration-300 text-center">
          <div className="text-3xl mb-1">🥉</div>
          <div className="text-xl font-bold tabular-nums mb-1">{user.bronzeKills || 0}</div>
          <div className="text-xs text-muted-foreground">Bronze</div>
        </div>
      </div>
    </div>
  </div>
)}

                            {/* User Details */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-medium text-muted-foreground">Информация об аккаунте</h3>
                              
                              <div className="rounded-2xl border border-border/50 p-4 space-y-3">
                                <div className="flex items-center justify-between py-2">
                                  <span className="text-sm text-muted-foreground">User ID</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {user.id.slice(0, 12)}...
                                    </Badge>
                                    <CopyButton value={user.id} />
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between py-2 border-t border-border/50">
                                  <span className="text-sm text-muted-foreground">Epic Games ID</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {user.epicGamesId?.slice(0, 12)}...
                                    </Badge>
                                    <CopyButton value={user.epicGamesId} />
                                  </div>
                                </div>

                                {user.email && (
                                  <div className="flex items-center justify-between py-2 border-t border-border/50">
                                    <span className="text-sm text-muted-foreground">Email</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{user.email}</span>
                                      <CopyButton value={user.email} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* OAuth Integrations */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-medium text-muted-foreground">Интеграции OAuth</h3>
                              
                              {/* Telegram */}
                              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">Telegram</div>
                                    <div className="text-xs text-muted-foreground">
                                      {user.telegramUsername ? 'Подключен' : 'Не подключен'}
                                    </div>
                                  </div>
                                  {user.telegramUsername && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                      Активен
                                    </Badge>
                                  )}
                                </div>
                                {user.telegramUsername && (
                                  <div className="space-y-2 pl-[52px]">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Username</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">@{user.telegramUsername}</span>
                                        <CopyButton value={user.telegramUsername} />
                                      </div>
                                    </div>
                                    {user.telegramChatId && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Chat ID</span>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="font-mono text-xs">
                                            {user.telegramChatId}
                                          </Badge>
                                          <CopyButton value={user.telegramChatId} />
                                        </div>
                                      </div>
                                    )}
                                    {user.telegramFirstName && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Имя</span>
                                        <span className="font-medium">
                                          {user.telegramFirstName} {user.telegramLastName || ''}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Discord */}
                              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">Discord</div>
                                    <div className="text-xs text-muted-foreground">
                                      {user.discordUsername ? 'Подключен' : 'Не подключен'}
                                    </div>
                                  </div>
                                  {user.discordUsername && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                      Активен
                                    </Badge>
                                  )}
                                </div>
                                {user.discordUsername && (
                                  <div className="space-y-2 pl-[52px]">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Username</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{user.discordUsername}</span>
                                        <CopyButton value={user.discordUsername} />
                                      </div>
                                    </div>
                                    {user.discordId && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Discord ID</span>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="font-mono text-xs">
                                            {user.discordId}
                                          </Badge>
                                          <CopyButton value={user.discordId} />
                                        </div>
                                      </div>
                                    )}
                                    {user.discordEmail && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Email</span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{user.discordEmail}</span>
                                          <CopyButton value={user.discordEmail} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dates */}
                            <div className="rounded-2xl border border-border/50 p-4 space-y-2 bg-muted/30">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Регистрация</span>
                                <span className="font-medium">{new Date(user.createdAt).toLocaleString('ru-RU')}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Последнее обновление</span>
                                <span className="font-medium">{new Date(user.updatedAt).toLocaleString('ru-RU')}</span>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-2">Пользователи не найдены</p>
              <p className="text-sm">Пользователи появятся здесь после регистрации</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}