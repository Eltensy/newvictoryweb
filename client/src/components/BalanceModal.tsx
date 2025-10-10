import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  MessageSquare,
  AlertTriangle,
  Info,
  Zap,
  Crown
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

interface NotificationProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

function NotificationModal({ isOpen, type, title, message, onClose }: NotificationProps) {
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
    <div className="fixed bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
      <div className={cn("bg-card rounded-2xl border shadow-2xl max-w-md w-full", getBorderColor())}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            {getIcon()}
            <div className="flex-1">
              <h3 className="text-lg font-semibold font-gaming mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="font-gaming">
              Понятно
            </Button>
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

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({ isOpen: true, type, title, message });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    method: 'crypto' as 'card' | 'crypto' | 'paypal' | '',
    telegramUsername: '',
    cardNumber: '',
    cardHolder: '',
    cardCountry: 'RU',
    walletAddress: '',
    currency: 'USDT',
    email: ''
  });
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const hasContactMethod = user.telegramUsername || user.discordUsername;

  // Fixed premium check - check if user has ANY premium tier (not 'none')
  const hasPremium = user.premiumTier && user.premiumTier !== 'none';

  // Calculate withdrawal amount with premium bonus
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      }
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCardNumber(e.target.value);
    setWithdrawalForm(prev => ({ ...prev, cardNumber: formattedValue }));
  };

  const handleWithdrawalSubmit = async () => {
    if (!hasContactMethod) {
      showNotification(
        'warning', 
        'Требуется привязка контакта', 
        'Для вывода средств необходимо привязать Telegram или Discord аккаунт в настройках профиля'
      );
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
          telegramUsername: '',
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
    switch (status) {
      case 'pending':
        return 'Ожидание';
      case 'processing':
        return 'Обработка';
      case 'completed':
        return 'Выполнено';
      case 'rejected':
        return 'Отклонено';
      default:
        return status;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'card':
        return 'Банковская карта';
      case 'crypto':
        return 'Криптовалюта';
      case 'paypal':
        return 'PayPal';
      default:
        return method;
    }
  };

  if (!isOpen) return null;

  // Calculate final withdrawal amount for display
  const currentWithdrawal = withdrawalForm.amount ? calculateWithdrawal(parseInt(withdrawalForm.amount)) : null;

  return (
    <>
      {/* Main Balance Modal */}
      <div className="fixed bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', pointerEvents: 'all' }}>
        <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold font-gaming">Баланс</h2>
                  {hasPremium && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-3xl font-bold text-primary">{user.balance} ₽</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Button
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  className="font-gaming"
                  disabled={user.balance < 1000}
                >
                  Вывести
                </Button>
                {user.balance < 1000 && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    Минимальная сумма вывода: 1000 ₽
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-muted rounded-full w-8 h-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('transactions')}
              className={cn(
                "flex-1 py-3 px-4 text-sm font-medium transition-colors",
                activeTab === 'transactions' 
                  ? "text-primary border-b-2 border-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              История операций
            </button>
            <button
              onClick={() => setActiveTab('withdrawal')}
              className={cn(
                "flex-1 py-3 px-4 text-sm font-medium transition-colors",
                activeTab === 'withdrawal' 
                  ? "text-primary border-b-2 border-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Заявки на вывод
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'transactions' && (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Загрузка...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Операций пока нет</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getTransactionIcon(transaction)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
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
                          "font-bold whitespace-nowrap",
                          transaction.amount > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} ₽
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'withdrawal' && (
              <div className="space-y-3">
                {withdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <ArrowUpRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Заявок на вывод пока нет</p>
                  </div>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getWithdrawalStatusIcon(withdrawal.status)}
                          <div className="flex flex-col">
                            <span className="font-medium whitespace-nowrap">{withdrawal.amount} ₽</span>
                            {withdrawal.premiumBonus && withdrawal.premiumBonus > 0 && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                +{withdrawal.premiumBonus} ₽ (Premium) = {withdrawal.finalAmount} ₽
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {getStatusText(withdrawal.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0 ml-3">
                          {getMethodIcon(withdrawal.method)}
                          <span className="whitespace-nowrap">{getMethodText(withdrawal.method)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(withdrawal.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {withdrawal.rejectionReason && (
                        <>
                          {withdrawal.status === 'rejected' ? (
                            <p className="text-sm text-red-600 mt-2">
                              Причина отклонения: {withdrawal.rejectionReason}
                            </p>
                          ) : withdrawal.status === 'completed' ? (
                            <p className="text-sm text-green-600 mt-2">
                              Вывод проведен: {withdrawal.rejectionReason}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-2">
                              Примечание: {withdrawal.rejectionReason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawalModalOpen && (
        <div className="fixed bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-gaming">Вывод средств</h3>
                {hasPremium && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                    <Crown className="h-3 w-3 mr-1" />
                    +10%
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWithdrawalModalOpen(false)}
                className="hover:bg-muted rounded-full w-8 h-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Warning */}
              {!hasContactMethod && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-600 mb-1">Требуется привязка контакта</p>
                      <p className="text-yellow-600/80">
                        Для вывода средств необходимо привязать Telegram или Discord в настройках профиля
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Premium Bonus Info */}
              {hasPremium && (
                <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Crown className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-600 mb-1">Premium бонус активен!</p>
                      <p className="text-yellow-600/80">
                        Вы получаете +10% к сумме вывода благодаря Premium статусу ({user.premiumTier})
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance Info */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Доступно для вывода</p>
                  <p className="text-2xl font-bold text-primary">{user.balance} ₽</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Минимальная сумма вывода: 1000 ₽
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Сумма вывода</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  min="1000"
                  max={user.balance}
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  От 1000 до {user.balance} ₽
                </p>
                {currentWithdrawal && currentWithdrawal.baseAmount >= 1000 && hasPremium && (
                  <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span>Базовая сумма:</span>
                      <span className="font-medium">{currentWithdrawal.baseAmount} ₽</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Premium бонус (+10%):
                      </span>
                      <span className="font-medium">+{currentWithdrawal.premiumBonus} ₽</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold border-t border-green-500/20 mt-2 pt-2">
                      <span>Итого к выводу:</span>
                      <span className="text-green-600">{currentWithdrawal.finalAmount} ₽</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Method */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Способ вывода</Label>
                <RadioGroup 
                  value={withdrawalForm.method} 
                  onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, method: value as any }))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 border-2 border-green-500/30 rounded-lg hover:bg-green-500/5 bg-green-500/5">
                    <RadioGroupItem value="crypto" id="crypto" />
                    <label htmlFor="crypto" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Bitcoin className="h-5 w-5 text-green-500" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Криптовалюта (USDT)</span>
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Быстро
                          </Badge>
                        </div>
                        <div className="text-xs text-green-600 font-medium mt-0.5">
                          💰 Без комиссии
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30">
                    <RadioGroupItem value="card" id="card" />
                    <label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="h-4 w-4" />
                      <div>
                        <div>Банковская карта</div>
                        <div className="text-xs text-muted-foreground">Возможны задержки</div>
                      </div>
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Mail className="h-4 w-4" />
                      <div>
                        <div>PayPal</div>
                        <div className="text-xs text-muted-foreground">Возможны задержки</div>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Method-specific fields */}

              {withdrawalForm.method === 'card' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Страна карты</Label>
                    <Select
                      value={withdrawalForm.cardCountry}
                      onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, cardCountry: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[120]">
                        <SelectItem value="RU">Россия</SelectItem>
                        <SelectItem value="UA">Украина</SelectItem>
                        <SelectItem value="EU">Страны ЕС</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Номер карты</Label>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={withdrawalForm.cardNumber}
                      onChange={handleCardNumberChange}
                      className={cn(
                        "font-mono",
                        withdrawalForm.cardNumber && !isValidCardNumber(withdrawalForm.cardNumber) && "border-red-500"
                      )}
                    />
                    {withdrawalForm.cardNumber && !isValidCardNumber(withdrawalForm.cardNumber) && (
                      <p className="text-xs text-red-500 mt-1">
                        Введите 16 цифр номера карты
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Имя держателя</Label>
                    <Input
                      placeholder="IVAN PETROV"
                      value={withdrawalForm.cardHolder}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
              )}

              {withdrawalForm.method === 'crypto' && (
                <div className="space-y-4">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-start gap-3">
                      <Bitcoin className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-600 mb-1">Tether USD (USDT TRC20)</p>
                        <p className="text-green-600/80">
                          Вывод осуществляется только в USDT через сеть TRC20. Обработка занимает от 5 до 30 минут.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">USDT TRC20 адрес кошелька</Label>
                    <Input
                      placeholder="TRX7n2uyWwaTEtbWDCojkH2ZTCkd (пример)"
                      value={withdrawalForm.walletAddress}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Проверьте правильность USDT TRC20 адреса. Неверный адрес может привести к потере средств.
                    </p>
                  </div>
                </div>
              )}

              {withdrawalForm.method === 'paypal' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Email PayPal</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={withdrawalForm.email}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              )}

              {/* Submit */}
              <Button
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
                className="w-full font-gaming"
                size="lg"
              >
                {isSubmittingWithdrawal ? 'Создание заявки...' : 'Создать заявку на вывод'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Заявка будет рассмотрена в течение 24 часов. После создания заявки средства будут заморожены на вашем балансе.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
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