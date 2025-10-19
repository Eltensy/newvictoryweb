import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Bitcoin, 
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Trophy,
  Wallet,
  AlertTriangle,
  Info,
  Zap,
  Crown,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceTransaction {
  id: string;
  type: 'earning' | 'bonus' | 'withdrawal_request' | 'withdrawal_completed';
  amount: number;
  description: string;
  sourceType?: string;
  sourceId?: string;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: 'card' | 'crypto' | 'paypal';
  methodData: any;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
  premiumBonus?: number;
  finalAmount?: number;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
  telegramUsername?: string;
  discordUsername?: string;
  premiumTier?: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  premiumEndDate?: string;
}

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  getAuthToken: () => string | null;
  onRefreshUser: () => Promise<void>;
}

function NotificationModal({ isOpen, type, title, message, onClose }: { isOpen: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; onClose: () => void }) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/20 bg-green-50/50 dark:bg-green-950/50';
      case 'error':
        return 'border-red-500/20 bg-red-50/50 dark:bg-red-950/50';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/50';
      case 'info':
        return 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/50';
    }
  };

  return (
    <div className="fixed bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className={cn("bg-card rounded-2xl border shadow-2xl max-w-md w-full", getBorderColor())}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            {getIcon()}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Понятно</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BalanceModal({ isOpen, onClose, user, getAuthToken, onRefreshUser }: BalanceModalProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawal'>('transactions');
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    method: 'crypto' as 'card' | 'crypto' | 'paypal' | '',
    cardNumber: '',
    cardHolder: '',
    cardCountry: 'RU',
    walletAddress: '',
    currency: 'USDT',
    email: ''
  });

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({ isOpen: true, type, title, message });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const hasContactMethod = user.telegramUsername || user.discordUsername;
  const hasPremium = user.premiumTier && user.premiumTier !== 'none';

  const calculateWithdrawal = (amount: number) => {
    const baseAmount = amount;
    const premiumBonus = hasPremium ? Math.round(amount * 0.1) : 0;
    const finalAmount = baseAmount + premiumBonus;
    return { baseAmount, premiumBonus, finalAmount };
  };

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const limitedValue = cleanValue.slice(0, 16);
    const formattedValue = limitedValue.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formattedValue;
  };

  const isValidCardNumber = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    return cleanNumber.length === 16 && /^\d{16}$/.test(cleanNumber);
  };

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
      loadWithdrawals();
    }
  }, [isOpen]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/user/${user.id}/balance/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/user/${user.id}/withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      }
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    }
  };

  const getTransactionIcon = (transaction: BalanceTransaction) => {
    switch (transaction.type) {
      case 'earning':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-green-500" />;
      case 'withdrawal_request':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'withdrawal_completed':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <Wallet className="h-4 w-4 text-gray-500" />;
    }
  };

  const getWithdrawalStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'crypto':
        return <Bitcoin className="h-4 w-4" />;
      case 'paypal':
        return <Mail className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Ожидание',
      processing: 'Обработка',
      completed: 'Выполнено',
      rejected: 'Отклонено'
    };
    return statusMap[status] || status;
  };

  const getMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      card: 'Банковская карта',
      crypto: 'Криптовалюта',
      paypal: 'PayPal'
    };
    return methodMap[method] || method;
  };

  const handleWithdrawalSubmit = async () => {
    if (!hasContactMethod) {
      showNotification('warning', 'Требуется привязка контакта', 'Для вывода средств необходимо привязать Telegram или Discord аккаунт в настройках профиля');
      return;
    }

    if (!withdrawalForm.amount || !withdrawalForm.method) return;

    const amount = parseInt(withdrawalForm.amount);
    if (amount < 1000) {
      showNotification('warning', 'Недостаточная сумма', 'Минимальная сумма вывода 1000 рублей');
      return;
    }

    if (amount > user.balance) {
      showNotification('error', 'Недостаточно средств', 'Недостаточно средств на балансе');
      return;
    }

    setIsSubmittingWithdrawal(true);

    try {
      const token = getAuthToken();
      if (!token) return;

      let methodData = {};

      switch (withdrawalForm.method) {
        case 'card':
          if (!withdrawalForm.cardNumber || !withdrawalForm.cardHolder || !withdrawalForm.cardCountry) {
            showNotification('warning', 'Не все поля заполнены', 'Заполните все поля для банковской карты');
            setIsSubmittingWithdrawal(false);
            return;
          }
          if (!isValidCardNumber(withdrawalForm.cardNumber)) {
            showNotification('error', 'Некорректный номер карты', 'Введите корректный номер карты (16 цифр)');
            setIsSubmittingWithdrawal(false);
            return;
          }
          methodData = {
            cardNumber: withdrawalForm.cardNumber.replace(/\s/g, ''),
            cardHolder: withdrawalForm.cardHolder,
            cardCountry: withdrawalForm.cardCountry
          };
          break;
        case 'crypto':
          if (!withdrawalForm.walletAddress) {
            showNotification('warning', 'Не указан адрес кошелька', 'Укажите адрес кошелька');
            setIsSubmittingWithdrawal(false);
            return;
          }
          methodData = {
            walletAddress: withdrawalForm.walletAddress,
            currency: withdrawalForm.currency
          };
          break;
        case 'paypal':
          if (!withdrawalForm.email) {
            showNotification('warning', 'Не указан email', 'Укажите email PayPal');
            setIsSubmittingWithdrawal(false);
            return;
          }
          methodData = {
            email: withdrawalForm.email
          };
          break;
      }

      const response = await fetch(`/api/user/${user.id}/withdrawal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          method: withdrawalForm.method,
          methodData
        })
      });

      if (response.ok) {
        const withdrawal = calculateWithdrawal(amount);
        showNotification(
          'success',
          'Заявка создана',
          hasPremium
            ? `Заявка на вывод создана успешно! Сумма вывода: ${withdrawal.baseAmount} ₽ + ${withdrawal.premiumBonus} ₽ (Premium бонус) = ${withdrawal.finalAmount} ₽`
            : 'Заявка на вывод создана успешно'
        );
        setIsWithdrawalModalOpen(false);
        setWithdrawalForm({
          amount: '',
          method: '',
          cardNumber: '',
          cardHolder: '',
          cardCountry: 'RU',
          walletAddress: '',
          currency: 'USDT',
          email: ''
        });

        await Promise.all([
          loadTransactions(),
          loadWithdrawals(),
          onRefreshUser()
        ]);
      } else {
        const error = await response.json();
        showNotification('error', 'Ошибка создания заявки', error.error || 'Произошла ошибка при создании заявки');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      showNotification('error', 'Ошибка сети', 'Произошла ошибка при создании заявки');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const currentWithdrawal = withdrawalForm.amount ? calculateWithdrawal(parseInt(withdrawalForm.amount)) : null;

  if (!isOpen || !user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-3xl p-0 border-0 bg-gradient-to-b from-background to-background/95">
          
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

          <div className="relative border-b border-border/50 bg-background/60 backdrop-blur-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Wallet className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-1">Баланс</h2>
                    <p className="text-sm text-muted-foreground">Управление средствами</p>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/15 via-emerald-500/10 to-teal-500/15 border border-green-500/20 p-6">
                <div className="absolute top-0 right-0 h-24 w-24 bg-green-500/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <p className="text-sm text-green-600/80 font-medium mb-2">Доступные средства</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-green-600">{user.balance.toLocaleString()}</p>
                    <p className="text-lg text-green-600/60">₽</p>
                  </div>
                  {hasPremium && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium +10%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 relative group">
                <button
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  disabled={user.balance < 1000}
                  className={cn(
                    "flex-1 h-11 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 relative overflow-hidden",
                    user.balance < 1000
                      ? "bg-muted/30 text-muted-foreground/60 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-md hover:shadow-green-500/20 active:scale-95"
                  )}
                >
                  {user.balance >= 1000 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-white/10 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  <div className="relative flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    Вывести средства
                  </div>
                </button>
                {user.balance < 1000 && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-muted/80 text-muted-foreground text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 backdrop-blur-sm border border-border/50">
                    Минимальная сумма вывода: 1000 ₽
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-muted/80"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative border-b border-border/50 bg-background/30">
            <div className="flex">
              <button
                onClick={() => setActiveTab('transactions')}
                className={cn(
                  "flex-1 py-4 px-4 text-sm font-medium transition-all border-b-2",
                  activeTab === 'transactions'
                    ? "text-green-600 border-green-500 bg-green-500/5"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-4 w-4" />
                  История операций
                </div>
              </button>
              <button
                onClick={() => setActiveTab('withdrawal')}
                className={cn(
                  "flex-1 py-4 px-4 text-sm font-medium transition-all border-b-2",
                  activeTab === 'withdrawal'
                    ? "text-green-600 border-green-500 bg-green-500/5"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Заявки на вывод
                </div>
              </button>
            </div>
          </div>

          <div className="relative overflow-y-auto max-h-[calc(90vh-320px)] p-6 space-y-3">
            {activeTab === 'transactions' && (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                      <p className="text-muted-foreground">Загрузка...</p>
                    </div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                      <Wallet className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Операций пока нет</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className={cn(
                      "group relative overflow-hidden rounded-xl border border-border/50 p-4 transition-all",
                      transaction.type === 'withdrawal_request'
                        ? "hover:border-red-500/30 hover:bg-red-500/5"
                        : "hover:border-green-500/30 hover:bg-green-500/5"
                    )}>
                      <div className={cn(
                        "absolute top-0 right-0 h-12 w-12 rounded-full blur-xl group-hover:opacity-100 opacity-0 transition-opacity",
                        transaction.type === 'withdrawal_request'
                          ? "bg-red-500/10"
                          : "bg-green-500/10"
                      )} />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(transaction)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.createdAt).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className={cn(
                            "font-bold whitespace-nowrap text-sm",
                            transaction.amount > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount} ₽
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'withdrawal' && (
              <div className="space-y-3">
                {withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                      <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Заявок на вывод пока нет</p>
                  </div>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className={cn(
                      "group relative overflow-hidden rounded-xl border border-border/50 p-4 transition-all",
                      withdrawal.status === 'rejected'
                        ? "hover:border-red-500/30 hover:bg-red-500/5"
                        : "hover:border-green-500/30 hover:bg-green-500/5"
                    )}>
                      <div className={cn(
                        "absolute top-0 right-0 h-12 w-12 rounded-full blur-xl group-hover:opacity-100 opacity-0 transition-opacity",
                        withdrawal.status === 'rejected'
                          ? "bg-red-500/10"
                          : "bg-green-500/10"
                      )} />
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                              {getWithdrawalStatusIcon(withdrawal.status)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{withdrawal.amount} ₽</span>
                              {withdrawal.premiumBonus && withdrawal.premiumBonus > 0 && (
                                <span className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                                  <Crown className="h-3 w-3" />
                                  +{withdrawal.premiumBonus} ₽ = {withdrawal.finalAmount} ₽
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {getStatusText(withdrawal.status)}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {getMethodIcon(withdrawal.method)}
                              <span className="whitespace-nowrap">{getMethodText(withdrawal.method)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {new Date(withdrawal.createdAt).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {withdrawal.rejectionReason && (
                          <p className={cn(
                            "text-xs mt-2",
                            withdrawal.status === 'rejected' ? "text-red-600" : withdrawal.status === 'completed' ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {withdrawal.status === 'rejected' ? '❌ ' : withdrawal.status === 'completed' ? '✓ ' : ''}
                            {withdrawal.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isWithdrawalModalOpen && (
        <Dialog open={isWithdrawalModalOpen} onOpenChange={setIsWithdrawalModalOpen}>
          <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 bg-gradient-to-b from-background to-background/95">
            
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

            <div className="relative border-b border-border/50 bg-background/60 backdrop-blur-2xl">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <ArrowUpRight className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Вывод средств</h3>
                    <p className="text-sm text-muted-foreground">Выберите способ и сумму</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {!hasContactMethod && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-in slide-in-from-top">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-700 mb-1">Требуется привязка контакта</p>
                      <p className="text-yellow-700/80">Привяжите Telegram или Discord в профиле для вывода</p>
                    </div>
                  </div>
                </div>
              )}

              {hasPremium && (
                <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Crown className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-700 mb-1">Premium бонус активен</p>
                      <p className="text-yellow-700/80">Получите +10% к выводу ({user.premiumTier})</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium mb-3 block">Сумма вывода</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="1000"
                    min="1000"
                    max={user.balance}
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full h-12 rounded-xl pl-4 pr-12 text-lg font-medium"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">₽</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Минимум: 1000 ₽ • Максимум: {user.balance} ₽
                </p>
                {currentWithdrawal && currentWithdrawal.baseAmount >= 1000 && hasPremium && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Базовая сумма:</span>
                        <span className="font-semibold">{currentWithdrawal.baseAmount} ₽</span>
                      </div>
                      <div className="flex items-center justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Premium бонус (+10%):
                        </span>
                        <span className="font-semibold">+{currentWithdrawal.premiumBonus} ₽</span>
                      </div>
                      <div className="flex items-center justify-between font-bold border-t border-green-500/20 pt-2 text-green-600">
                        <span>К выводу:</span>
                        <span>{currentWithdrawal.finalAmount} ₽</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Способ вывода</Label>
                <div className="space-y-2">
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl border-2 p-4 cursor-pointer transition-all",
                      withdrawalForm.method === 'crypto'
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-border/50 hover:border-green-500/30 hover:bg-green-500/5'
                    )}
                    onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'crypto' }))}
                  >
                    <div className="absolute top-0 right-0 h-12 w-12 bg-green-500/10 rounded-full blur-xl" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        withdrawalForm.method === 'crypto' ? 'border-green-500 bg-green-500' : 'border-border'
                      )}>
                        {withdrawalForm.method === 'crypto' && <div className="h-2 w-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Bitcoin className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-sm">Криптовалюта (USDT)</span>
                          <Badge className="bg-green-500/20 text-green-700 border-0 text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Быстро
                          </Badge>
                        </div>
                        <p className="text-xs text-green-600/80">💰 Без комиссии • 5-30 минут</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl border-2 p-4 cursor-pointer transition-all",
                      withdrawalForm.method === 'card'
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-border/50 hover:border-green-500/30 hover:bg-green-500/5'
                    )}
                    onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'card' }))}
                  >
                    <div className="relative z-10 flex items-start gap-3">
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        withdrawalForm.method === 'card' ? 'border-green-500 bg-green-500' : 'border-border'
                      )}>
                        {withdrawalForm.method === 'card' && <div className="h-2 w-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-semibold text-sm">Банковская карта</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Возможны задержки</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl border-2 p-4 cursor-pointer transition-all",
                      withdrawalForm.method === 'paypal'
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-border/50 hover:border-green-500/30 hover:bg-green-500/5'
                    )}
                    onClick={() => setWithdrawalForm(prev => ({ ...prev, method: 'paypal' }))}
                  >
                    <div className="relative z-10 flex items-start gap-3">
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        withdrawalForm.method === 'paypal' ? 'border-green-500 bg-green-500' : 'border-border'
                      )}>
                        {withdrawalForm.method === 'paypal' && <div className="h-2 w-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="h-4 w-4" />
                          <span className="font-semibold text-sm">PayPal</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Возможны задержки</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {withdrawalForm.method === 'card' && (
                <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Страна карты</Label>
                    <select
                      value={withdrawalForm.cardCountry}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, cardCountry: e.target.value }))}
                      className="w-full h-11 rounded-lg border border-border/50 bg-background px-3 text-sm"
                    >
                      <option value="RU">🇷🇺 Россия</option>
                      <option value="UA">🇺🇦 Украина</option>
                      <option value="EU">🇪🇺 Страны ЕС</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Номер карты</Label>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={withdrawalForm.cardNumber}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                      className={cn(
                        "font-mono h-11",
                        withdrawalForm.cardNumber && !isValidCardNumber(withdrawalForm.cardNumber) && "border-red-500"
                      )}
                    />
                    {withdrawalForm.cardNumber && !isValidCardNumber(withdrawalForm.cardNumber) && (
                      <p className="text-xs text-red-500 mt-1">Введите 16 цифр</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Имя держателя</Label>
                    <Input
                      placeholder="IVAN PETROV"
                      value={withdrawalForm.cardHolder}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
                      className="h-11"
                    />
                  </div>
                </div>
              )}

              {withdrawalForm.method === 'crypto' && (
                <div className="space-y-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Bitcoin className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-700 mb-1">Tether USD (USDT TRC20)</p>
                      <p className="text-green-700/80">Обработка: 5-30 минут. Проверьте адрес дважды!</p>
                    </div>
                  </div>
                  <Input
                    placeholder="TRX7n2uyWwaTEtbWDCojkH2ZTCkd (пример)"
                    value={withdrawalForm.walletAddress}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                    className="h-11 font-mono text-xs"
                  />
                </div>
              )}

              {withdrawalForm.method === 'paypal' && (
                <div className="space-y-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Label className="text-sm font-medium">Email PayPal</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={withdrawalForm.email}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, email: e.target.value }))}
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleWithdrawalSubmit}
                  disabled={
                    !hasContactMethod ||
                    !withdrawalForm.amount ||
                    !withdrawalForm.method ||
                    isSubmittingWithdrawal ||
                    parseInt(withdrawalForm.amount || '0') < 1000 ||
                    parseInt(withdrawalForm.amount || '0') > user.balance ||
                    (withdrawalForm.method === 'card' && !isValidCardNumber(withdrawalForm.cardNumber))
                  }
                  className={cn(
                    "w-full h-12 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 relative group overflow-hidden",
                    !hasContactMethod ||
                    !withdrawalForm.amount ||
                    !withdrawalForm.method ||
                    isSubmittingWithdrawal ||
                    parseInt(withdrawalForm.amount || '0') < 1000 ||
                    parseInt(withdrawalForm.amount || '0') > user.balance ||
                    (withdrawalForm.method === 'card' && !isValidCardNumber(withdrawalForm.cardNumber))
                      ? "bg-muted/30 text-muted-foreground/60 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-md hover:shadow-green-500/20 active:scale-95"
                  )}
                >
                  {!(
                    !hasContactMethod ||
                    !withdrawalForm.amount ||
                    !withdrawalForm.method ||
                    isSubmittingWithdrawal ||
                    parseInt(withdrawalForm.amount || '0') < 1000 ||
                    parseInt(withdrawalForm.amount || '0') > user.balance ||
                    (withdrawalForm.method === 'card' && !isValidCardNumber(withdrawalForm.cardNumber))
                  ) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-white/10 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  <div className="relative flex items-center gap-2">
                    {isSubmittingWithdrawal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4" />
                        Создать заявку на вывод
                      </>
                    )}
                  </div>
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Заявка будет рассмотрена в течение 24 часов
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />
    </>
  );
}