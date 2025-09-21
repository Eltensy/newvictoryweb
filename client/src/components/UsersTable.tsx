// client/src/components/UsersTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, DollarSign, Users, Shield, Trophy, Loader2 } from "lucide-react";
import { User } from "@/types/admin";

interface UsersTableProps {
  users: User[];
  loading: boolean;
  onUpdateBalance: (userId: string, amount: number, reason: string) => Promise<void>;
  actionLoading: boolean;
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="font-gaming">
                              Информация о пользователе
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>ID:</strong>
                                <Badge variant="outline" className="ml-2 font-mono">
                                  {user.id}
                                </Badge>
                              </div>
                              <div>
                                <strong>Username:</strong> {user.username}
                              </div>
                              <div>
                                <strong>Отображаемое имя:</strong> {user.displayName}
                              </div>
                              <div>
                                <strong>Epic Games ID:</strong>
                                <Badge variant="outline" className="ml-2 font-mono text-xs">
                                  {user.epicGamesId}
                                </Badge>
                              </div>
                              <div>
                                <strong>Email:</strong> {user.email || '—'}
                              </div>
                              <div>
                                <strong>Telegram:</strong> {user.telegramUsername ? `@${user.telegramUsername}` : '—'}
                              </div>
                              <div>
                                <strong>Баланс:</strong> {user.balance} ₽
                              </div>
                              <div>
                                <strong>Роль:</strong> 
                                {user.isAdmin ? (
                                  <Badge variant="destructive" className="ml-2">Admin</Badge>
                                ) : (
                                  <Badge variant="secondary" className="ml-2">User</Badge>
                                )}
                              </div>
                            </div>
                            
                            {user.stats && (
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <h4 className="font-medium mb-2">Статистика</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>Всего заявок: <strong>{user.stats.totalSubmissions}</strong></div>
                                  <div className="text-gaming-success">
                                    Одобрено: <strong>{user.stats.approvedSubmissions}</strong>
                                  </div>
                                  <div className="text-gaming-warning">
                                    На рассмотрении: <strong>{user.stats.pendingSubmissions}</strong>
                                  </div>
                                  <div className="text-destructive">
                                    Отклонено: <strong>{user.stats.rejectedSubmissions}</strong>
                                  </div>
                                  <div className="col-span-2 text-gaming-success mt-2">
                                    Общий доход: <strong>{user.stats.totalEarnings} ₽</strong>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="bg-muted/30 p-3 rounded text-xs text-muted-foreground">
                              <div>Создан: {new Date(user.createdAt).toLocaleString('ru-RU')}</div>
                              <div>Обновлен: {new Date(user.updatedAt).toLocaleString('ru-RU')}</div>
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
        </div>
      </CardContent>
    </Card>
  );
}