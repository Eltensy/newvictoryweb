// client/src/components/WithdrawalsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, CheckCircle, XCircle, Clock, Loader2, Wallet, Crown } from "lucide-react";
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

  // Функция для проверки наличия премиума
  const hasPremium = (withdrawal: WithdrawalRequest): boolean => {
    return withdrawal.user?.premiumTier !== 'none' && withdrawal.user?.premiumTier !== undefined && withdrawal.user?.premiumTier !== null;
  };

  // Функция для расчёта итоговой суммы с бонусом
  const calculateFinalAmount = (withdrawal: WithdrawalRequest): { 
    baseAmount: number; 
    bonus: number; 
    finalAmount: number;
    hasPremium: boolean;
  } => {
    const baseAmount = withdrawal.amount;
    const isPremium = hasPremium(withdrawal);
    const bonus = isPremium ? Math.round(baseAmount * 0.1) : 0;
    const finalAmount = baseAmount + bonus;

    return {
      baseAmount,
      bonus,
      finalAmount,
      hasPremium: isPremium
    };
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

  // Подсчёт общей суммы с учётом премиум-бонусов
  const totalAmount = withdrawals.reduce((sum, w) => {
    const { finalAmount } = calculateFinalAmount(w);
    return sum + finalAmount;
  }, 0);

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
                    {totalAmount} ₽
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
              {withdrawals.map((withdrawal) => {
                const { baseAmount, bonus, finalAmount, hasPremium: isPremium } = calculateFinalAmount(withdrawal);
                
                return (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {withdrawal.id.slice(0, 8)}...
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {withdrawal.user?.displayName || 'Unknown User'}
                          {isPremium && (
                            <Crown className="h-4 w-4 text-yellow-500" title={`Premium: ${withdrawal.user?.premiumTier}`} />
                          )}
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
                      <div className="space-y-1">
                        <Badge variant="outline" className="font-gaming text-base">
                          {baseAmount} ₽
                        </Badge>
                        {isPremium && bonus > 0 && (
                          <div className="text-xs">
                            <div className="text-green-600 flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              +{bonus} ₽ (+10%)
                            </div>
                            <div className="font-bold text-green-700">
                              = {finalAmount} ₽
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getMethodIcon(withdrawal.method)}</span>
                        <div>
                          <div className="font-medium">{getMethodLabel(withdrawal.method)}</div>
                          <div className="text-xs text-muted-foreground">
                            {withdrawal.method === 'card' && withdrawal.methodData.cardNumber && 
                              `**** **** **** ${withdrawal.methodData.cardNumber.slice(-4)}`}
                            {withdrawal.method === 'crypto' && withdrawal.methodData.walletAddress && 
                              `${withdrawal.methodData.walletAddress.slice(0, 8)}...${withdrawal.methodData.walletAddress.slice(-6)}`}
                            {withdrawal.method === 'paypal' && withdrawal.methodData.email && 
                              withdrawal.methodData.email}
                            {withdrawal.method === 'telegram' && withdrawal.methodData.telegramUsername && 
                              `@${withdrawal.methodData.telegramUsername}`}
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
<DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-3xl p-0 border-0 bg-gradient-to-b from-background to-background/95">
  
  {/* Animated Background */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
  
  {/* Header */}
  <div className="relative border-b border-border/50 bg-background/60 backdrop-blur-2xl">
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            {withdrawal.status === 'completed' && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            )}
            {withdrawal.status === 'rejected' && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                <XCircle className="h-3 w-3 text-white" />
              </div>
            )}
            {withdrawal.status === 'pending' && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-yellow-500 border-2 border-background flex items-center justify-center">
                <Clock className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-0.5 font-gaming">Заявка на вывод</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {withdrawal.id.slice(0, 12)}...
              </Badge>
              {getWithdrawalStatusBadge(withdrawal.status)}
            </div>
          </div>
        </div>
      </div>

      {/* Amount Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 p-4">
        <div className="relative z-10">
          <div className="text-xs text-green-600/80 font-medium mb-1">Сумма вывода</div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold tabular-nums">{baseAmount} ₽</div>
            {isPremium && bonus > 0 && (
              <div className="text-sm text-green-600 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                <span>+{bonus} ₽ (Premium)</span>
              </div>
            )}
          </div>
          {isPremium && bonus > 0 && (
            <div className="mt-2 pt-2 border-t border-green-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600/80">Итого к выплате:</span>
                <span className="text-xl font-bold text-green-600">{finalAmount} ₽</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

  {/* Content */}
  <div className="relative overflow-y-auto max-h-[calc(90vh-220px)] p-6 pb-16 space-y-4">
    
    {/* Premium Bonus Banner */}
    {isPremium && bonus > 0 && (
      <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-yellow-500/5 p-4">
        <div className="absolute top-0 right-0 h-24 w-24 bg-yellow-500/10 rounded-full blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Crown className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
              Premium бонус применён
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-0">
                +10%
              </Badge>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-yellow-700/80">
                <span>Базовая сумма:</span>
                <span className="font-medium">{baseAmount} ₽</span>
              </div>
              <div className="flex justify-between text-yellow-600">
                <span>Premium бонус (+10%):</span>
                <span className="font-medium">+{bonus} ₽</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-yellow-500/20 pt-2 mt-2">
                <span>Итого к выплате:</span>
                <span className="text-yellow-700">{finalAmount} ₽</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* User Info */}
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Информация о пользователе</h3>
      
      <div className="rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Пользователь</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{withdrawal.user?.displayName || 'Unknown'}</span>
            {isPremium && (
              <Crown className="h-4 w-4 text-yellow-500" title={`Premium: ${withdrawal.user?.premiumTier}`} />
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t border-border/50">
          <span className="text-sm text-muted-foreground">Username</span>
          <span className="font-medium">@{withdrawal.user?.username || withdrawal.userId}</span>
        </div>

        {withdrawal.user?.telegramUsername && (
          <div className="flex items-center justify-between py-2 border-t border-border/50">
            <span className="text-sm text-muted-foreground">Telegram</span>
            <span className="font-medium">@{withdrawal.user.telegramUsername}</span>
          </div>
        )}
      </div>
    </div>

    {/* Payment Method */}
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Способ вывода</h3>
      
      <div className="rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="text-xl">{getMethodIcon(withdrawal.method)}</span>
          </div>
          <div>
            <div className="font-medium">{getMethodLabel(withdrawal.method)}</div>
            <div className="text-xs text-muted-foreground">Реквизиты для перевода</div>
          </div>
        </div>

        <div className="pl-[52px] space-y-2">
          {withdrawal.method === 'card' && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Номер карты</span>
                <Badge variant="outline" className="font-mono">
                  {withdrawal.methodData.cardNumber ? 
                    formatCardNumber(withdrawal.methodData.cardNumber) : 
                    'не указан'
                  }
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Держатель</span>
                <span className="font-medium">{withdrawal.methodData.cardHolder || 'не указан'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Страна</span>
                <Badge variant="secondary">{withdrawal.methodData.cardCountry || 'не указана'}</Badge>
              </div>
            </>
          )}
          
          {withdrawal.method === 'crypto' && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Валюта</span>
                <Badge variant="secondary">{withdrawal.methodData.currency || 'USDT'}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground mb-1">Адрес кошелька</span>
                <Badge variant="secondary">{withdrawal.methodData.walletAddress || 'не указан'}</Badge>
              </div>
            </>
          )}

          {withdrawal.method === 'paypal' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{withdrawal.methodData.email || 'не указан'}</span>
            </div>
          )}

          {withdrawal.method === 'telegram' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Telegram</span>
              <span className="font-medium">@{withdrawal.methodData.telegramUsername || 'не указан'}</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Status Info */}
    {withdrawal.status === 'rejected' && withdrawal.rejectionReason && (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-red-600 mb-2">Заявка отклонена</div>
            <p className="text-sm text-red-600/80">{withdrawal.rejectionReason}</p>
            {withdrawal.processedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(withdrawal.processedAt).toLocaleString('ru-RU')}
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {withdrawal.status === 'completed' && (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-green-600 mb-2">Вывод успешно завершен</div>
            {isPremium && bonus > 0 && (
              <p className="text-sm text-green-600/80 mb-2">
                Выплачено с Premium бонусом: {finalAmount} ₽ (базовая сумма {baseAmount} ₽ + бонус {bonus} ₽)
              </p>
            )}
            {withdrawal.processedAt && (
              <p className="text-xs text-muted-foreground">
                Завершен: {new Date(withdrawal.processedAt).toLocaleString('ru-RU')}
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Timeline */}
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">История</h3>
      
      <div className="rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Дата создания</span>
          <span className="font-medium">{new Date(withdrawal.createdAt).toLocaleString('ru-RU')}</span>
        </div>
        
        {withdrawal.processedAt && (
          <div className="flex items-center justify-between text-xs border-t border-border/50 pt-3">
            <span className="text-muted-foreground">Дата обработки</span>
            <span className="font-medium">{new Date(withdrawal.processedAt).toLocaleString('ru-RU')}</span>
          </div>
        )}

        {withdrawal.processedBy && (
          <div className="flex items-center justify-between text-xs border-t border-border/50 pt-3">
            <span className="text-muted-foreground">Обработал</span>
            <Badge variant="outline">{withdrawal.processedBy}</Badge>
          </div>
        )}
      </div>
    </div>

    {/* Actions for pending withdrawals */}
    {withdrawal.status === 'pending' && (
      <div className="space-y-4">
        {isPremium && bonus > 0 && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-700 mb-1">Внимание!</div>
                <p className="text-sm text-yellow-600/80">
                  При завершении выплаты необходимо перевести {finalAmount} ₽ (включая Premium бонус +{bonus} ₽)
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <Label htmlFor="withdrawal-rejection-reason" className="text-sm font-medium mb-2 block">
            Причина отклонения (если отклоняете)
          </Label>
          <Textarea
            id="withdrawal-rejection-reason"
            placeholder="Укажите причину отклонения заявки..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            data-testid="textarea-withdrawal-rejection"
            className="resize-none"
            rows={3}
          />
        </div>
        
        <div className="flex gap-3">
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/20"
            onClick={() => handleProcess('completed')}
            disabled={actionLoading}
            data-testid="button-complete-withdrawal"
          >
            {actionLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            Завершить вывод ({finalAmount} ₽)
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 border-red-500/50 text-red-600 hover:bg-red-500/10 hover:border-red-500"
            onClick={() => handleProcess('rejected')}
            disabled={!rejectionReason.trim() || actionLoading}
            data-testid="button-reject-withdrawal"
          >
            {actionLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-5 w-5 mr-2" />
            )}
            Отклонить
          </Button>
        </div>
      </div>
    )}

    {/* Actions for processing withdrawals */}
    {withdrawal.status === 'processing' && (
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-600 mb-2">Заявка в обработке</div>
              <p className="text-sm text-blue-600/80">
                Эта заявка уже обрабатывается. Вы можете завершить её или отклонить.
              </p>
              {isPremium && bonus > 0 && (
                <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Сумма к выплате с Premium бонусом: {finalAmount} ₽
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="processing-rejection-reason" className="text-sm font-medium mb-2 block">
            Причина отклонения (если отклоняете)
          </Label>
          <Textarea
            id="processing-rejection-reason"
            placeholder="Укажите причину отклонения заявки..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>
        
        <div className="flex gap-3 mb-10">
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/20"
            onClick={() => handleProcess('completed')}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            Завершить вывод ({finalAmount} ₽)
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 border-red-500/50 text-red-600 hover:bg-red-500/10 hover:border-red-500"
            onClick={() => handleProcess('rejected')}
            disabled={!rejectionReason.trim() || actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-5 w-5 mr-2" />
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
              );
              })}
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