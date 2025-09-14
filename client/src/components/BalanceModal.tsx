import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Trophy,
  Wallet
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
  method: 'card' | 'crypto' | 'paypal' | 'qiwi';
  methodData: any;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
}

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  getAuthToken: () => string | null;
  onRefreshUser: () => Promise<void>;
}

export default function BalanceModal({ isOpen, onClose, user, getAuthToken, onRefreshUser }: BalanceModalProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawal'>('transactions');
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    method: '' as 'card' | 'crypto' | 'paypal' | 'qiwi' | '',
    cardNumber: '',
    cardHolder: '',
    walletAddress: '',
    currency: 'BTC',
    email: '',
    phone: ''
  });
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  // Load data when modal opens
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

  const handleWithdrawalSubmit = async () => {
    if (!withdrawalForm.amount || !withdrawalForm.method) return;

    const amount = parseInt(withdrawalForm.amount);
    if (amount < 100) {
      alert('Минимальная сумма вывода 100 рублей');
      return;
    }

    if (amount > user.balance) {
      alert('Недостаточно средств на балансе');
      return;
    }

    setIsSubmittingWithdrawal(true);
    
    try {
      const token = getAuthToken();
      if (!token) return;

      let methodData = {};
      
      switch (withdrawalForm.method) {
        case 'card':
          if (!withdrawalForm.cardNumber || !withdrawalForm.cardHolder) {
            alert('Заполните все поля для банковской карты');
            return;
          }
          methodData = {
            cardNumber: withdrawalForm.cardNumber,
            cardHolder: withdrawalForm.cardHolder
          };
          break;
        case 'crypto':
          if (!withdrawalForm.walletAddress) {
            alert('Укажите адрес кошелька');
            return;
          }
          methodData = {
            walletAddress: withdrawalForm.walletAddress,
            currency: withdrawalForm.currency
          };
          break;
        case 'paypal':
          if (!withdrawalForm.email) {
            alert('Укажите email PayPal');
            return;
          }
          methodData = {
            email: withdrawalForm.email
          };
          break;
        case 'qiwi':
          if (!withdrawalForm.phone) {
            alert('Укажите номер телефона QIWI');
            return;
          }
          methodData = {
            phone: withdrawalForm.phone
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
        alert('Заявка на вывод создана успешно');
        setIsWithdrawalModalOpen(false);
        setWithdrawalForm({
          amount: '',
          method: '',
          cardNumber: '',
          cardHolder: '',
          walletAddress: '',
          currency: 'BTC',
          email: '',
          phone: ''
        });
        
        // Refresh data
        await Promise.all([
          loadTransactions(),
          loadWithdrawals(),
          onRefreshUser()
        ]);
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Произошла ошибка при создании заявки');
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
      case 'qiwi':
        return <Smartphone className="h-4 w-4" />;
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
      case 'qiwi':
        return 'QIWI';
      default:
        return method;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Balance Modal */}
      <div className="fixed bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
        <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold font-gaming">Баланс</h2>
                <p className="text-3xl font-bold text-primary">{user.balance} ₽</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsWithdrawalModalOpen(true)}
                className="font-gaming"
                disabled={user.balance < 100}
              >
                Вывести
              </Button>
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
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
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
                      <div className="text-right">
                        <p className={cn(
                          "font-bold",
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
                        <div className="flex items-center gap-2">
                          {getWithdrawalStatusIcon(withdrawal.status)}
                          <span className="font-medium">{withdrawal.amount} ₽</span>
                          <Badge variant="secondary" className="text-xs">
                            {getStatusText(withdrawal.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getMethodIcon(withdrawal.method)}
                          {getMethodText(withdrawal.method)}
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
                        <p className="text-sm text-red-600 mt-2">
                          Причина отклонения: {withdrawal.rejectionReason}
                        </p>
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
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold font-gaming">Вывод средств</h3>
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
              {/* Balance Info */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Доступно для вывода</p>
                  <p className="text-2xl font-bold text-primary">{user.balance} ₽</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Минимальная сумма вывода: 100 ₽
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Сумма вывода</Label>
                <Input
                  type="number"
                  placeholder="100"
                  min="100"
                  max={user.balance}
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  От 100 до {user.balance} ₽
                </p>
              </div>

              {/* Method */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Способ вывода</Label>
                <RadioGroup 
                  value={withdrawalForm.method} 
                  onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, method: value as any }))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30">
                    <RadioGroupItem value="card" id="card" />
                    <label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="h-4 w-4" />
                      Банковская карта
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30">
                    <RadioGroupItem value="crypto" id="crypto" />
                    <label htmlFor="crypto" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Bitcoin className="h-4 w-4" />
                      Криптовалюта
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Mail className="h-4 w-4" />
                      PayPal
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30">
                    <RadioGroupItem value="qiwi" id="qiwi" />
                    <label htmlFor="qiwi" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Smartphone className="h-4 w-4" />
                      QIWI
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Method-specific fields */}
              {withdrawalForm.method === 'card' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Номер карты</Label>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={withdrawalForm.cardNumber}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Имя держателя</Label>
                    <Input
                      placeholder="IVAN PETROV"
                      value={withdrawalForm.cardHolder}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, cardHolder: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {withdrawalForm.method === 'crypto' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Валюта</Label>
                    <Select
                      value={withdrawalForm.currency}
                      onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        <SelectItem value="USDT">Tether (USDT)</SelectItem>
                        <SelectItem value="LTC">Litecoin (LTC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Адрес кошелька</Label>
                    <Input
                      placeholder="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
                      value={withdrawalForm.walletAddress}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                    />
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

              {withdrawalForm.method === 'qiwi' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Номер телефона QIWI</Label>
                  <Input
                    placeholder="+7 900 123-45-67"
                    value={withdrawalForm.phone}
                    onChange={(e) => setWithdrawalForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleWithdrawalSubmit}
                disabled={
                  !withdrawalForm.amount || 
                  !withdrawalForm.method || 
                  isSubmittingWithdrawal ||
                  parseInt(withdrawalForm.amount || '0') < 100 ||
                  parseInt(withdrawalForm.amount || '0') > user.balance
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
    </>
  );
}