// client/src/components/WithdrawalsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, CheckCircle, XCircle, Clock, Loader2, Wallet } from "lucide-react";
import { WithdrawalRequest } from "@/types/admin";
import { getMethodIcon, getMethodLabel, getWithdrawalStatusBadge, formatCardNumber } from "@/utils/adminUtils";

interface WithdrawalsTableProps {
  withdrawals: WithdrawalRequest[];
  loading: boolean;
  onProcess: (withdrawalId: string, status: 'completed' | 'rejected', rejectionReason?: string) => Promise<void>;
  actionLoading: boolean;
}

export function WithdrawalsTable({ withdrawals, loading, onProcess, actionLoading }: WithdrawalsTableProps) {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleProcess = async (status: 'completed' | 'rejected') => {
    if (!selectedWithdrawal) return;
    if (status === 'rejected' && !rejectionReason.trim()) return;
    
    await onProcess(selectedWithdrawal.id, status, rejectionReason.trim());
    setSelectedWithdrawal(null);
    setRejectionReason("");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка заявок на вывод...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-gaming">Заявки на вывод средств</CardTitle>
        <CardDescription>Всего заявок: {withdrawals.length}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gaming-warning" />
                <div>
                  <p className="text-sm font-medium">Ожидают</p>
                  <p className="text-2xl font-bold">
                    {withdrawals.filter(w => w.status === 'pending').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">В обработке</p>
                  <p className="text-2xl font-bold">
                    {withdrawals.filter(w => w.status === 'processing').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-gaming-success" />
                <div>
                  <p className="text-sm font-medium">Завершено</p>
                  <p className="text-2xl font-bold">
                    {withdrawals.filter(w => w.status === 'completed').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4 text-gaming-primary" />
                <div>
                  <p className="text-sm font-medium">Общая сумма</p>
                  <p className="text-2xl font-bold">
                    {withdrawals.reduce((sum, w) => sum + w.amount, 0)} ₽
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Withdrawals Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Способ вывода</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {withdrawal.id.slice(0, 8)}...
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {withdrawal.user?.displayName || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{withdrawal.user?.username || withdrawal.userId}
                      </div>
                      {withdrawal.user?.telegramUsername && (
                        <div className="text-xs text-muted-foreground">
                          Telegram: @{withdrawal.user.telegramUsername}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-gaming text-lg">
                      {withdrawal.amount} ₽
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getMethodIcon(withdrawal.method)}</span>
                      <div>
                        <div className="font-medium">{getMethodLabel(withdrawal.method)}</div>
                        <div className="text-xs text-muted-foreground">
                          {withdrawal.method === 'telegram' && withdrawal.methodData.telegramUsername && 
                            `@${withdrawal.methodData.telegramUsername}`}
                          {withdrawal.method === 'card' && withdrawal.methodData.cardNumber && 
                            `**** **** **** ${withdrawal.methodData.cardNumber.slice(-4)}`}
                          {withdrawal.method === 'paypal' && withdrawal.methodData.paypalEmail && 
                            withdrawal.methodData.paypalEmail}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getWithdrawalStatusBadge(withdrawal.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(withdrawal.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(withdrawal.createdAt).toLocaleTimeString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                          data-testid={`button-process-${withdrawal.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="font-gaming">Заявка на вывод средств</DialogTitle>
                          <DialogDescription>
                            Заявка #{withdrawal.id.slice(0, 8)}... от пользователя {withdrawal.user?.displayName || 'Unknown'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Withdrawal Info */}
                          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>ID заявки:</strong>
                                <Badge variant="outline" className="ml-2 font-mono">
                                  {withdrawal.id}
                                </Badge>
                              </div>
                              <div>
                                <strong>Пользователь:</strong> {withdrawal.user?.displayName || 'Unknown'}
                              </div>
                              <div>
                                <strong>Username:</strong> @{withdrawal.user?.username || withdrawal.userId}
                              </div>
                              <div>
                                <strong>Telegram:</strong> @{withdrawal.user?.telegramUsername || 'не указан'}
                              </div>
                              <div>
                                <strong>Сумма вывода:</strong>
                                <span className="text-2xl font-bold ml-2 text-gaming-primary">
                                  {withdrawal.amount} ₽
                                </span>
                              </div>
                              <div>
                                <strong>Текущий статус:</strong> {getWithdrawalStatusBadge(withdrawal.status)}
                              </div>
                              <div>
                                <strong>Дата создания:</strong> {new Date(withdrawal.createdAt).toLocaleString('ru-RU')}
                              </div>
                              {withdrawal.processedAt && (
                                <div>
                                  <strong>Дата обработки:</strong> {new Date(withdrawal.processedAt).toLocaleString('ru-RU')}
                                </div>
                              )}
                            </div>
                            
                            {/* Payment Method Details */}
                            <div className="mt-4 p-3 bg-background rounded border">
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <span className="text-lg">{getMethodIcon(withdrawal.method)}</span>
                                Способ вывода: {getMethodLabel(withdrawal.method)}
                              </h4>
                              <div className="text-sm text-muted-foreground pl-6">
                                {withdrawal.method === 'telegram' && (
                                  <div>
                                    <strong>Telegram username:</strong> @{withdrawal.methodData.telegramUsername || 'не указан'}
                                  </div>
                                )}
                                {withdrawal.method === 'card' && (
                                  <div>
                                    <strong>Номер карты:</strong> {withdrawal.methodData.cardNumber ? 
                                      `${formatCardNumber(withdrawal.methodData.cardNumber)}` : 
                                      'не указан'
                                    }
                                  </div>
                                )}
                                {withdrawal.method === 'paypal' && (
                                  <div>
                                    <strong>PayPal email:</strong> {withdrawal.methodData.paypalEmail || 'не указан'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status-specific content */}
                          {withdrawal.status === 'rejected' && withdrawal.rejectionReason && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <strong className="text-destructive">Причина отклонения:</strong>
                              <p className="mt-1">{withdrawal.rejectionReason}</p>
                              {withdrawal.processedBy && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Обработал: {withdrawal.processedBy}
                                </p>
                              )}
                            </div>
                          )}

                          {withdrawal.status === 'completed' && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                              <strong className="text-gaming-success">Вывод успешно завершен</strong>
                              {withdrawal.processedAt && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Завершен: {new Date(withdrawal.processedAt).toLocaleString('ru-RU')}
                                </p>
                              )}
                              {withdrawal.processedBy && (
                                <p className="text-sm text-muted-foreground">
                                  Обработал: {withdrawal.processedBy}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Actions for pending withdrawals */}
                          {withdrawal.status === 'pending' && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="withdrawal-rejection-reason">Причина отклонения (если отклоняете)</Label>
                                <Textarea
                                  id="withdrawal-rejection-reason"
                                  placeholder="Укажите причину отклонения заявки..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  data-testid="textarea-withdrawal-rejection"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1 bg-gaming-success hover:bg-gaming-success/90"
                                  onClick={() => handleProcess('completed')}
                                  disabled={actionLoading}
                                  data-testid="button-complete-withdrawal"
                                >
                                  {actionLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Завершить вывод
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => handleProcess('rejected')}
                                  disabled={!rejectionReason.trim() || actionLoading}
                                  data-testid="button-reject-withdrawal"
                                >
                                  {actionLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Отклонить
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Actions for processing withdrawals */}
                          {withdrawal.status === 'processing' && (
                            <div className="space-y-4">
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                  <strong>Заявка в обработке</strong>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Эта заявка уже обрабатывается. Вы можете завершить её или отклонить.
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="processing-rejection-reason">Причина отклонения (если отклоняете)</Label>
                                <Textarea
                                  id="processing-rejection-reason"
                                  placeholder="Укажите причину отклонения заявки..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1 bg-gaming-success hover:bg-gaming-success/90"
                                  onClick={() => handleProcess('completed')}
                                  disabled={actionLoading}
                                >
                                  {actionLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Завершить вывод
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => handleProcess('rejected')}
                                  disabled={!rejectionReason.trim() || actionLoading}
                                >
                                  {actionLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Отклонить
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {withdrawals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Заявки на вывод не найдены</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}